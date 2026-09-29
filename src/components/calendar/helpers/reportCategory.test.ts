import { describe, expect, it } from "vitest";
import type { ProjectFromList } from "@/pages/ReportsPage/ReportsPage";
import type { ActivityListItem } from "@/pages/ReportsPage/types/types";
import { ClientsCodes } from "@/shared/constants/const";
import type { GroupedReportFields } from "@/shared/types/table";
import { ActivityType } from "../constants/const";
import {
	getInternalProjectIds,
	getReportCategory,
	getReportCategorySummary,
	isNotAtWorkReport,
} from "./reportCategory";

const makeReport = (
	overrides: Partial<GroupedReportFields> = {},
): GroupedReportFields => ({
	id: "1",
	title: "Описание работы",
	timeSpent: "2",
	taskId: "100",
	parentId: 100,
	day: "2026-09-29",
	project: 94,
	client: 4949,
	activity: ActivityType.development,
	assignedById: "12",
	stageId: "DT1060_15:PREPARATION",
	...overrides,
});

const makeProject = (id: string, companyId: string): ProjectFromList => ({
	id,
	title: `Проект ${id}`,
	[ClientsCodes.client]: companyId,
});

const makeActivity = (
	overrides: Partial<ActivityListItem>,
): ActivityListItem => ({
	ID: "269",
	IBLOCK_ID: "25",
	NAME: "Development",
	IBLOCK_SECTION_ID: null,
	CREATED_BY: "1",
	BP_PUBLISHED: "Y",
	CODE: null,
	SORT: "0",
	...overrides,
});

describe("report categories by project ownership", () => {
	const internalProjects = new Set([33, 49]);

	it("keeps unpaid and company-paid client work in Clients tasks", () => {
		for (const taskType of [393, 394, 395, 396, 397, 398]) {
			expect(
				getReportCategory(
					makeReport({ taskType, reportTaskType: taskType }),
					[makeActivity({ SORT: "1" })],
					internalProjects,
				),
			).toBe("client");
		}
	});

	it("classifies all work on an internal project as internal regardless of billing or activity", () => {
		expect(
			getReportCategory(
				makeReport({ project: 33, taskType: 393, reportTaskType: 396 }),
				[makeActivity({ SORT: "0" })],
				internalProjects,
			),
		).toBe("internal");
	});

	it("uses the current project relation and falls back to the legacy relation", () => {
		expect(
			getReportCategory(
				makeReport({ parentproject: 49 }),
				[],
				internalProjects,
			),
		).toBe("internal");
		expect(
			getReportCategory(
				makeReport({ parentproject: 94, project: 33 }),
				[],
				internalProjects,
			),
		).toBe("client");
		expect(
			getReportCategory(
				makeReport({ parentproject: 0, project: 33 }),
				[],
				internalProjects,
			),
		).toBe("internal");
	});

	it("counts absence separately on both internal and client projects", () => {
		for (const project of [33, 94]) {
			expect(
				getReportCategory(
					makeReport({ project, activity: ActivityType.notAtWork }),
					[],
					internalProjects,
				),
			).toBe("notAtWork");
		}
	});

	it("recognizes the configured absence activity by name or code without treating unpaid as absence", () => {
		const report = makeReport({ activity: 999 });
		expect(
			isNotAtWorkReport(report, [
				makeActivity({ ID: "999", NAME: "Not at work" }),
			]),
		).toBe(true);
		expect(
			isNotAtWorkReport(report, [
				makeActivity({ ID: "999", CODE: "not_at_work" }),
			]),
		).toBe(true);
		expect(
			isNotAtWorkReport(report, [
				makeActivity({ ID: "999", NAME: "Unpaid", SORT: "2" }),
			]),
		).toBe(false);
	});

	it("sums every report once and accepts decimal commas", () => {
		expect(
			getReportCategorySummary(
				[
					makeReport({ timeSpent: "2", reportTaskType: 397 }),
					makeReport({ project: 33, timeSpent: "1,5" }),
					makeReport({
						project: 33,
						activity: ActivityType.notAtWork,
						timeSpent: "3",
					}),
					makeReport({ timeSpent: "not a number" }),
				],
				[],
				internalProjects,
			),
		).toEqual({ client: 2, internal: 1.5, notAtWork: 3 });
	});

	it("resolves Evolution ownership using company IDs without confusing company and project namespaces", () => {
		const projects = [
			makeProject("33", "7401"),
			makeProject("50", "7404"),
			makeProject("94", "4949"),
			makeProject("7401", "4949"),
		];
		expect([...getInternalProjectIds(projects)]).toEqual([33, 50]);
	});

	it("recognizes exact configured company names but not a client's similarly named project", () => {
		const projects = [
			makeProject("100", "9999"),
			{ ...makeProject("101", "4949"), title: "Эволюция Work Tracker" },
			makeProject("102", "9998"),
		];
		expect([
			...getInternalProjectIds(projects, [
				{ ID: "9999", NAME: " Эволюция  Внутренние отчеты " },
				{ ID: "9998", NAME: "Эволюция клиента" },
			]),
		]).toEqual([100]);
	});
});
