import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SupportPackageReportPanel } from "./SupportPackageReportPanel";

const api = vi.hoisted(() => ({
	fetchPackageChecks: vi.fn(),
	fetchPdf: vi.fn(),
	downloadSupportPdf: vi.fn(),
	openTask: vi.fn(),
	notify: vi.fn(),
}));
vi.mock("./supportAnalyst.api", async (importOriginal) => ({
	...(await importOriginal<typeof import("./supportAnalyst.api")>()),
	fetchPackageChecks: api.fetchPackageChecks,
	downloadSupportPdf: api.downloadSupportPdf,
}));
vi.mock("./clientHoursPackages.api", () => ({
	fetchSupportHoursPackageReport: api.fetchPdf,
}));
vi.mock("@/shared/hooks/useBitrixSlider", () => ({
	useBitrixSlider: () => ({ openTask: api.openTask }),
}));
vi.mock("@/shared/ui/NotificationPopup/notify", () => ({ notify: api.notify }));

const deferred = <T,>() => {
	let resolve!: (value: T) => void;
	let reject!: (reason: unknown) => void;
	const promise = new Promise<T>((resolvePromise, rejectPromise) => {
		resolve = resolvePromise;
		reject = rejectPromise;
	});
	return { promise, resolve, reject };
};
const noIssues = {
	checkedAt: "2026-10-01T10:00:00Z",
	blocking: false,
	issues: [],
};
const warning = {
	checkedAt: "2026-10-01T10:00:00Z",
	blocking: false,
	issues: [
		{
			code: "limit_exceeded",
			severity: "warning",
			message: "Проверьте часы задачи",
			entityTypeId: 1072,
			itemId: 11,
		},
	],
};
const props = { packageId: 7, purchaseDate: "2026-09-01", hasPackages: true };
const openPeriod = () =>
	fireEvent.click(screen.getByRole("button", { name: "За период" }));
const choosePeriod = (dateFrom = "2026-09-10", dateTo = "2026-09-20") => {
	fireEvent.change(screen.getByLabelText("С даты"), {
		target: { value: dateFrom },
	});
	fireEvent.change(screen.getByLabelText("По дату"), {
		target: { value: dateTo },
	});
};

beforeEach(() => {
	vi.clearAllMocks();
	vi.setSystemTime(new Date("2026-10-01T12:00:00Z"));
	api.fetchPackageChecks.mockResolvedValue(noIssues);
	api.fetchPdf.mockResolvedValue(
		new Blob(["PDF"], { type: "application/pdf" }),
	);
});
afterEach(() => vi.useRealTimers());

