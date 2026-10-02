import { describe, expect, it } from "vitest";
import {
	buildKanbanLanes,
	formatKanbanDate,
	getDeadlineState,
	getSprintStatistics,
	type KanbanPerson,
	type KanbanTask,
	sortKanbanTasks,
	UNASSIGNED_LANE_ID,
} from "./model";

const sprintStageId = "DT1072_18:PREPARATION";
const now = new Date("2026-10-01T12:00:00+03:00");
const person = (
	id: string,
	name: string,
	overrides: Partial<KanbanPerson> = {},
): KanbanPerson => ({
	id,
	name,
	active: true,
	developer: true,
	...overrides,
});
const task = (id: string, overrides: Partial<KanbanTask> = {}): KanbanTask => ({
	id,
	title: `Работа ${id}`,
	assigneeId: "1",
	stageId: sprintStageId,
	projectId: "77",
	projectTitle: "Проект",
	priority: null,
	estimateHours: null,
	spentHours: 0,
	deadline: null,
	...overrides,
});

describe("sortKanbanTasks", () => {
	it("uses numeric lower-first priorities, leaving missing and invalid values last", () => {
		const tasks = [
			task("5"),
			task("4", { priority: 250 }),
			task("3", { priority: 100 }),
			task("2", { priority: 10 }),
			task("1", { priority: 0 }),
			task("6", { priority: Number.NaN }),
		];
		expect(sortKanbanTasks(tasks).map((item) => item.id)).toEqual([
			"1",
			"2",
			"3",
			"4",
			"5",
			"6",
		]);
		expect(tasks.map((item) => item.id)).toEqual([
			"5",
			"4",
			"3",
			"2",
			"1",
			"6",
		]);
	});

	it("breaks equal-priority ties by the earliest deadline/redline, then numeric id", () => {
		const tasks = [
			task("20", { priority: 10 }),
			task("100", { priority: 10, deadline: "2026-10-03" }),
			task("10", { priority: 10, deadline: "2026-10-03" }),
			task("2", {
				priority: 10,
				deadline: "2026-10-15",
				redline: "2026-10-01",
			}),
			task("1", { priority: 10, deadline: "invalid" }),
		];
		expect(sortKanbanTasks(tasks).map((item) => item.id)).toEqual([
			"2",
			"10",
			"100",
			"1",
			"20",
		]);
		expect(
			sortKanbanTasks([...tasks].reverse()).map((item) => item.id),
		).toEqual(["2", "10", "100", "1", "20"]);
	});

	it("deduplicates task ids and compares large numeric ids without precision loss", () => {
		const duplicate = task("1", { priority: 1 });
		expect(
			sortKanbanTasks([
				task("9007199254740993"),
				task("9007199254740992"),
				duplicate,
				duplicate,
			]).map((item) => item.id),
		).toEqual(["1", "9007199254740992", "9007199254740993"]);
	});
});

describe("calendar deadlines in Moscow", () => {
	it("treats today as today until the Moscow calendar day ends", () => {
		expect(
			getDeadlineState("2026-10-01", new Date("2026-10-01T20:59:59Z")),
		).toBe("today");
		expect(
			getDeadlineState("2026-10-01", new Date("2026-10-01T21:00:00Z")),
		).toBe("overdue");
		expect(getDeadlineState("2026-10-02", now)).toBe("upcoming");
	});

	it("converts offset timestamps to Moscow, preserving date-only values", () => {
		expect(getDeadlineState("2026-09-30T23:30:00Z", now)).toBe("today");
		expect(formatKanbanDate("2026-09-30T23:30:00Z")).toBe("01.10");
		expect(formatKanbanDate("2026-10-01")).toBe("01.10");
		expect(getDeadlineState("2026-10-02T00:30:00+05:00", now)).toBe("today");
	});

	it.each([
		null,
		"",
		" ",
		"invalid",
		"2026-02-29",
		"2026-02-30",
		"2026-13-01",
		"2026-10-01T00:00:00",
		"2026-10-01T25:00:00Z",
		"2026-02-30T10:00:00Z",
	])("rejects empty or invalid deadline %s instead of inventing a date", (value) => {
		expect(getDeadlineState(value, now)).toBe("none");
		expect(formatKanbanDate(value)).toBe("—");
	});

	it("supports leap days and does not exempt weekends from card deadlines", () => {
		expect(formatKanbanDate("2028-02-29")).toBe("29.02");
		expect(
			getDeadlineState("2026-10-03", new Date("2026-10-04T12:00:00+03:00")),
		).toBe("overdue");
		expect(getDeadlineState("2026-10-01", new Date("invalid"))).toBe("none");
	});
});

