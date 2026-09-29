import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EntityTypeIds } from "@/shared/constants/const";
import type {
	ClientPackage,
	PackageConsumption,
	PackagePurchase,
} from "./clientHoursPackages.types";
import { SupportProjectDetails } from "./SupportProjectDetails";
import {
	collectSupportEntries,
	collectSupportReports,
	matchesSupportEntry,
} from "./supportReportEntries";

const { openTask, fetchSupportHoursPackageReport, notify } = vi.hoisted(() => ({
	openTask: vi.fn(),
	fetchSupportHoursPackageReport: vi.fn(),
	notify: vi.fn(),
}));
vi.mock("./clientHoursPackages.api", () => ({
	fetchSupportHoursPackageReport,
}));
vi.mock("./supportAnalyst.api", async (importOriginal) => ({
	...(await importOriginal<typeof import("./supportAnalyst.api")>()),
	fetchPackageChecks: vi.fn().mockResolvedValue({
		checkedAt: "2026-09-29T10:00:00Z",
		blocking: false,
		issues: [],
	}),
}));
vi.mock("@/shared/ui/NotificationPopup/notify", () => ({ notify }));
vi.mock("@/shared/hooks/useBitrixSlider", () => ({
	useBitrixSlider: () => ({ openTask }),
}));

const consumption = (
	id: number,
	hours: number,
	taskId: string | null,
	description: string,
): PackageConsumption => ({
	id,
	hours,
	report: {
		bitrixReportId: String(id),
		bitrixTaskId: taskId,
		taskTitle: taskId ? "Старое название задачи" : null,
		bitrixResponsibleId: "10",
		responsibleName: "Анна Тестовая",
		bitrixCompanyId: "20",
		companyName: "Клиент",
		projectTitle: "Техподдержка",
		bitrixActivityId: "269",
		activityTitle: "Development",
		reportDate: `2026-09-${String(id).padStart(2, "0")}T12:00:00+03:00`,
		reportTitle: `Отчёт ${id}`,
		reportDescription: description,
	},
});
const splitReport = consumption(
	1,
	2,
	"100",
	"Восстановлено соединение с сервером",
);
const purchase = (
	id: number,
	consumptions: PackageConsumption[],
): PackagePurchase => ({
	id,
	date: `2026-09-${String(id).padStart(2, "0")}`,
	hours: 10,
	remaining: 5,
	state: "Активный",
	amount: null,
	comment: null,
	consumptions,
});
const purchases = [
	purchase(1, [
		splitReport,
		consumption(2, 1, null, "Проверена почта"),
		consumption(3, 3, "101", "Обновлён справочник"),
	]),
	purchase(2, [{ ...splitReport, id: 4, hours: 4 }]),
];
const tasks = [
	{ id: "100", title: "Настройка соединения", stageId: "NEW" },
	{ id: "101", title: "Работы по справочнику", stageId: "DT1072_18:UC_6JNSDG" },
	{ id: "102", title: "Задача без отчётов", stageId: "NEW" },
];
const projectPackages: ClientPackage = {
	id: 1,
	client: "Клиент",
	lastCharge: "03.09",
	remainingHours: 10,
	state: "active",
	status: "Активный пакет",
	statusHint: "Есть остаток",
	progress: 50,
	purchases,
};
const props = {
	project: { id: 1, title: "Техподдержка" },
	projectPackages,
	projectTasks: tasks,
	selectedPurchaseId: null,
	onAddPackage: vi.fn(),
	onEditPackage: vi.fn(),
};

beforeEach(() => {
	openTask.mockReset();
	fetchSupportHoursPackageReport.mockReset();
	notify.mockReset();
	vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
});

