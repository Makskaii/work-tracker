import { ReportCodes, TaskCodes } from "@/components/calendar/constants/const";
import type { TaskProps, User } from "@/shared/types/types";
import { toNumber } from "./profitabilityUtils";
import { getProjectTeamRole, type ProjectTeamRole } from "./projectTeam";
import type { ProfitabilityProject } from "./types";

export type ProjectTeamMember = {
	userId: string;
	name: string;
	position: string;
	role: ProjectTeamRole;
	totalHours: number;
	soldHours: number;
	planHours: number;
	factHours: number;
	taskIds: Set<string>;
};

const ROLE_ORDER: ProjectTeamRole[] = [
	"pm",
	"analytics",
	"development",
	"qa",
	"unknown",
];
const UNASSIGNED = "unassigned";
const userIdOf = (value: unknown) => {
	const id = String(value ?? "").trim();
	return /^\d+$/.test(id) && Number(id) > 0 ? id : UNASSIGNED;
};

export const buildTaskMap = (projects: ProfitabilityProject[]) =>
	new Map(
		projects
			.flatMap((project) => project.tasks)
			.map((task) => [String(task.id), task]),
	);

export const getTasksPlanHours = (
	taskIds: Set<string>,
	tasksById: Map<string, TaskProps>,
) =>
	Array.from(taskIds).reduce(
		(total, id) =>
			total + toNumber(tasksById.get(id)?.[TaskCodes.estimateTime]),
		0,
	);

export const getUniqueTasksPlanHours = (projects: ProfitabilityProject[]) => {
	const tasks = buildTaskMap(projects);
	return getTasksPlanHours(new Set(tasks.keys()), tasks);
};

export const buildTeamMembers = (
	projects: ProfitabilityProject[],
	users: User[],
): ProjectTeamMember[] => {
	const members = new Map<string, ProjectTeamMember>();
	const tasks = buildTaskMap(projects);
	const usersById = new Map(users.map((user) => [String(user.id), user]));
	const ensureMember = (id: string, fallbackRole?: ProjectTeamRole) => {
		const existing = members.get(id);
		if (existing) return existing;
		const user = usersById.get(id);
		const member: ProjectTeamMember = {
			userId: id,
			name:
				user?.title ?? (id === UNASSIGNED ? "Не назначен" : `Сотрудник #${id}`),
			position: user?.position ?? "Не указана",
			role:
				id === UNASSIGNED
					? "unknown"
					: (fallbackRole ?? getProjectTeamRole(user)),
			totalHours: 0,
			soldHours: 0,
			planHours: 0,
			factHours: 0,
			taskIds: new Set(),
		};
		members.set(id, member);
		return member;
	};

	// A task's budgets belong to its responsible employee once, even before the first report.
	for (const task of tasks.values()) {
		const member = ensureMember(userIdOf(task.assignedById));
		member.taskIds.add(String(task.id));
		member.planHours += toNumber(task[TaskCodes.estimateTime]);
		member.soldHours += toNumber(task[TaskCodes.hours]);
	}

	const reports = new Map(
		projects
			.flatMap((project) => project.reports)
			.map((report) => [String(report.id), report]),
	);
	for (const report of reports.values()) {
		const member = ensureMember(userIdOf(report.assignedById));
		const hours = toNumber(report[ReportCodes.timeSpent]);
		member.factHours += hours;
		member.totalHours += hours;
	}

	for (const project of projects) {
		const id = userIdOf(project.assignedById);
		if (id !== UNASSIGNED) ensureMember(id, "pm");
	}
	return Array.from(members.values()).sort(
		(a, b) =>
			ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role) ||
			a.name.localeCompare(b.name, "ru"),
	);
};
