import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EntityTypeIds } from "@/shared/constants/const";
import type { KanbanData } from "./api";
import { DevelopmentKanbanPage } from "./DevelopmentKanbanPage";
import type { KanbanTask } from "./model";

const source = vi.hoisted(() => ({
	data: null as KanbanData | null,
	loading: false,
	isRefreshing: false,
	error: null as string | null,
	updatedAt: new Date("2026-10-02T07:00:00Z"),
	refresh: vi.fn(),
	openTask: vi.fn(),
}));

vi.mock("@/components/protectedRoute/CheckPermission", () => ({
	CheckPermission: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("./useKanbanData", () => ({ useKanbanData: () => source }));
vi.mock("@/shared/hooks/useBitrixSlider", () => ({
	useBitrixSlider: () => ({ openTask: source.openTask }),
}));

const UNFORMED = "DT1072_18:UC_A9IWFS";
const BACKLOG = "DT1072_18:NEW";
const SPRINT = "DT1072_18:PREPARATION";
const CUSTOM_WORK = "DT1072_18:UC_NEW_WORK_STAGE";
const DONE = "DT1072_18:UC_6JNSDG";

const task = (id: string, changes: Partial<KanbanTask> = {}): KanbanTask => ({
	id,
	title: `Работа ${id}`,
	assigneeId: "13",
	stageId: SPRINT,
	projectId: "77",
	projectTitle: "АО МРК",
	priority: 1,
	estimateHours: 8,
	spentHours: 0,
	deadline: null,
	redline: null,
	...changes,
});

const fixture = (tasks: KanbanTask[]): KanbanData => ({
	stages: [
		{ id: UNFORMED, name: "Не сформированная задача", sort: 10 },
		{ id: BACKLOG, name: "Бэклог", sort: 20 },
		{ id: SPRINT, name: "Спринт", sort: 30 },
		{ id: CUSTOM_WORK, name: "Согласование релиза", sort: 35 },
		{ id: DONE, name: "Выполнено", sort: 70, terminal: true },
	],
	people: [
		{ id: "13", name: "Дарья Смирнова", active: true, developer: true },
		{ id: "22", name: "Максим Иванов", active: true, developer: true },
	],
	tasks,
});

const board = () =>
	screen.getByRole("region", {
		name: "Канбан задач разработки по стадиям",
	});

beforeEach(() => {
	vi.resetAllMocks();
	source.data = fixture([
		task("101", { title: "Работа из бэклога", stageId: BACKLOG }),
		task("102", { title: "Неоформленная работа", stageId: UNFORMED }),
		task("103", { title: "Работа спринта" }),
		task("104", { title: "Работа в новой стадии", stageId: CUSTOM_WORK }),
		task("105", { title: "Завершённая работа", stageId: DONE }),
	]);
	source.loading = false;
	source.isRefreshing = false;
	source.error = null;
	source.openTask.mockResolvedValue(undefined);
});
afterEach(cleanup);

describe("development kanban workspace", () => {
	it("shows new active native stages by default and adds only backlog and unformed work when toggled", () => {
		render(<DevelopmentKanbanPage />);
		const initialBoard = within(board());
		expect(
			initialBoard.getByRole("region", { name: "Стадия: Спринт" }),
		).toBeInTheDocument();
		expect(
			initialBoard.getByRole("region", { name: "Стадия: Согласование релиза" }),
		).toBeInTheDocument();
		expect(
			initialBoard.getByRole("button", {
				name: "Открыть задачу: Работа спринта",
			}),
		).toBeInTheDocument();
		expect(
			initialBoard.getByRole("button", {
				name: "Открыть задачу: Работа в новой стадии",
			}),
		).toBeInTheDocument();
		expect(initialBoard.queryByText("Бэклог")).not.toBeInTheDocument();
		expect(
			initialBoard.queryByText("Не сформированная задача"),
		).not.toBeInTheDocument();
		expect(initialBoard.queryByText("Выполнено")).not.toBeInTheDocument();

		fireEvent.click(
			screen.getByRole("checkbox", { name: "Бэклог и несформированные" }),
		);
		const expandedBoard = within(board());
		expect(
			expandedBoard.getByRole("region", { name: "Стадия: Бэклог" }),
		).toBeInTheDocument();
		expect(
			expandedBoard.getByRole("region", {
				name: "Стадия: Не сформированная задача",
			}),
		).toBeInTheDocument();
		expect(
			expandedBoard.getAllByRole("button", { name: /^Открыть задачу:/ }),
		).toHaveLength(4);
		expect(expandedBoard.queryByText("Выполнено")).not.toBeInTheDocument();
		expect(
			expandedBoard.queryByRole("button", {
				name: "Открыть задачу: Завершённая работа",
			}),
		).not.toBeInTheDocument();
	});

	it("opens the development smart-process task and offers recovery if opening fails", async () => {
		source.openTask.mockRejectedValueOnce(new Error("SDK unavailable"));
		render(<DevelopmentKanbanPage />);
		fireEvent.click(
			screen.getByRole("button", { name: "Открыть задачу: Работа спринта" }),
		);
		await waitFor(() => {
			expect(source.openTask).toHaveBeenCalledWith("103", EntityTypeIds.tasks);
			expect(screen.getByRole("alert")).toHaveTextContent(
				"Не удалось открыть задачу. Повторите попытку.",
			);
		});
		fireEvent.click(screen.getByRole("button", { name: "Повторить" }));
		expect(source.refresh).toHaveBeenCalledTimes(1);
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Открыть задачу: Работа спринта" }),
		).toBeInTheDocument();
	});

	it("keeps employee, project and search filters while refreshing and applies them to the updated tasks", () => {
		source.data = fixture([
			task("110", { title: "Оплата сервера" }),
			task("111", { title: "Оплата другого сотрудника", assigneeId: "22" }),
			task("112", { title: "Разработка интеграции" }),
		]);
		const { rerender } = render(<DevelopmentKanbanPage />);
		fireEvent.change(screen.getByRole("combobox", { name: "Сотрудник" }), {
			target: { value: "13" },
		});
		fireEvent.change(screen.getByRole("combobox", { name: "Проект" }), {
			target: { value: "77" },
		});
		fireEvent.change(screen.getByRole("searchbox", { name: "Поиск" }), {
			target: { value: "Оплата" },
		});
		const displayedCard = screen.getByRole("button", {
			name: "Открыть задачу: Оплата сервера",
		});
		fireEvent.click(screen.getByRole("button", { name: "Обновить" }));
		expect(source.refresh).toHaveBeenCalledTimes(1);
		source.isRefreshing = true;
		rerender(<DevelopmentKanbanPage />);
		expect(screen.getByRole("button", { name: "Обновляется…" })).toBeDisabled();
		expect(
			screen.getByRole("button", { name: "Открыть задачу: Оплата сервера" }),
		).toBe(displayedCard);
		expect(screen.queryByText(/Загружаем задачи/)).not.toBeInTheDocument();

		source.data = fixture([
			task("110", { title: "Оплата сервера обновлена" }),
			task("113", { title: "Оплата новой работы", assigneeId: "22" }),
			task("114", {
				title: "Оплата другого проекта",
				projectId: "88",
				projectTitle: "Другой проект",
			}),
			task("115", { title: "Проверка интеграции" }),
		]);
		source.isRefreshing = false;
		rerender(<DevelopmentKanbanPage />);
		expect(screen.getByRole("combobox", { name: "Сотрудник" })).toHaveValue(
			"13",
		);
		expect(screen.getByRole("combobox", { name: "Проект" })).toHaveValue("77");
		expect(screen.getByRole("searchbox", { name: "Поиск" })).toHaveValue(
			"Оплата",
		);
		const updatedCards = within(board()).getAllByRole("button", {
			name: /^Открыть задачу:/,
		});
		expect(updatedCards).toHaveLength(1);
		expect(updatedCards[0]).toHaveAccessibleName(
			"Открыть задачу: Оплата сервера обновлена",
		);
	});
});