describe("support report list", () => {
	it("shows taskless reports directly and excludes tasks with no reports", () => {
		render(<SupportProjectDetails {...props} />);
		expect(
			screen.getByRole("button", { name: "Посмотреть отчёт: Проверена почта" }),
		).toBeInTheDocument();
		expect(screen.getByText("02.09.2026")).toBeInTheDocument();
		expect(
			screen.getByRole("button", {
				name: "Отчёты по задаче: Настройка соединения",
			}),
		).toHaveAttribute("aria-expanded", "false");
		expect(screen.queryByText("Задача не указана")).not.toBeInTheDocument();
		expect(screen.queryByText("Задача без отчётов")).not.toBeInTheDocument();
		expect(screen.queryByText("Без списаний")).not.toBeInTheDocument();
	});

	it("counts a split report once and sums only allocations in the selected packages", () => {
		const all = collectSupportReports(purchases);
		expect(all).toHaveLength(3);
		expect(all.find((report) => report.id === "1")).toMatchObject({
			hours: 6,
			allocations: [
				{ purchaseId: 1, hours: 2 },
				{ purchaseId: 2, hours: 4 },
			],
		});
		const allEntries = collectSupportEntries(all, tasks);
		expect(allEntries).toHaveLength(3);
		expect(allEntries.find((entry) => entry.id === "100")).toMatchObject({
			kind: "task",
			hours: 6,
			reports: [{ id: "1", hours: 6 }],
		});
		const selected = collectSupportEntries(
			collectSupportReports([purchases[1]]),
			tasks,
		);
		expect(selected).toHaveLength(1);
		expect(selected[0]).toMatchObject({
			kind: "task",
			id: "100",
			hours: 4,
			reports: [{ id: "1", hours: 4 }],
		});

		const { rerender } = render(<SupportProjectDetails {...props} />);
		expect(
			within(
				screen.getByRole("button", {
					name: "Отчёты по задаче: Настройка соединения",
				}),
			).getByText("6 ч"),
		).toBeInTheDocument();
		rerender(<SupportProjectDetails {...props} selectedPurchaseId={2} />);
		expect(
			within(
				screen.getByRole("button", {
					name: "Отчёты по задаче: Настройка соединения",
				}),
			).getByText("4 ч"),
		).toBeInTheDocument();
		expect(screen.queryByText("Проверена почта")).not.toBeInTheDocument();
		expect(screen.queryByText("Работы по справочнику")).not.toBeInTheDocument();
	});

	it("searches descriptions and applies task status only to actual tasks", () => {
		const entries = collectSupportEntries(
			collectSupportReports(purchases),
			tasks,
		);
		expect(
			entries
				.filter((entry) => matchesSupportEntry(entry, "СЕРВЕРОМ", "all"))
				.map((entry) => entry.id),
		).toEqual(["100"]);
		expect(
			entries
				.filter((entry) => matchesSupportEntry(entry, "почта", "closed"))
				.map((entry) => entry.id),
		).toEqual(["2"]);
		expect(
			entries
				.filter((entry) => matchesSupportEntry(entry, "", "closed"))
				.map((entry) => entry.id),
		).toEqual(["101", "2"]);
	});

	it("opens the task independently of expansion and distinguishes task and report in the drawer", () => {
		render(<SupportProjectDetails {...props} />);
		const toggle = screen.getByRole("button", {
			name: "Отчёты по задаче: Настройка соединения",
		});
		fireEvent.click(
			screen.getByRole("button", {
				name: "Открыть задачу: Настройка соединения",
			}),
		);
		expect(openTask).toHaveBeenLastCalledWith("100", EntityTypeIds.tasks);
		expect(toggle).toHaveAttribute("aria-expanded", "false");
		fireEvent.click(toggle);
		expect(toggle).toHaveAttribute("aria-expanded", "true");
		fireEvent.click(
			screen.getByRole("button", {
				name: "Посмотреть отчёт: Восстановлено соединение с сервером",
			}),
		);
		const drawer = within(screen.getByRole("dialog"));
		fireEvent.click(
			drawer.getByRole("button", { name: /Открыть связанную задачу/ }),
		);
		expect(openTask).toHaveBeenLastCalledWith("100", EntityTypeIds.tasks);
		fireEvent.click(
			drawer.getByRole("button", { name: "Открыть отчёт в Битрикс" }),
		);
		expect(openTask).toHaveBeenLastCalledWith("1", EntityTypeIds.reports);
	});
});

