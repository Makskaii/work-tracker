import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
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
import {
	getTransferReports,
	getTasksWithoutReports,
	validateTransferHours,
	type SupportTransferPreview,
} from "./supportTransfer.model";
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
	companyName: "Тестовый клиент",
	activityTitle: "Разработка",
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

const preview: SupportTransferPreview = {
	fingerprint: "workspace-revision-1",
	movedHours: 3,
	unallocatedHours: 2,
	items: [{ reportId: "6", hours: 3 }],
	packages: [
		{
			id: 1,
			before: { purchasedHours: 10, consumedHours: 7, remainingHours: 3 },
			after: { purchasedHours: 10, consumedHours: 10, remainingHours: 0 },
		},
	],
};
const left = () =>
	within(screen.getByRole("region", { name: "Выбранный пакет" }));
const right = () =>
	within(screen.getByRole("region", { name: "Источник работ" }));

describe("two-list allocation workspace", () => {
	it("preserves metadata, fractional allocation slices and excluded reports without treating overflow as unallocated", () => {
		const list = getTransferReports(workspace, "Техподдержка", null);
		expect(list.map((item) => item.id)).toEqual(["2", "3", "4", "6"]);
		expect(list.find((item) => item.id === "6")).toMatchObject({
			hours: 3,
			totalHours: 5,
		});
		expect(list.find((item) => item.id === "3")).toMatchObject({
			hourScope: "excluded",
			companyName: "Тестовый клиент",
			activityTitle: "Разработка",
		});
		expect(
			getTransferReports(workspace, "Техподдержка", 2).map((item) => item.id),
		).toEqual(["1", "5"]);
		expect(getTasksWithoutReports(workspace).map((task) => task.id)).toEqual([
			"500",
		]);
		expect(
			buildSupportWorkspaceLists(workspace, "Техподдержка").excluded[0],
		).toMatchObject({
			companyName: "Тестовый клиент",
			activityTitle: "Разработка",
		});
		expect(
			validateTransferHours(list, {
				"2": "0",
				"3": "0",
				"4": "0",
				"6": "1,25",
			}),
		).toEqual({ items: [{ reportId: "6", hours: 1.25 }], errors: {} });
		expect(
			validateTransferHours(list, {
				"2": "NaN",
				"3": "0",
				"4": "0",
				"6": "3.1",
			}).errors,
		).toHaveProperty("6");
	});
	it("shows two lists with selected-package hours and all unallocated work including unchecked and empty tasks", () => {
		render(<SupportProjectDetails {...props} selectedPurchaseId={1} />);
		expect(
			screen.queryByRole("group", { name: "Списки проекта" }),
		).not.toBeInTheDocument();
		expect(left().getByText("4 ч")).toBeInTheDocument();
		expect(right().getByText("Задача 300")).toBeInTheDocument();
		expect(right().getByText("Задача 500")).toBeInTheDocument();
		expect(
			right().getByRole("button", {
				name: "Посмотреть отчёт: Выполненная работа 4",
			}),
		).toBeInTheDocument();
		expect(screen.queryByText("Задача не указана")).not.toBeInTheDocument();
		fireEvent.click(
			right().getByRole("button", { name: "Отчёты по задаче: Задача 300" }),
		);
		expect(right().getByText("Не учитывается в пакете")).toBeInTheDocument();
	});
	it("can use another package as source without duplicating the selected package in source options", () => {
		render(<SupportProjectDetails {...props} selectedPurchaseId={1} />);
		const source = right().getByRole("combobox", { name: "Источник работ" });
		expect(
			within(source).queryByRole("option", { name: /№1/ }),
		).not.toBeInTheDocument();
		fireEvent.change(source, { target: { value: "2" } });
		expect(right().getByText("Задача 400")).toBeInTheDocument();
		expect(right().queryByText("Задача 500")).not.toBeInTheDocument();
		expect(right().getByText("12 ч")).toBeInTheDocument();
	});
	it("keeps both scrolled lists, expanded tasks, search, source selection and report drawer mounted during background refresh", () => {
		const view = render(
			<SupportProjectDetails {...props} selectedPurchaseId={1} />,
		);
		const source = right().getByRole("combobox", { name: "Источник работ" });
		fireEvent.change(source, { target: { value: "2" } });
		fireEvent.change(screen.getByRole("searchbox"), {
			target: { value: "Задача" },
		});
		const leftTask = left().getByRole("button", {
			name: "Отчёты по задаче: Задача 100",
		});
		const rightTask = right().getByRole("button", {
			name: "Отчёты по задаче: Задача 400",
		});
		fireEvent.click(leftTask);
		fireEvent.click(rightTask);
		const leftList = leftTask.parentElement!.parentElement!.parentElement!;
		const rightList = rightTask.parentElement!.parentElement!.parentElement!;
		leftList.scrollTop = 120;
		rightList.scrollTop = 240;
		const openReport = right().getByRole("button", {
			name: "Посмотреть отчёт: Выполненная работа 5",
		});
		fireEvent.click(openReport);
		const dialog = screen.getByRole("dialog");

		view.rerender(
			<SupportProjectDetails
				{...props}
				selectedPurchaseId={1}
				workspaceLoading
			/>,
		);
		expect(leftTask).toBeInTheDocument();
		expect(rightTask).toBeInTheDocument();
		expect(openReport).toBeInTheDocument();
		expect(leftTask).toHaveAttribute("aria-expanded", "true");
		expect(rightTask).toHaveAttribute("aria-expanded", "true");
		expect(leftList.scrollTop).toBe(120);
		expect(rightList.scrollTop).toBe(240);
		expect(source).toHaveValue("2");
		expect(screen.getByRole("searchbox")).toHaveValue("Задача");
		expect(screen.getByRole("dialog")).toBe(dialog);
		expect(left().getByRole("status")).toHaveTextContent("Обновляем данные…");
		expect(
			screen.queryByText("Загружаем работы проекта…"),
		).not.toBeInTheDocument();
		for (const button of screen.getAllByRole("button", {
			name: /Перенести (задачу|отчёт):/,
		}))
			expect(button).toBeDisabled();
		expect(openReport.parentElement).toHaveAttribute("draggable", "false");

		view.rerender(
			<SupportProjectDetails
				{...props}
				selectedPurchaseId={1}
				workspace={{
					...workspace,
					tasks: workspace.tasks.map((task) =>
						task.id === "400"
							? { ...task, title: "Задача 400 обновлена" }
							: task,
					),
				}}
			/>,
		);
		expect(
			right().getByRole("button", {
				name: "Отчёты по задаче: Задача 400 обновлена",
			}),
		).toBe(rightTask);
		expect(leftTask).toBeInTheDocument();
		expect(openReport).toBeInTheDocument();
		expect(leftList.scrollTop).toBe(120);
		expect(rightList.scrollTop).toBe(240);
		expect(rightTask).toHaveAttribute("aria-expanded", "true");
		expect(screen.getByRole("dialog")).toBe(dialog);
		expect(source).toHaveValue("2");
		expect(screen.getByRole("searchbox")).toHaveValue("Задача");
		expect(
			right().getByRole("button", {
				name: "Перенести отчёт: Выполненная работа 5 в выбранный пакет",
			}),
		).toBeEnabled();
	});
	it("previews a report move and requires explicit confirmation with the returned fingerprint", async () => {
		const onPreviewTransfer = vi.fn().mockResolvedValue(preview);
		const onTransfer = vi.fn().mockResolvedValue(undefined);
		render(
			<SupportProjectDetails
				{...props}
				selectedPurchaseId={1}
				onPreviewTransfer={onPreviewTransfer}
				onTransfer={onTransfer}
			/>,
		);
		fireEvent.click(
			right().getByRole("button", {
				name: "Перенести отчёт: Выполненная работа 6 в выбранный пакет",
			}),
		);
		await waitFor(() => expect(onPreviewTransfer).toHaveBeenCalledOnce());
		expect(onPreviewTransfer).toHaveBeenCalledWith({
			projectId: 31,
			fromPurchaseId: null,
			toPurchaseId: 1,
			items: [{ reportId: "6", hours: 3 }],
		});
		expect(onTransfer).not.toHaveBeenCalled();
		const modal = within(screen.getByRole("dialog"));
		expect(await modal.findByText("Останется без пакета")).toBeInTheDocument();
		expect(modal.getByText("2 ч")).toBeInTheDocument();
		fireEvent.click(modal.getByRole("button", { name: "Подтвердить перенос" }));
		await waitFor(() =>
			expect(onTransfer).toHaveBeenCalledExactlyOnceWith(
				onPreviewTransfer.mock.calls[0][0],
				"workspace-revision-1",
			),
		);
		await waitFor(() =>
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
		);
	});
	it("moves task binding even for a task without reports and keeps it nonbillable", async () => {
		const onPreviewTransfer = vi.fn().mockResolvedValue({
			...preview,
			movedHours: 0,
			unallocatedHours: 0,
			items: [],
			packages: [],
		});
		render(
			<SupportProjectDetails
				{...props}
				selectedPurchaseId={1}
				onPreviewTransfer={onPreviewTransfer}
			/>,
		);
		fireEvent.click(
			right().getByRole("button", {
				name: "Перенести задачу: Задача 500 в выбранный пакет",
			}),
		);
		await waitFor(() =>
			expect(onPreviewTransfer).toHaveBeenCalledWith({
				projectId: 31,
				fromPurchaseId: null,
				toPurchaseId: 1,
				items: [],
				taskId: "500",
			}),
		);
		expect(
			await screen.findByText(/Задача будет привязана к пакету №1/),
		).toBeInTheDocument();
	});
	it("keeps bound empty tasks in their package and moves all visible task report slices together", async () => {
		const onPreviewTransfer = vi.fn().mockResolvedValue(preview);
		const boundWorkspace = {
			...workspace,
			tasks: workspace.tasks.map((task) =>
				task.id === "500" ? { ...task, purchaseId: 1 } : task,
			),
		};
		render(
			<SupportProjectDetails
				{...props}
				workspace={boundWorkspace}
				selectedPurchaseId={1}
				onPreviewTransfer={onPreviewTransfer}
			/>,
		);
		expect(left().getByText("Задача 500")).toBeInTheDocument();
		expect(right().queryByText("Задача 500")).not.toBeInTheDocument();
		fireEvent.click(
			left().getByRole("button", {
				name: "Перенести задачу: Задача 100 в нераспределённое",
			}),
		);
		await waitFor(() =>
			expect(onPreviewTransfer).toHaveBeenCalledWith({
				projectId: 31,
				fromPurchaseId: 1,
				toPurchaseId: null,
				items: [{ reportId: "1", hours: 2 }],
				taskId: "100",
			}),
		);
	});
	it("supports drag and drop with the same preview and ignores external drag data", async () => {
		const onPreviewTransfer = vi.fn().mockResolvedValue(preview);
		render(
			<SupportProjectDetails
				{...props}
				selectedPurchaseId={1}
				onPreviewTransfer={onPreviewTransfer}
			/>,
		);
		const target = screen.getByRole("region", { name: "Выбранный пакет" });
		fireEvent.drop(target, { dataTransfer: { getData: () => "external" } });
		expect(onPreviewTransfer).not.toHaveBeenCalled();
		const draggable = right().getByRole("button", {
			name: "Посмотреть отчёт: Выполненная работа 4",
		}).parentElement!;
		const dataTransfer = {
			setData: vi.fn(),
			effectAllowed: "",
			dropEffect: "",
		};
		fireEvent.dragStart(draggable, { dataTransfer });
		fireEvent.dragOver(target, { dataTransfer });
		fireEvent.drop(target, { dataTransfer });
		await waitFor(() =>
			expect(onPreviewTransfer).toHaveBeenCalledExactlyOnceWith({
				projectId: 31,
				fromPurchaseId: null,
				toPurchaseId: 1,
				items: [{ reportId: "4", hours: 1 }],
			}),
		);
	});
	it("keeps the failed transfer draft visible and blocks duplicate submit while pending", async () => {
		let reject!: (reason: Error) => void;
		const onTransfer = vi.fn(
			() =>
				new Promise<void>((_resolve, rejectPromise) => {
					reject = rejectPromise;
				}),
		);
		render(
			<SupportProjectDetails
				{...props}
				selectedPurchaseId={1}
				onPreviewTransfer={vi.fn().mockResolvedValue(preview)}
				onTransfer={onTransfer}
			/>,
		);
		fireEvent.click(
			right().getByRole("button", {
				name: "Перенести отчёт: Выполненная работа 4 в выбранный пакет",
			}),
		);
		const button = await screen.findByRole("button", {
			name: "Подтвердить перенос",
		});
		await waitFor(() => expect(button).toBeEnabled());
		fireEvent.click(button);
		fireEvent.click(button);
		expect(onTransfer).toHaveBeenCalledOnce();
		expect(screen.getByRole("button", { name: "Переносим…" })).toBeDisabled();
		await act(async () =>
			reject(new Error("Данные изменились. Проверьте перенос заново.")),
		);
		expect(screen.getByRole("dialog")).toBeInTheDocument();
		expect(screen.getByRole("alert")).toHaveTextContent("Данные изменились");
	});
	it("keeps the last workspace readable after a refresh error and prevents transfers until refreshed", () => {
		const view = render(
			<SupportProjectDetails {...props} selectedPurchaseId={1} />,
		);
		const task = right().getByRole("button", {
			name: "Отчёты по задаче: Задача 300",
		});
		fireEvent.click(task);
		const report = right().getByRole("button", {
			name: "Посмотреть отчёт: Выполненная работа 3",
		});
		view.rerender(
			<SupportProjectDetails
				{...props}
				selectedPurchaseId={1}
				workspaceError="Битрикс24 недоступен"
			/>,
		);
		expect(screen.getByRole("alert")).toHaveTextContent("Битрикс24 недоступен");
		expect(screen.getByRole("alert")).toHaveTextContent(
			"Показаны последние загруженные данные",
		);
		expect(task).toBeInTheDocument();
		expect(report).toBeInTheDocument();
		expect(task).toHaveAttribute("aria-expanded", "true");
		expect(
			screen.queryByText("Список временно недоступен."),
		).not.toBeInTheDocument();
		for (const button of screen.getAllByRole("button", {
			name: /Перенести (задачу|отчёт):/,
		}))
			expect(button).toBeDisabled();
		fireEvent.click(report);
		expect(screen.getByRole("dialog")).toBeInTheDocument();
		fireEvent.click(
			screen.getByRole("button", { name: "Повторить загрузку списка" }),
		);
		expect(props.onRetryWorkspace).toHaveBeenCalledOnce();
	});
	it("shows initial loading and errors without displaying a workspace from another project", () => {
		const view = render(
			<SupportProjectDetails
				{...props}
				workspace={{ ...workspace, projectId: 32 }}
				workspaceLoading
			/>,
		);
		expect(left().getByRole("status")).toHaveTextContent(
			"Загружаем работы проекта…",
		);
		expect(right().getByRole("status")).toHaveTextContent(
			"Загружаем работы проекта…",
		);
		expect(
			screen.queryByRole("button", { name: /Отчёты по задаче:/ }),
		).not.toBeInTheDocument();
		view.rerender(
			<SupportProjectDetails
				{...props}
				workspace={null}
				workspaceError="Битрикс24 недоступен"
			/>,
		);
		expect(
			right().getByText("Список временно недоступен."),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: /Перенести отчёт/ }),
		).not.toBeInTheDocument();
	});
	it("keeps package balances selectable and editable", () => {
		render(<SupportProjectDetails {...props} />);
		const table = within(screen.getByRole("table"));
		fireEvent.click(table.getByRole("button", { name: "Выбрать пакет №2" }));
		expect(props.onSelectPackage).toHaveBeenCalledExactlyOnceWith(2);
		fireEvent.click(table.getByRole("button", { name: "Изменить пакет №1" }));
		expect(props.onEditPackage).toHaveBeenCalledExactlyOnceWith(purchases[0]);
	});
});

