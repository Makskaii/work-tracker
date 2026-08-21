import { describe, expect, it } from "vitest";
import {
	buildDevelopmentReport,
	isSignificantDevelopmentDeviation,
	parseDevelopmentHours,
	type DevelopmentReportInput,
	type DevelopmentTaskInput,
} from "./developmentReport";

const developers = [
	{ id: "1", title: "Иван" },
	{ id: "2", title: "Пётр" },
];
const projects = [{ id: "10", title: "Проект А" }];

const makeTask = (
	id: string,
	planHours: unknown,
	overrides: Partial<DevelopmentTaskInput> = {},
): DevelopmentTaskInput => ({
	id,
	title: `Задача ${id}`,
	ownerId: "1",
	projectId: "10",
	planHours,
	budgetHours: 0,
	...overrides,
});

const makeReport = (
	id: string,
	taskId: string,
	hours: unknown,
	overrides: Partial<DevelopmentReportInput> = {},
): DevelopmentReportInput => ({
	id,
	parentTaskId: taskId,
	legacyTaskId: "",
	employeeId: "1",
	hours,
	isConfirmed: true,
	isDevelopment: true,
	isDepartmentEmployee: true,
	...overrides,
});

describe("developmentReport", () => {
	it("нормализует часы и отбрасывает некорректные значения", () => {
		expect(parseDevelopmentHours("1,5")).toBe(1.5);
		expect(parseDevelopmentHours(" 1 234,5 ")).toBe(1234.5);
		expect(parseDevelopmentHours(2.25)).toBe(2.25);
		expect(parseDevelopmentHours(0)).toBe(0);
		expect(parseDevelopmentHours(-1)).toBe(0);
		expect(parseDevelopmentHours("не число")).toBe(0);
	});

	it("применяет одновременно абсолютный и относительный пороги", () => {
		expect(
			isSignificantDevelopmentDeviation({
				deltaHours: 4,
				deltaPercent: 40,
			}),
		).toBe(true);
		expect(
			isSignificantDevelopmentDeviation({
				deltaHours: 29,
				deltaPercent: 29,
			}),
		).toBe(false);
		expect(
			isSignificantDevelopmentDeviation({
				deltaHours: 3,
				deltaPercent: 60,
			}),
		).toBe(false);
	});

	it("не даёт экономии одной задачи скрыть перерасход другой", () => {
		const result = buildDevelopmentReport({
			tasks: [makeTask("1", 10), makeTask("2", 10)],
			reports: [makeReport("r1", "1", 16), makeReport("r2", "2", 4)],
			developers,
			projects,
		});

		expect(result.summary.biasPercent).toBe(0);
		expect(result.summary.wapePercent).toBe(60);
		expect(result.summary.positiveOverrunHours).toBe(6);
		expect(result.summary.significantOverruns).toBe(1);
		expect(result.summary.significantUnderruns).toBe(1);
	});

	it("считает критическое отклонение и не называет задачу без оценки перерасходом", () => {
		const result = buildDevelopmentReport({
			tasks: [makeTask("1", 10), makeTask("2", 0)],
			reports: [makeReport("r1", "1", 18), makeReport("r2", "2", 5)],
			developers,
			projects,
		});

		expect(result.tasks[0]?.isCriticalDeviation).toBe(true);
		expect(result.tasks[1]?.isComparable).toBe(false);
		expect(result.tasks[1]?.isSignificantOverrun).toBe(false);
		expect(result.summary.tasksWithoutEstimate).toBe(1);
	});

	it("требует разбора при критической переоценке, а не даёт positive fallback", () => {
		const result = buildDevelopmentReport({
			tasks: [makeTask("1", 100)],
			reports: [makeReport("r1", "1", 10)],
			developers,
			projects,
		});

		expect(result.summary.significantUnderruns).toBe(1);
		expect(result.actions.some((action) => action.tone === "attention")).toBe(
			true,
		);
		expect(result.actions.some((action) => action.title.includes("отклонения"))).toBe(
			true,
		);
	});

	it("сохраняет совместную задачу в проекте, но исключает из персональной точности", () => {
		const result = buildDevelopmentReport({
			tasks: [makeTask("1", 10)],
			reports: [
				makeReport("r1", "1", 6),
				makeReport("r2", "1", 6, { employeeId: "2" }),
			],
			developers,
			projects,
		});

		expect(result.summary.actualHours).toBe(12);
		expect(result.projects[0]?.actualHours).toBe(12);
		expect(result.employees.find((employee) => employee.id === "1")?.loggedHours).toBe(6);
		expect(
			result.employees.find((employee) => employee.id === "1")
				?.personalSampleTasks,
		).toBe(0);
		expect(result.quality.multiContributorTasks).toBe(1);
	});

	it("исключает из персональной выборки задачу при несовпадении автора и ответственного", () => {
		const result = buildDevelopmentReport({
			tasks: [makeTask("1", 10)],
			reports: [makeReport("r1", "1", 12, { employeeId: "2" })],
			developers,
			projects,
		});

		expect(result.tasks[0]?.attributionIssue).toBe("owner_mismatch");
		expect(result.quality.ownerMismatchTasks).toBe(1);
		expect(
			result.employees.find((employee) => employee.id === "1")
				?.personalSampleTasks,
		).toBe(0);
	});

	it("дедуплицирует отчёты и предпочитает каноническую parent-связь", () => {
		const result = buildDevelopmentReport({
			tasks: [makeTask("1", 10), makeTask("2", 10)],
			reports: [
				makeReport("r1", "1", 5),
				makeReport("r1", "1", 99),
				makeReport("r2", "1", 7, { legacyTaskId: "2" }),
				makeReport("r3", "", 3, {
					parentTaskId: "",
					legacyTaskId: "1",
				}),
			],
			developers,
			projects,
		});

		expect(result.tasks.find((task) => task.id === "1")?.factHours).toBe(15);
		expect(result.quality.duplicateReports).toBe(1);
		expect(result.quality.relationConflicts).toBe(1);
	});

	it("игнорирует неподтверждённые отчёты и не-разработку", () => {
		const result = buildDevelopmentReport({
			tasks: [makeTask("1", 10)],
			reports: [
				makeReport("r1", "1", 4, { isConfirmed: false }),
				makeReport("r2", "1", 3, { isDevelopment: false }),
				makeReport("r3", "1", 2),
			],
			developers,
			projects,
		});

		expect(result.tasks[0]?.factHours).toBe(2);
		expect(result.tasks[0]?.pendingHours).toBe(4);
		expect(result.tasks[0]?.isComparable).toBe(false);
		expect(result.quality.ignoredUnconfirmedReports).toBe(1);
		expect(result.quality.ignoredNonDevelopmentReports).toBe(1);
	});

	it("не включает часы сотрудников вне текущего состава отдела", () => {
		const result = buildDevelopmentReport({
			tasks: [makeTask("1", 10)],
			reports: [
				makeReport("r1", "1", 4),
				makeReport("r2", "1", 20, { isDepartmentEmployee: false }),
			],
			developers,
			projects,
		});

		expect(result.tasks[0]?.factHours).toBe(4);
		expect(result.tasks[0]?.outsideDepartmentHours).toBe(20);
		expect(result.tasks[0]?.isComparable).toBe(false);
		expect(result.quality.ignoredOutsideDepartmentReports).toBe(1);
	});

	it("даёт повторяемый сигнал только при достаточной персональной выборке", () => {
		const result = buildDevelopmentReport({
			tasks: [
				makeTask("1", 10),
				makeTask("2", 10),
				makeTask("3", 10),
			],
			reports: [
				makeReport("r1", "1", 16),
				makeReport("r2", "2", 16),
				makeReport("r3", "3", 10),
			],
			developers,
			projects,
		});

		expect(result.employees[0]?.signal).toBe("repeated_signal");
	});

	it("считает 60% персонального покрытия достаточным, а 40% — нет", () => {
		const tasks = Array.from({ length: 5 }, (_, index) =>
			makeTask(String(index + 1), 10),
		);
		const reportsAtSixty = [
			makeReport("r1", "1", 10),
			makeReport("r2", "2", 10),
			makeReport("r3", "3", 10),
		];
		const reportsAtForty = reportsAtSixty.slice(0, 2);
		const resultAtSixty = buildDevelopmentReport({
			tasks,
			reports: reportsAtSixty,
			developers,
			projects,
		});
		const resultAtForty = buildDevelopmentReport({
			tasks,
			reports: reportsAtForty,
			developers,
			projects,
		});

		expect(resultAtSixty.employees[0]?.personalCoveragePercent).toBe(60);
		expect(resultAtSixty.employees[0]?.signal).toBe("stable_sample");
		expect(resultAtForty.employees[0]?.personalCoveragePercent).toBe(40);
		expect(resultAtForty.employees[0]?.signal).toBe("insufficient_data");
	});
});
