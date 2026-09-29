import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
	ClientPackage,
	PackageConsumption,
	PackagePurchase,
} from "./clientHoursPackages.types";
import type {
	SupportProjectWorkspace,
	SupportWorkspaceReport,
} from "./supportWorkspace.api";
import { buildSupportWorkspaceLists } from "./supportWorkspaceLists";
import { SupportProjectDetails } from "./SupportProjectDetails";
const { openTask } = vi.hoisted(() => ({ openTask: vi.fn() }));
vi.mock("@/shared/hooks/useBitrixSlider", () => ({
	useBitrixSlider: () => ({ openTask }),
}));
vi.mock("./SupportPackageReportPanel", () => ({
	SupportPackageReportPanel: () => null,
}));
const report = (
	id: string,
	taskId: string | null,
	hours: number,
	includeInPackage: boolean,
	allocations: SupportWorkspaceReport["allocations"],
): SupportWorkspaceReport => ({
	id,
	taskId,
	taskTitle: taskId ? `Задача ${taskId}` : null,
	responsibleName: "Анна Тестовая",
	date: "2026-09-29",
	hours,
	title: `Отчёт ${id}`,
	description: `Выполненная работа ${id}`,
	includeInPackage,
	allocations,
	allocatedHours: allocations.reduce((sum, item) => sum + item.hours, 0),
	unallocatedHours: includeInPackage
		? hours - allocations.reduce((sum, item) => sum + item.hours, 0)
		: 0,
});
const allocation = (purchaseId: number, hours: number) => ({
	purchaseId,
	purchaseDate: `2026-09-0${purchaseId}`,
	hours,
});
const reports = [
	report("1", "100", 6, true, [allocation(1, 2), allocation(2, 4)]),
	report("2", "200", 3, true, []),
	report("3", "300", 2, false, []),
	report("4", null, 1, true, []),
	report("5", "400", 8, true, [allocation(2, 8)]),
	report("6", null, 5, true, [allocation(1, 2)]),
];
const consumptions = (purchaseId: number): PackageConsumption[] =>
	reports.flatMap((item) =>
		item.allocations
			.filter((part) => part.purchaseId === purchaseId)
			.map((part, index) => ({
				id: Number(item.id) * 10 + index,
				hours: part.hours,
				report: {
					bitrixReportId: item.id,
					bitrixTaskId: item.taskId,
					taskTitle: item.taskTitle,
					bitrixResponsibleId: "10",
					responsibleName: item.responsibleName,
					bitrixCompanyId: "20",
					companyName: "Тестовый клиент",
					projectTitle: "Техподдержка",
					bitrixActivityId: "392",
					activityTitle: "Разработка",
					reportDate: item.date,
					reportTitle: item.title,
					reportDescription: item.description,
				},
			})),
	);
const purchases: PackagePurchase[] = [
	{
		id: 1,
		date: "2026-09-01",
		hours: 4,
		remaining: 0,
		state: "Часы закончились",
		amount: null,
		comment: null,
		consumptions: consumptions(1),
	},
	{
		id: 2,
		date: "2026-09-02",
		hours: 10,
		remaining: -2,
		state: "Часы закончились",
		amount: null,
		comment: null,
		consumptions: consumptions(2),
	},
];
const group: ClientPackage = {
	id: 31,
	client: "Техподдержка",
	lastCharge: "29.09",
	remainingHours: -2,
	state: "overdue",
	status: "Перерасход",
	statusHint: "Работы сверх пакета",
	progress: 100,
	purchases,
};
const workspace: SupportProjectWorkspace = {
	projectId: 31,
	reports,
	tasks: [100, 200, 300, 400, 500].map((id) => ({
		id: String(id),
		title: `Задача ${id}`,
		stageId: "NEW",
	})),
	packageGroup: group,
};
const props = {
	project: { id: 31, title: "Техподдержка" },
	projectPackages: group,
	projectTasks: workspace.tasks,
	selectedPurchaseId: null,
	workspace,
	onAddPackage: vi.fn(),
	onEditPackage: vi.fn(),
	onSelectPackage: vi.fn(),
	onAddReport: vi.fn(),
	onEditReport: vi.fn(),
	onRetryWorkspace: vi.fn(),
};
beforeEach(() => {
	vi.clearAllMocks();
	vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
});