describe("buildKanbanLanes", () => {
	it("keeps all active developers with zero load and keeps other/inactive people only with visible tasks", () => {
		const people = [
			person("1", "Борис"),
			person("2", "Анна"),
			person("3", "Архивный", { active: false }),
			person("4", "Аналитик", { developer: false }),
			person("5", "Архив без работы", { active: false }),
			person("6", "Аналитик без работы", { developer: false }),
		];
		const lanes = buildKanbanLanes(
			[task("1", { assigneeId: "3" }), task("2", { assigneeId: "4" })],
			people,
			{ sprintStageId },
		);
		expect(lanes.map((lane) => lane.name)).toEqual([
			"Аналитик",
			"Анна",
			"Архивный",
			"Борис",
		]);
		expect(lanes.find((lane) => lane.id === "2")).toMatchObject({
			tasks: [],
			sprintTasks: 0,
			sprintProjects: 0,
			sprintHours: 0,
			missingEstimates: 0,
		});
	});

	it("retains more than one REST page of cards, including unknown and unassigned employees", () => {
		const tasks = Array.from({ length: 63 }, (_, i) =>
			task(String(i + 1), {
				assigneeId: i < 50 ? "1" : i < 60 ? "999" : null,
			}),
		);
		const lanes = buildKanbanLanes(
			[...tasks, tasks[0]],
			[person("1", "Анна")],
			{ sprintStageId },
		);
		expect(lanes.reduce((count, lane) => count + lane.tasks.length, 0)).toBe(
			63,
		);
		expect(lanes.find((lane) => lane.id === "999")).toMatchObject({
			name: "Сотрудник #999",
			sprintTasks: 10,
		});
		expect(lanes.at(-1)).toMatchObject({
			id: UNASSIGNED_LANE_ID,
			name: "Без ответственного",
			sprintTasks: 3,
		});
	});

	it("computes full sprint workload despite text and overdue display filters", () => {
		const tasks = [
			task("1", {
				title: "Исправить баг",
				deadline: "2026-09-30",
				estimateHours: 5,
				spentHours: 2,
			}),
			task("2", {
				title: "Настроить интеграцию",
				deadline: "2026-10-03",
				estimateHours: 7,
				projectId: "98",
			}),
			task("3", { stageId: "DT1072_18:CLIENT", estimateHours: 100 }),
		];
		const [lane] = buildKanbanLanes(tasks, [person("1", "Анна")], {
			sprintStageId,
			query: "БАГ",
			onlyOverdue: true,
			now,
		});
		expect(lane.tasks.map((item) => item.id)).toEqual(["1"]);
		expect(lane).toMatchObject({
			sprintTasks: 2,
			sprintProjects: 2,
			sprintHours: 12,
			missingEstimates: 0,
		});
	});

	it("applies project and employee scope to workload and ignores missing projects in the project count", () => {
		const tasks = [
			task("1", { estimateHours: 5 }),
			task("2", { estimateHours: 7, projectId: "98" }),
			task("3", { estimateHours: 2, assigneeId: "2" }),
			task("4", { estimateHours: null, projectId: null }),
			task("5", { estimateHours: 0, projectId: "" }),
		];
		const [scoped] = buildKanbanLanes(
			tasks,
			[person("1", "Анна"), person("2", "Борис")],
			{ sprintStageId, employeeId: "1", projectId: "77" },
		);
		expect(scoped).toMatchObject({
			id: "1",
			sprintTasks: 1,
			sprintProjects: 1,
			sprintHours: 5,
		});
		const [all] = buildKanbanLanes(tasks, [person("1", "Анна")], {
			sprintStageId,
		});
		expect(all).toMatchObject({
			sprintTasks: 4,
			sprintProjects: 2,
			sprintHours: 12,
			missingEstimates: 1,
		});
	});

	it("filters overdue redlines even with a future deadline and keeps any current task stage", () => {
		const tasks = [
			task("1", {
				deadline: "2026-10-10",
				redline: "2026-09-30",
				stageId: "DT1072_18:UC_5GG9S1",
			}),
			task("2", { deadline: "2026-10-01", redline: "2026-10-01" }),
			task("3", { deadline: "2026-09-30", redline: null }),
		];
		const [lane] = buildKanbanLanes(tasks, [person("1", "Анна")], {
			sprintStageId,
			onlyOverdue: true,
			now,
		});
		expect(lane.tasks.map((item) => item.id)).toEqual(["1", "3"]);
		expect(lane.sprintTasks).toBe(2);
	});

	it("does not retain inactive/unknown lanes with no cards after a display filter", () => {
		const lanes = buildKanbanLanes(
			[
				task("1", { assigneeId: "9" }),
				task("2", { assigneeId: "3" }),
				task("3", { assigneeId: null }),
			],
			[person("1", "Анна"), person("3", "Архив", { active: false })],
			{ sprintStageId, query: "нет совпадений" },
		);
		expect(lanes.map((lane) => lane.id)).toEqual(["1"]);
	});
});

describe("sprint statistics", () => {
	it("distinguishes no estimates from explicitly zero estimates without subtracting actuals", () => {
		expect(
			getSprintStatistics(
				[task("1"), task("2", { estimateHours: Number.NaN })],
				sprintStageId,
			),
		).toMatchObject({ sprintTasks: 2, sprintHours: null, missingEstimates: 2 });
		expect(
			getSprintStatistics(
				[
					task("1", { estimateHours: 0, spentHours: 4 }),
					task("2", { estimateHours: 10, spentHours: 8 }),
					task("3"),
				],
				sprintStageId,
			),
		).toMatchObject({ sprintHours: 10, missingEstimates: 1 });
	});

	it("does not double count duplicate tasks or binary decimal rounding artifacts", () => {
		const first = task("1", { estimateHours: 0.1 });
		expect(
			getSprintStatistics(
				[first, first, task("2", { estimateHours: 0.2 })],
				sprintStageId,
			),
		).toMatchObject({ sprintTasks: 2, sprintProjects: 1, sprintHours: 0.3 });
	});
});