describe("selected support package PDF", () => {
	const createObjectURL = vi.fn(() => "blob:package-pdf");
	const revokeObjectURL = vi.fn();
	let downloads: Array<{ filename: string; href: string }>;
	beforeEach(() => {
		downloads = [];
		createObjectURL.mockClear();
		revokeObjectURL.mockClear();
		vi.stubGlobal(
			"URL",
			Object.assign(class extends URL {}, { createObjectURL, revokeObjectURL }),
		);
		vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
			this: HTMLAnchorElement,
		) {
			downloads.push({ filename: this.download, href: this.href });
		});
	});
	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it("requires an explicit package when several packages are listed", () => {
		const { rerender } = render(<SupportProjectDetails {...props} />);
		const button = screen.getByRole("button", { name: "Отчёт по пакету" });
		expect(button).toBeDisabled();
		expect(screen.getByText("Выберите пакет для отчёта")).toBeInTheDocument();
		fireEvent.click(button);
		expect(fetchSupportHoursPackageReport).not.toHaveBeenCalled();
		rerender(<SupportProjectDetails {...props} selectedPurchaseId={2} />);
		expect(button).toBeEnabled();
		expect(
			screen.getByText("За весь пакет по сегодняшний день"),
		).toBeInTheDocument();
	});

	it("downloads the entire selected package once, blocks duplicate clicks, and releases its URL", async () => {
		vi.useFakeTimers();
		let finish!: (blob: Blob) => void;
		const pending = new Promise<Blob>((resolve) => {
			finish = resolve;
		});
		fetchSupportHoursPackageReport.mockReturnValueOnce(pending);
		render(<SupportProjectDetails {...props} selectedPurchaseId={2} />);
		fireEvent.click(screen.getByRole("button", { name: "Отчёт по пакету" }));
		const loading = screen.getByRole("button", { name: "Готовим отчёт…" });
		expect(loading).toBeDisabled();
		expect(loading).toHaveAttribute("aria-busy", "true");
		fireEvent.click(loading);
		await act(async () => {
			/* Let the pre-export check resolve before inspecting generation. */
		});
		expect(fetchSupportHoursPackageReport).toHaveBeenCalledExactlyOnceWith(2);
		const pdf = new Blob(["%PDF-1.4 test"], { type: "application/pdf" });
		await act(async () => finish(pdf));
		expect(createObjectURL).toHaveBeenCalledWith(pdf);
		expect(downloads).toEqual([
			{ filename: "support-package-2.pdf", href: "blob:package-pdf" },
		]);
		expect(document.querySelector("a[download]")).toBeNull();
		expect(
			screen.getByRole("button", { name: "Отчёт по пакету" }),
		).toBeEnabled();
		expect(revokeObjectURL).not.toHaveBeenCalled();
		act(() => vi.advanceTimersByTime(1000));
		expect(revokeObjectURL).toHaveBeenCalledWith("blob:package-pdf");
	});

	it("uses the only package when all packages is selected", async () => {
		fetchSupportHoursPackageReport.mockResolvedValue(new Blob(["pdf"]));
		render(
			<SupportProjectDetails
				{...props}
				projectPackages={{ ...projectPackages, purchases: [purchases[0]] }}
			/>,
		);
		fireEvent.click(screen.getByRole("button", { name: "Отчёт по пакету" }));
		await waitFor(() => expect(downloads).toHaveLength(1));
		expect(fetchSupportHoursPackageReport).toHaveBeenCalledExactlyOnceWith(1);
	});

	it("keeps only current PDF export when one package remains or a package is selected explicitly", () => {
		const view = render(
			<SupportProjectDetails
				{...props}
				projectPackages={{ ...projectPackages, purchases: [purchases[1]] }}
			/>,
		);
		expect(
			screen.getByRole("button", { name: "Отчёт по пакету" }),
		).toBeEnabled();
		expect(
			screen.queryByRole("button", { name: /Зафиксировать версию/ }),
		).not.toBeInTheDocument();
		expect(screen.queryByText(/Сохранённые версии/)).not.toBeInTheDocument();
		view.rerender(<SupportProjectDetails {...props} selectedPurchaseId={2} />);
		expect(
			screen.getByRole("button", { name: "Отчёт по пакету" }),
		).toBeEnabled();
		expect(
			screen.queryByRole("button", { name: /Скачать PDF/ }),
		).not.toBeInTheDocument();
	});

	it("reports generation errors and re-enables the button for another attempt", async () => {
		fetchSupportHoursPackageReport.mockRejectedValueOnce(
			new Error("Generation unavailable"),
		);
		render(<SupportProjectDetails {...props} selectedPurchaseId={1} />);
		fireEvent.click(screen.getByRole("button", { name: "Отчёт по пакету" }));
		await waitFor(() =>
			expect(notify).toHaveBeenCalledWith({
				message: "Не удалось сформировать отчёт по пакету. Повторите попытку.",
				type: "error",
			}),
		);
		expect(
			screen.getByRole("button", { name: "Отчёт по пакету" }),
		).toBeEnabled();
		expect(createObjectURL).not.toHaveBeenCalled();
		expect(downloads).toHaveLength(0);
	});
});
