import { describe, expect, it } from "vitest";
import { ReportCodes, TaskCodes } from "@/components/calendar/constants/const";
import type { ReportProps } from "@/components/calendar/types/types";
import type { TaskProps, User } from "@/shared/types/types";
import {
	buildTeamMembers,
	getUniqueTasksPlanHours,
} from "./projectTeamMetrics";
import type { ProfitabilityProject } from "./types";

const task = (id: string, assignedById: number, plan: string, sold: number) =>
	({
		id,
		assignedById,
		[TaskCodes.estimateTime]: plan,
		[TaskCodes.hours]: sold,
	}) as TaskProps;
const report = (id: string, assignedById: number, hours: string, taskId = 0) =>
	({
		id,
		assignedById,
		[ReportCodes.timeSpent]: hours,
		[ReportCodes.parentId]: taskId,
	}) as ReportProps;
const user = (id: string, position: string) =>
	({ id, title: `User ${id}`, position }) as User;
const project = (tasks: TaskProps[], reports: ReportProps[]) =>
	({
		id: "77",
		assignedById: 3,
		tasks,
		reports,
	}) as unknown as ProfitabilityProject;

describe("project team metrics", () => {
	it("includes agreed and planned task hours before any employee report exists", () => {
		const result = buildTeamMembers(
			[project([task("1", 13, "6,5", 8)], [])],
			[user("13", "Developer")],
		);
		expect(result.find((member) => member.userId === "13")).toMatchObject({
			planHours: 6.5,
			soldHours: 8,
			factHours: 0,
			totalHours: 0,
		});
	});
	it("counts each task budget once for its responsible employee and all actual work by its author", () => {
		const data = project(
			[task("1", 13, "20", 30), task("2", 11, "6", 8)],
			[report("1", 13, "8", 1), report("2", 22, "2", 1), report("3", 3, "1,5")],
		);
		const members = buildTeamMembers(
			[data],
			[user("13", "Developer"), user("22", "QA"), user("11", "Аналитик")],
		);
		expect(members.find((member) => member.userId === "13")).toMatchObject({
			planHours: 20,
			soldHours: 30,
			factHours: 8,
		});
		expect(members.find((member) => member.userId === "22")).toMatchObject({
			planHours: 0,
			soldHours: 0,
			factHours: 2,
		});
		expect(members.find((member) => member.userId === "11")).toMatchObject({
			planHours: 6,
			soldHours: 8,
			factHours: 0,
		});
		expect(members.reduce((sum, member) => sum + member.factHours, 0)).toBe(
			11.5,
		);
		expect(members.reduce((sum, member) => sum + member.soldHours, 0)).toBe(38);
		expect(members.reduce((sum, member) => sum + member.planHours, 0)).toBe(
			getUniqueTasksPlanHours([data]),
		);
	});
	it("does not lose hours for unassigned tasks or reports, and does not invent a user zero", () => {
		const members = buildTeamMembers(
			[project([task("1", 0, "4", 5)], [report("1", 0, "2")])],
			[],
		);
		expect(
			members.find((member) => member.userId === "unassigned"),
		).toMatchObject({
			name: "Не назначен",
			role: "unknown",
			planHours: 4,
			soldHours: 5,
			factHours: 2,
		});
		expect(members.some((member) => member.userId === "0")).toBe(false);
	});
	it("deduplicates task and report IDs when the same records appear in multiple input projects", () => {
		const data = project([task("1", 13, "20", 30)], [report("1", 13, "8", 1)]);
		const members = buildTeamMembers([data, data], [user("13", "Developer")]);
		expect(members.find((member) => member.userId === "13")).toMatchObject({
			planHours: 20,
			soldHours: 30,
			factHours: 8,
		});
		expect(getUniqueTasksPlanHours([data, data])).toBe(20);
	});
});
