import {
	cleanup,
	fireEvent,
	render,
	screen,
	within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DevelopmentKanbanBoard } from "./DevelopmentKanbanBoard";
import type { KanbanLane, KanbanStage, KanbanTask } from "./model";

const now = new Date("2026-10-01T08:30:00Z");
const stages: KanbanStage[] = [
	{ id: "sprint", name: "Спринт", sort: 10, color: "#00b5e6" },
	{ id: "work", name: "В работе", sort: 20, color: "#f9b550" },
	{ id: "done", name: "Выполнено", sort: 30, terminal: true },
];
const task = (id: string, overrides: Partial<KanbanTask> = {}): KanbanTask => ({
	id,
	title: `Задача ${id}`,
	assigneeId: "50",
	stageId: "sprint",
	projectId: "77",
	projectTitle: "АО МРК",
	priority: 5,
	estimateHours: 8,
	spentHours: 3,
	deadline: "2026-10-01",
	redline: "2026-09-30",
	...overrides,
});
const lane = (
	tasks: KanbanTask[],
	overrides: Partial<KanbanLane> = {},
): KanbanLane => ({
	id: "50",
	name: "Валерия Дмитриева",
	tasks,
	sprintTasks: 2,
	sprintProjects: 1,
	sprintHours: 16,
	missingEstimates: 0,
	...overrides,
});
afterEach(cleanup);

