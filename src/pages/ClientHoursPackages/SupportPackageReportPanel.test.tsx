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
	vi.resetAllMocks();
	vi.setSystemTime(new Date("2026-10-01T12:00:00Z"));
	api.fetchPackageChecks.mockRejectedValue(new Error("Package checks must not run during client export"));
	api.fetchPdf.mockResolvedValue(
		new Blob(["PDF"], { type: "application/pdf" }),
	);
});
afterEach(() => vi.useRealTimers());

describe("client cabinet PDF and optional period", () => {
	it("keeps the current client report action and shows native date controls only when expanded", () => {
		render(<SupportPackageReportPanel {...props} />);
		expect(
			screen.getByRole("button", { name: "Скачать отчёт" }),
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
			"включая работы вне периода. Обе даты включены.",
		);
		expect(screen.getByRole("button", { name: "За период" })).toHaveAttribute(
			"aria-expanded",
			"true",
		);
	});
	it("requires a selected package for both export actions", () => {
		render(<SupportPackageReportPanel {...props} packageId={null} />);
		expect(
			screen.getByRole("button", { name: "Скачать отчёт" }),
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
		expect(api.fetchPackageChecks).not.toHaveBeenCalled();
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
		fireEvent.click(screen.getByRole("button", { name: "Скачать отчёт" }));
		await waitFor(() =>
			expect(api.fetchPdf).toHaveBeenCalledExactlyOnceWith(7),
		);
	});
	it("downloads the current cabinet PDF directly without package checks or confirmation", async () => {
		render(<SupportPackageReportPanel {...props} />);
		fireEvent.click(screen.getByRole("button", { name: "Скачать отчёт" }));
		await waitFor(() => expect(api.downloadSupportPdf).toHaveBeenCalledExactlyOnceWith(
			expect.any(Blob), "support-package-7.pdf",
		));
		expect(api.fetchPdf).toHaveBeenCalledExactlyOnceWith(7);
		expect(api.fetchPackageChecks).not.toHaveBeenCalled();
		expect(screen.queryByText(/Нужно проверить|Проверка пройдена/)).not.toBeInTheDocument();
		expect(screen.queryByRole("button", { name: /Скачать с этими данными/ })).not.toBeInTheDocument();
	});
	it("shows canonical backend validation errors and allows retry without a partial download", async () => {
		api.fetchPdf.mockRejectedValueOnce({
			response: { data: { message: "У отчёта указаны разные задачи. Исправьте связь в Битрикс24 перед выгрузкой" } },
		});
		render(<SupportPackageReportPanel {...props} />);
		openPeriod();
		fireEvent.click(screen.getByRole("button", { name: "Скачать за период" }));
		await waitFor(() => expect(api.notify).toHaveBeenCalledWith({
			message: "У отчёта указаны разные задачи. Исправьте связь в Битрикс24 перед выгрузкой",
			type: "error",
		}));
		expect(api.fetchPackageChecks).not.toHaveBeenCalled();
		expect(api.downloadSupportPdf).not.toHaveBeenCalled();
		expect(screen.getByRole("button", { name: "Скачать за период" })).toBeEnabled();
		fireEvent.click(screen.getByRole("button", { name: "Скачать за период" }));
		await waitFor(() => expect(api.downloadSupportPdf).toHaveBeenCalledTimes(1));
		expect(api.fetchPdf).toHaveBeenCalledTimes(2);
	});
	it("does not download an old package's PDF after switching packages", async () => {
		const pdf = deferred<Blob>();
		api.fetchPdf.mockReturnValueOnce(pdf.promise);
		const view = render(<SupportPackageReportPanel {...props} />);
		fireEvent.click(screen.getByRole("button", { name: "Скачать отчёт" }));
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
	it("ignores a stale period's failure after changing a date", async () => {
		const pdf = deferred<Blob>();
		api.fetchPdf.mockReturnValueOnce(pdf.promise);
		render(<SupportPackageReportPanel {...props} />);
		openPeriod();
		choosePeriod();
		fireEvent.click(screen.getByRole("button", { name: "Скачать за период" }));
		choosePeriod("2026-09-11", "2026-09-20");
		await act(async () => pdf.reject(new Error("Old period unavailable")));
		expect(api.notify).not.toHaveBeenCalled();
		expect(api.downloadSupportPdf).not.toHaveBeenCalled();
		expect(screen.getByRole("button", { name: "Скачать за период" })).toBeEnabled();
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
			screen.getByRole("button", { name: "Скачать отчёт" }),
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
		fireEvent.click(screen.getByRole("button", { name: "Скачать отчёт" }));
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
		fireEvent.click(screen.getByRole("button", { name: "Скачать отчёт" }));
		await waitFor(() => expect(api.fetchPdf).toHaveBeenCalledTimes(1));
		view.unmount();
		await act(async () => pdf.reject(new Error("old request")));
		expect(api.downloadSupportPdf).not.toHaveBeenCalled();
		expect(api.notify).not.toHaveBeenCalled();
	});
});
