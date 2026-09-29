import { describe, expect, it } from "vitest";
import { ClientsCodes } from "@/shared/constants/const";
import type { GroupedReportFields } from "@/shared/types/table";
import { groupReportsByProject } from "./groupReportsByProject";

const report = (
	changes: Partial<GroupedReportFields>,
): GroupedReportFields => ({
	id: "1",
	title: "Описание",
	timeSpent: "2",
	taskId: "1",
	parentId: 1,
	day: "2026-09-29",
	project: 33,
	client: 7401,
	activity: 269,
	assignedById: "1",
	stageId: "DT1060_15:PREPARATION",
	...changes,
});

describe("groupReportsByProject", () => {
	it("groups by project even with stale/missing report client and keeps all billing types", () => {
		const reports = [
			report({ reportTaskType: 396 }),
			report({ id: "2", client: 0, reportTaskType: 397 }),
			report({ id: "3", client: 9000, reportTaskType: null }),
		];
		const groups = groupReportsByProject(reports, [
			{ id: "33", title: "Work Tracker", [ClientsCodes.client]: "7401" },
		]);
		expect(groups).toHaveLength(1);
		expect(groups[0]).toMatchObject({ title: "Work Tracker", hours: 6 });
		expect(groups[0].reports).toHaveLength(3);
	});
	it("retains absences without a project and unknown project reports", () => {
		const groups = groupReportsByProject(
			[
				report({ project: 0, activity: 404, timeSpent: "8" }),
				report({ id: "2", project: 99, timeSpent: "1,5" }),
			],
			[],
		);
		expect(groups.map(({ title, hours }) => ({ title, hours }))).toEqual([
			{ title: "Без проекта", hours: 8 },
			{ title: "Проект #99", hours: 1.5 },
		]);
	});
	it("does not confuse company IDs with project IDs and uses actual parent project", () => {
		const groups = groupReportsByProject(
			[report({ parentproject: 44 })],
			[{ id: "33", title: "Other project", [ClientsCodes.client]: "44" }],
		);
		expect(groups[0].title).toBe("Проект #44");
	});
});