describe("package PDF and optional period", () => {
	it("keeps the whole package action and shows native date controls only when expanded", () => {
		render(<SupportPackageReportPanel {...props} />);
		expect(
			screen.getByRole("button", { name: "Отчёт по пакету" }),
		).toBeEnabled();
		expect(screen.queryByLabelText("С даты")).not.toBeInTheDocument();
		expect(screen.getByRole("button", { name: "За период" })).toHaveAttribute(
			"aria-expanded",
			"false",
		);
		openPeriod();
		expect(screen.getByLabelText("С даты")).toHaveAttribute("type", "date");
		expect(screen.getByLabelText("С даты")).toHaveValue("2026-09-01");
		expect(screen.getByLabelText("По дату")).toHaveValue("2026-10-01");
		expect(screen.getByText(/Задачи с работами за эти даты/)).toHaveTextContent(
			"включая работы вне периода. Отдельные работы — только за период.",
		);
		expect(screen.getByRole("button", { name: "За период" })).toHaveAttribute(
			"aria-expanded",
			"true",
		);
	});
	it("requires a selected package for both export actions", () => {
		render(<SupportPackageReportPanel {...props} packageId={null} />);
		expect(
			screen.getByRole("button", { name: "Отчёт по пакету" }),
		).toBeDisabled();
		expect(screen.getByRole("button", { name: "За период" })).toBeDisabled();
		expect(api.fetchPackageChecks).not.toHaveBeenCalled();
	});
	it("passes dates to the selected package endpoint and uses a distinct period filename", async () => {
		render(<SupportPackageReportPanel {...props} />);
		openPeriod();
		choosePeriod();
		fireEvent.click(screen.getByRole("button", { name: "Скачать за период" }));
		await waitFor(() => expect(api.downloadSupportPdf).toHaveBeenCalled());
		expect(api.fetchPackageChecks).toHaveBeenCalledExactlyOnceWith(7);
		expect(api.fetchPdf).toHaveBeenCalledExactlyOnceWith(7, {
			dateFrom: "2026-09-10",
			dateTo: "2026-09-20",
		});
		expect(api.downloadSupportPdf).toHaveBeenCalledExactlyOnceWith(
			expect.any(Blob),
			"support-package-7-2026-09-10-2026-09-20.pdf",
		);
	});
	it.each([
		["", "2026-09-20", "Укажите обе даты периода."],
		[
			"2026-09-21",
			"2026-09-20",
			"Начало периода не может быть позже окончания.",
		],
		[
			"2026-09-10",
			"2026-10-02",
			"Период не может быть позже сегодняшнего дня.",
		],
	])("rejects invalid input %s — %s without requesting data", async (from, to, message) => {
		render(<SupportPackageReportPanel {...props} />);
		openPeriod();
		choosePeriod(from, to);
		fireEvent.click(screen.getByRole("button", { name: "Скачать за период" }));
		expect(await screen.findByRole("alert")).toHaveTextContent(message);
		expect(api.fetchPackageChecks).not.toHaveBeenCalled();
		expect(api.fetchPdf).not.toHaveBeenCalled();
		fireEvent.click(screen.getByRole("button", { name: "Отчёт по пакету" }));
		await waitFor(() =>
			expect(api.fetchPdf).toHaveBeenCalledExactlyOnceWith(7),
		);
	});
	it("confirms the same period and clears confirmation when dates change", async () => {
		api.fetchPackageChecks.mockResolvedValue(warning);
		render(<SupportPackageReportPanel {...props} />);
		openPeriod();
		choosePeriod();
		fireEvent.click(screen.getByRole("button", { name: "Скачать за период" }));
		await screen.findByRole("button", {
			name: "Скачать за период с этими данными",
		});
		choosePeriod("2026-09-11", "2026-09-20");
		expect(
			screen.queryByRole("button", {
				name: "Скачать за период с этими данными",
			}),
		).not.toBeInTheDocument();
		expect(screen.queryByText("Проверьте часы задачи")).not.toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Скачать за период" }));
		fireEvent.click(
			await screen.findByRole("button", {
				name: "Скачать за период с этими данными",
			}),
		);
		await waitFor(() =>
			expect(api.fetchPdf).toHaveBeenCalledExactlyOnceWith(7, {
				dateFrom: "2026-09-11",
				dateTo: "2026-09-20",
			}),
		);
		expect(api.fetchPackageChecks).toHaveBeenCalledTimes(3);
	});
	it("blocks period export when checks report a blocking issue", async () => {
		api.fetchPackageChecks.mockResolvedValue({ ...warning, blocking: true });
		render(<SupportPackageReportPanel {...props} />);
		openPeriod();
		fireEvent.click(screen.getByRole("button", { name: "Скачать за период" }));
		await screen.findByText("Проверьте часы задачи");
		expect(api.fetchPdf).not.toHaveBeenCalled();
		expect(
			screen.queryByRole("button", {
				name: "Скачать за период с этими данными",
			}),
		).not.toBeInTheDocument();
	});
	it("does not download an old package's PDF after switching packages", async () => {
		const pdf = deferred<Blob>();
		api.fetchPdf.mockReturnValueOnce(pdf.promise);
		const view = render(<SupportPackageReportPanel {...props} />);
		fireEvent.click(screen.getByRole("button", { name: "Отчёт по пакету" }));
		await waitFor(() => expect(api.fetchPdf).toHaveBeenCalledWith(7));
		view.rerender(
			<SupportPackageReportPanel
				{...props}
				packageId={8}
				purchaseDate="2026-09-15"
			/>,
		);
		await act(async () => pdf.resolve(new Blob(["old package"])));
		expect(api.downloadSupportPdf).not.toHaveBeenCalled();
		openPeriod();
		expect(screen.getByLabelText("С даты")).toHaveValue("2026-09-15");
	});
	it("ignores an old period's checks after changing a date", async () => {
		const checks = deferred<typeof warning>();
		api.fetchPackageChecks.mockReturnValueOnce(checks.promise);
		render(<SupportPackageReportPanel {...props} />);
		openPeriod();
		choosePeriod();
		fireEvent.click(screen.getByRole("button", { name: "Скачать за период" }));
		choosePeriod("2026-09-11", "2026-09-20");
		await act(async () => checks.resolve(warning));
		expect(screen.queryByText("Проверьте часы задачи")).not.toBeInTheDocument();
		expect(api.fetchPdf).not.toHaveBeenCalled();
	});
	it("ignores an old period's PDF after changing a date and prevents duplicate requests", async () => {
		const pdf = deferred<Blob>();
		api.fetchPdf.mockReturnValueOnce(pdf.promise);
		render(<SupportPackageReportPanel {...props} />);
		openPeriod();
		choosePeriod();
		fireEvent.click(screen.getByRole("button", { name: "Скачать за период" }));
		fireEvent.submit(screen.getByRole("form", { name: "Отчёт за период" }));
		await waitFor(() => expect(api.fetchPdf).toHaveBeenCalledTimes(1));
		expect(
			screen.getByRole("button", { name: "Отчёт по пакету" }),
		).toBeDisabled();
		choosePeriod("2026-09-11", "2026-09-20");
		await act(async () => pdf.resolve(new Blob(["old period"])));
		expect(api.downloadSupportPdf).not.toHaveBeenCalled();
		expect(
			screen.getByRole("button", { name: "Скачать за период" }),
		).toBeEnabled();
	});
	it("invalidates a pending PDF when underlying package data is refreshed", async () => {
		const pdf = deferred<Blob>();
		api.fetchPdf.mockReturnValueOnce(pdf.promise);
		const view = render(
			<SupportPackageReportPanel {...props} refreshKey={1} />,
		);
		fireEvent.click(screen.getByRole("button", { name: "Отчёт по пакету" }));
		await waitFor(() => expect(api.fetchPdf).toHaveBeenCalledTimes(1));
		view.rerender(<SupportPackageReportPanel {...props} refreshKey={2} />);
		await act(async () => pdf.resolve(new Blob(["old data"])));
		expect(api.downloadSupportPdf).not.toHaveBeenCalled();
	});
	it("shows a period generation failure and allows another attempt", async () => {
		api.fetchPdf.mockRejectedValueOnce(new Error("generation failed"));
		render(<SupportPackageReportPanel {...props} />);
		openPeriod();
		fireEvent.click(screen.getByRole("button", { name: "Скачать за период" }));
		await waitFor(() =>
			expect(api.notify).toHaveBeenCalledWith({
				message: "Не удалось сформировать отчёт за период. Повторите попытку.",
				type: "error",
			}),
		);
		expect(
			screen.getByRole("button", { name: "Скачать за период" }),
		).toBeEnabled();
		expect(api.downloadSupportPdf).not.toHaveBeenCalled();
	});
	it("does not surface a stale request's error or download after unmount", async () => {
		const pdf = deferred<Blob>();
		api.fetchPdf.mockReturnValueOnce(pdf.promise);
		const view = render(<SupportPackageReportPanel {...props} />);
		fireEvent.click(screen.getByRole("button", { name: "Отчёт по пакету" }));
		await waitFor(() => expect(api.fetchPdf).toHaveBeenCalledTimes(1));
		view.unmount();
		await act(async () => pdf.reject(new Error("old request")));
		expect(api.downloadSupportPdf).not.toHaveBeenCalled();
		expect(api.notify).not.toHaveBeenCalled();
	});
});