describe("project worklists and automatic allocation", () => {
	it("keeps excluded work distinct, counts only remaining unallocated hours and never treats package overflow as unallocated", () => {
		const lists = buildSupportWorkspaceLists(workspace, "Техподдержка");
		expect(lists.unallocated.map((item) => item.id)).toEqual(["2", "4", "6"]);
		expect(lists.unallocated.reduce((sum, item) => sum + item.hours, 0)).toBe(
			7,
		);
		expect(lists.unallocated.find((item) => item.id === "6")).toMatchObject({
			hours: 3,
			totalHours: 5,
			hourScope: "unallocated",
		});
		expect(lists.excluded).toMatchObject([
			{ id: "3", hours: 2, hourScope: "excluded" },
		]);
		expect(lists.tasks.map((task) => task.id)).toEqual(["500"]);
	});
	it("shows selected-package slices, while unallocated and excluded tabs always cover the entire project", () => {
		render(<SupportProjectDetails {...props} selectedPurchaseId={1} />);
		expect(
			screen.getByRole("button", { name: "В пакетах 2 · 4 ч" }),
		).toHaveAttribute("aria-pressed", "true");
		expect(
			within(
				screen.getByRole("button", { name: "Отчёты по задаче: Задача 100" }),
			).getByText("2 ч"),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Без пакета 3 · 7 ч" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Не учитываются 1 · 2 ч" }),
		).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Без пакета 3 · 7 ч" }));
		expect(
			screen.getByText(
				"Весь проект · выбор пакета не ограничивает этот список.",
			),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Отчёты по задаче: Задача 200" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", {
				name: "Посмотреть отчёт: Выполненная работа 4",
			}),
		).toBeInTheDocument();
		expect(screen.queryByText("Задача не указана")).not.toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Отчёты по задаче: Задача 400" }),
		).not.toBeInTheDocument();
		fireEvent.click(
			screen.getByRole("button", { name: "Добавить пакет часов" }),
		);
		expect(props.onAddPackage).toHaveBeenCalledOnce();
	});
	it("labels unallocated and excluded report drawers correctly and edits through the existing report editor", () => {
		render(<SupportProjectDetails {...props} />);
		fireEvent.click(screen.getByRole("button", { name: /^Без пакета/ }));
		fireEvent.click(
			screen.getByRole("button", {
				name: "Посмотреть отчёт: Выполненная работа 6",
			}),
		);
		let drawer = within(screen.getByRole("dialog"));
		expect(drawer.getByText("Часов без пакета")).toBeInTheDocument();
		expect(drawer.getByText("3 ч")).toBeInTheDocument();
		expect(drawer.getByText("Всего часов по отчёту")).toBeInTheDocument();
		expect(drawer.getByText("5 ч")).toBeInTheDocument();
		fireEvent.click(drawer.getByRole("button", { name: "Закрыть" }));
		fireEvent.click(screen.getByRole("button", { name: /^Не учитываются/ }));
		fireEvent.click(
			screen.getByRole("button", { name: "Отчёты по задаче: Задача 300" }),
		);
		fireEvent.click(
			screen.getByRole("button", {
				name: "Посмотреть отчёт: Выполненная работа 3",
			}),
		);
		drawer = within(screen.getByRole("dialog"));
		expect(drawer.getByText("Не учитывается")).toBeInTheDocument();
		expect(drawer.queryByText("Списано часов")).not.toBeInTheDocument();
		expect(drawer.getByText(/Учёт в пакете выключен/)).toBeInTheDocument();
		fireEvent.click(drawer.getByRole("button", { name: "Изменить отчёт" }));
		expect(props.onEditReport).toHaveBeenCalledExactlyOnceWith("3");
	});
	it("lists only tasks without any reports and provides create/open actions without billing task hours", () => {
		render(<SupportProjectDetails {...props} />);
		fireEvent.click(
			screen.getByRole("button", { name: "Задачи без отчётов 1" }),
		);
		expect(screen.getByText("Задача 500")).toBeInTheDocument();
		for (const id of [100, 200, 300, 400])
			expect(screen.queryByText(`Задача ${id}`)).not.toBeInTheDocument();
		const row = screen.getByText("Задача 500").parentElement
			?.parentElement as HTMLElement;
		expect(within(row).queryByText(/\d+ ч/)).not.toBeInTheDocument();
		fireEvent.click(
			screen.getByRole("button", {
				name: "Добавить отчёт по задаче: Задача 500",
			}),
		);
		expect(props.onAddReport).toHaveBeenCalledExactlyOnceWith("500");
		fireEvent.click(
			screen.getByRole("button", { name: "Открыть задачу: Задача 500" }),
		);
		expect(openTask).toHaveBeenCalledExactlyOnceWith("500", 1072);
	});
	it("shows load errors and unknown counts instead of pretending missing reports do not exist", () => {
		const view = render(
			<SupportProjectDetails {...props} workspace={null} workspaceLoading />,
		);
		fireEvent.click(screen.getByRole("button", { name: "Без пакета —" }));
		expect(screen.getByRole("status")).toHaveTextContent(
			"Загружаем отчёты и задачи",
		);
		expect(
			screen.queryByText("Нет отчётов, ожидающих распределения по пакетам."),
		).not.toBeInTheDocument();
		view.rerender(
			<SupportProjectDetails
				{...props}
				workspaceLoading={false}
				workspaceError="Битрикс24 недоступен"
			/>,
		);
		expect(screen.getByRole("alert")).toHaveTextContent("Битрикс24 недоступен");
		expect(
			screen.getByRole("button", { name: "Без пакета —" }),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", {
				name: "Посмотреть отчёт: Выполненная работа 4",
			}),
		).not.toBeInTheDocument();
		fireEvent.click(
			screen.getByRole("button", { name: "Повторить загрузку списка" }),
		);
		expect(props.onRetryWorkspace).toHaveBeenCalledOnce();
	});
	it("shows a package balance table with explicit selection/edit and collapses it for a selected package", () => {
		const view = render(<SupportProjectDetails {...props} />);
		const table = within(screen.getByRole("table"));
		const row = table
			.getByRole("button", { name: "Выбрать пакет №2" })
			.closest("tr") as HTMLElement;
		expect(within(row).getByText("10 ч")).toBeInTheDocument();
		expect(within(row).getByText("12 ч")).toBeInTheDocument();
		expect(within(row).getByText("-2 ч")).toBeInTheDocument();
		fireEvent.click(table.getByRole("button", { name: "Выбрать пакет №2" }));
		expect(props.onSelectPackage).toHaveBeenCalledExactlyOnceWith(2);
		fireEvent.click(table.getByRole("button", { name: "Изменить пакет №1" }));
		expect(props.onEditPackage).toHaveBeenCalledExactlyOnceWith(purchases[0]);
		view.rerender(<SupportProjectDetails {...props} selectedPurchaseId={2} />);
		expect(screen.queryByRole("table")).not.toBeInTheDocument();
		fireEvent.click(
			screen.getByRole("button", { name: "← Все пакеты проекта" }),
		);
		expect(props.onSelectPackage).toHaveBeenLastCalledWith(null);
	});
});