describe("Development kanban board", () => {
	it("renders independent stage columns with only nonempty employee groups and preserves task order", () => {
		const openTask = vi.fn();
		render(
			<DevelopmentKanbanBoard
				stages={stages}
				lanes={[
					lane([
						task("11", { priority: 1 }),
						task("12", { priority: 2 }),
						task("13", { stageId: "work" }),
					]),
					lane([], {
						id: "51",
						name: "Сергей Иванов",
						sprintTasks: 0,
						sprintProjects: 0,
						sprintHours: 0,
					}),
				]}
				onOpenTask={openTask}
				now={now}
			/>,
		);
		expect(screen.getByLabelText("Спринт: 2 задачи")).toBeInTheDocument();
		expect(screen.getByLabelText("В работе: 1 задача")).toBeInTheDocument();
		const sprintColumn = screen.getByRole("region", {
			name: "Задачи стадии: Спринт",
		});
		const workColumn = screen.getByRole("region", {
			name: "Задачи стадии: В работе",
		});
		expect(sprintColumn).not.toBe(workColumn);
		expect(
			within(sprintColumn)
				.getAllByRole("button", { name: /Открыть задачу:/ })
				.map((button) => button.getAttribute("aria-label")),
		).toEqual(["Открыть задачу: Задача 11", "Открыть задачу: Задача 12"]);
		expect(
			within(workColumn).getByRole("button", {
				name: "Открыть задачу: Задача 13",
			}),
		).toBeInTheDocument();
		expect(screen.queryByText("Сергей Иванов")).not.toBeInTheDocument();
		expect(
			within(
				screen.getByRole("region", { name: "Задачи стадии: Выполнено" }),
			).getByText("Нет задач"),
		).toBeInTheDocument();
		fireEvent.click(
			screen.getByRole("button", { name: "Открыть задачу: Задача 12" }),
		);
		expect(openTask).toHaveBeenCalledWith("12");
	});

	it("renders every task even when an employee has more than sixteen in a stage", () => {
		const tasks = Array.from({ length: 19 }, (_, index) =>
			task(String(index + 1), { priority: index + 1 }),
		);
		render(
			<DevelopmentKanbanBoard
				stages={stages}
				lanes={[lane(tasks)]}
				onOpenTask={vi.fn()}
				now={now}
			/>,
		);
		const column = within(
			screen.getByRole("region", { name: "Задачи стадии: Спринт" }),
		);
		expect(
			column.getAllByRole("button", { name: /Открыть задачу:/ }),
		).toHaveLength(19);
		expect(
			column.getByRole("button", { name: "Открыть задачу: Задача 19" }),
		).toBeInTheDocument();
		expect(column.getByText("19 задач")).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: /Показать ещё/ }),
		).not.toBeInTheDocument();
	});

	it("calculates each employee group summary for its own stage", () => {
		render(
			<DevelopmentKanbanBoard
				stages={stages}
				lanes={[
					lane([
						task("11", { estimateHours: 2 }),
						task("12", { estimateHours: 3 }),
						task("13", {
							estimateHours: null,
							projectId: "78",
							projectTitle: "Митех",
						}),
						task("14", {
							stageId: "work",
							estimateHours: 100,
							projectId: "99",
						}),
					]),
				]}
				onOpenTask={vi.fn()}
				now={now}
			/>,
		);
		const sprintHeader = within(
			screen.getByRole("button", {
				name: "Свернуть задачи: Валерия Дмитриева · Спринт",
			}),
		);
		expect(sprintHeader.getByText("3 задачи")).toBeInTheDocument();
		expect(sprintHeader.getByText("2 проекта")).toBeInTheDocument();
		expect(sprintHeader.getByText("5 ч")).toBeInTheDocument();
		expect(sprintHeader.getByText("Без оценки: 1")).toBeInTheDocument();
		const workHeader = within(
			screen.getByRole("button", {
				name: "Свернуть задачи: Валерия Дмитриева · В работе",
			}),
		);
		expect(workHeader.getByText("1 задача")).toBeInTheDocument();
		expect(workHeader.getByText("100 ч")).toBeInTheDocument();
	});

	it("shows deadline and redline separately, with explicit today and overdue text", () => {
		render(
			<DevelopmentKanbanBoard
				stages={stages}
				lanes={[lane([task("11")])]}
				onOpenTask={vi.fn()}
				now={now}
			/>,
		);
		const card = within(
			screen.getByRole("button", { name: "Открыть задачу: Задача 11" }),
		);
		expect(card.getByText("Дедлайн")).toBeInTheDocument();
		expect(card.getByText("Редлайн")).toBeInTheDocument();
		expect(card.getByText(/сегодня/)).toHaveTextContent("01.10");
		expect(card.getByText(/просрочен/)).toHaveTextContent("30.09");
		expect(card.getByText("Оценка")).toBeInTheDocument();
		expect(card.getByText("8 ч")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Открыть задачу: Задача 11" }),
		).toHaveAccessibleDescription(/АО МРК.*Приор.*Оценка.*Дедлайн.*Редлайн/);
	});

	it("jumps to a stage and moves keyboard focus without resetting employee scroll positions", () => {
		render(
			<DevelopmentKanbanBoard
				stages={stages}
				lanes={[lane([task("11"), task("12", { stageId: "work" })])]}
				onOpenTask={vi.fn()}
				now={now}
			/>,
		);
		const viewport = screen.getByRole("region", {
			name: "Канбан задач разработки по стадиям",
		});
		const target = screen.getByRole("region", { name: "Стадия: В работе" });
		const employeeList = screen.getByRole("region", {
			name: "Задачи сотрудника: Валерия Дмитриева · В работе",
		});
		employeeList.scrollTop = 120;
		const scrollTo = vi.fn();
		Object.defineProperty(viewport, "scrollTo", {
			value: scrollTo,
			configurable: true,
		});
		vi.spyOn(target, "getBoundingClientRect").mockReturnValue({
			left: 1000,
		} as DOMRect);
		fireEvent.click(
			screen.getByRole("button", { name: "Перейти к стадии: В работе" }),
		);
		expect(target).toHaveFocus();
		expect(scrollTo).toHaveBeenCalledWith({ left: 1000, behavior: "auto" });
		expect(employeeList.scrollTop).toBe(120);
	});

	it("does not flag terminal-stage dates as overdue", () => {
		render(
			<DevelopmentKanbanBoard
				stages={stages}
				lanes={[
					lane([
						task("11", {
							stageId: "done",
							deadline: "2026-09-20",
							redline: "2026-09-21",
						}),
					]),
				]}
				onOpenTask={vi.fn()}
				now={now}
			/>,
		);
		const card = within(
			screen.getByRole("button", { name: "Открыть задачу: Задача 11" }),
		);
		expect(card.queryByText(/просрочен|сегодня/)).not.toBeInTheDocument();
		expect(card.getByText(/20.09/)).toBeInTheDocument();
		expect(card.getByText(/21.09/)).toBeInTheDocument();
	});

	it("shows explicit priority and estimates only, including missing and zero estimates", () => {
		render(
			<DevelopmentKanbanBoard
				stages={stages}
				lanes={[
					lane([
						task("11", { estimateHours: null, priority: null }),
						task("12", { estimateHours: 0, priority: 100, spentHours: 3.5 }),
					]),
				]}
				onOpenTask={vi.fn()}
				now={now}
			/>,
		);
		const unknown = within(
			screen.getByRole("button", { name: "Открыть задачу: Задача 11" }),
		);
		expect(unknown.getByText("Не задана")).toBeInTheDocument();
		expect(unknown.getByTitle("Приоритет не задан")).toHaveTextContent(
			"Приор. —",
		);
		const known = within(
			screen.getByRole("button", { name: "Открыть задачу: Задача 12" }),
		);
		expect(known.getByText("0 ч")).toBeInTheDocument();
		expect(known.getByText("Приор. 100")).toBeInTheDocument();
		expect(screen.queryByText(/Факт|Перерасход/)).not.toBeInTheDocument();
	});

	it("collapses an employee in one stage independently and preserves this during refresh", () => {
		const props = { stages, onOpenTask: vi.fn(), now };
		const tasks = [task("11"), task("13", { stageId: "work" })];
		const { rerender } = render(
			<DevelopmentKanbanBoard {...props} lanes={[lane(tasks)]} />,
		);
		fireEvent.click(
			screen.getByRole("button", {
				name: "Свернуть задачи: Валерия Дмитриева · Спринт",
			}),
		);
		expect(
			screen.getByRole("button", {
				name: "Развернуть задачи: Валерия Дмитриева · Спринт",
			}),
		).toHaveAttribute("aria-expanded", "false");
		expect(
			screen.getByRole("button", { name: "Открыть задачу: Задача 13" }),
		).toBeInTheDocument();
		rerender(
			<DevelopmentKanbanBoard
				{...props}
				lanes={[lane([...tasks, task("12")])]}
			/>,
		);
		expect(
			screen.queryByRole("button", { name: "Открыть задачу: Задача 12" }),
		).not.toBeInTheDocument();
		expect(screen.getByLabelText("Спринт: 2 задачи")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Открыть задачу: Задача 13" }),
		).toBeInTheDocument();
		fireEvent.click(
			screen.getByRole("button", {
				name: "Развернуть задачи: Валерия Дмитриева · Спринт",
			}),
		);
		expect(
			screen.getByRole("button", { name: "Открыть задачу: Задача 12" }),
		).toBeInTheDocument();
	});

	it("falls back to employee initials after a photo fails to load", () => {
		const { container } = render(
			<DevelopmentKanbanBoard
				stages={stages}
				lanes={[lane([task("11")], { photo: "/missing-photo.jpg" })]}
				onOpenTask={vi.fn()}
				now={now}
			/>,
		);
		const photo = container.querySelector("img");
		expect(photo).not.toBeNull();
		fireEvent.error(photo as HTMLImageElement);
		expect(container.querySelector("img")).toBeNull();
		expect(screen.getByText("ВД")).toBeInTheDocument();
	});
});