describe("zero-hour reports remain visible without creating charge transfers", () => {
	const zeroWorkspace = {
		...workspace,
		reports: [
			...workspace.reports,
			report("7", null, 0, true, []),
			report("8", "500", 0, false, []),
		],
	};
	it("shows standalone zero-hour reports in unallocated, opens them, and disables their move action and drag", async () => {
		const onPreviewTransfer = vi.fn().mockResolvedValue(preview);
		render(
			<SupportProjectDetails
				{...props}
				workspace={zeroWorkspace}
				selectedPurchaseId={1}
				onPreviewTransfer={onPreviewTransfer}
			/>,
		);
		const open = right().getByRole("button", {
			name: "Посмотреть отчёт: Выполненная работа 7",
		});
		expect(open.parentElement).toHaveAttribute("draggable", "false");
		const move = right().getByRole("button", {
			name: "Перенести отчёт: Выполненная работа 7 в выбранный пакет",
		});
		expect(move).toBeDisabled();
		fireEvent.click(move);
		const dataTransfer = {
			setData: vi.fn(),
			effectAllowed: "",
			dropEffect: "",
		};
		fireEvent.dragStart(open.parentElement!, { dataTransfer });
		fireEvent.drop(screen.getByRole("region", { name: "Выбранный пакет" }), {
			dataTransfer,
		});
		expect(onPreviewTransfer).not.toHaveBeenCalled();
		fireEvent.click(open);
		expect(
			within(screen.getByRole("dialog")).getByText("0 ч"),
		).toBeInTheDocument();
	});
	it("keeps a task with only zero-hour reports visible and transfers its binding without zero-hour items", async () => {
		const onPreviewTransfer = vi.fn().mockResolvedValue({
			...preview,
			movedHours: 0,
			unallocatedHours: 0,
			items: [],
			packages: [],
		});
		const view = render(
			<SupportProjectDetails
				{...props}
				workspace={zeroWorkspace}
				selectedPurchaseId={1}
				onPreviewTransfer={onPreviewTransfer}
			/>,
		);
		expect(right().getByText("Задача 500")).toBeInTheDocument();
		fireEvent.click(
			right().getByRole("button", { name: "Отчёты по задаче: Задача 500" }),
		);
		expect(
			right().getByRole("button", {
				name: "Посмотреть отчёт: Выполненная работа 8",
			}),
		).toBeInTheDocument();
		fireEvent.click(
			right().getByRole("button", {
				name: "Перенести задачу: Задача 500 в выбранный пакет",
			}),
		);
		await waitFor(() =>
			expect(onPreviewTransfer).toHaveBeenCalledExactlyOnceWith({
				projectId: 31,
				fromPurchaseId: null,
				toPurchaseId: 1,
				items: [],
				taskId: "500",
			}),
		);
		fireEvent.click(screen.getByRole("button", { name: "Закрыть" }));
		const assigned = {
			...zeroWorkspace,
			tasks: zeroWorkspace.tasks.map((task) =>
				task.id === "500" ? { ...task, purchaseId: 1 } : task,
			),
		};
		view.rerender(
			<SupportProjectDetails
				{...props}
				workspace={assigned}
				selectedPurchaseId={1}
				onPreviewTransfer={onPreviewTransfer}
			/>,
		);
		expect(left().getByText("Задача 500")).toBeInTheDocument();
		expect(right().queryByText("Задача 500")).not.toBeInTheDocument();
		fireEvent.click(
			left().getByRole("button", {
				name: "Перенести задачу: Задача 500 в нераспределённое",
			}),
		);
		await waitFor(() =>
			expect(onPreviewTransfer).toHaveBeenLastCalledWith({
				projectId: 31,
				fromPurchaseId: 1,
				toPurchaseId: null,
				items: [],
				taskId: "500",
			}),
		);
	});
});
