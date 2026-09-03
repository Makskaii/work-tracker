import { DEPARTMENT_IDS } from "@/shared/constants/const";
import type { User } from "@/shared/types/types";
import type { ReportProject } from "./types";

export type ProjectTeamRole = "pm" | "analytics" | "development" | "qa" | "unknown";

export const PROJECT_TEAM_ROLE_LABELS: Record<ProjectTeamRole, string> = {
	pm: "Руководители",
	analytics: "Аналитика",
	development: "Разработка",
	qa: "QA",
	unknown: "Другое",
};

export const getProjectMemberIds = (project: ReportProject) =>
	[project.responsibleId, project.analystId, project.developmentTeamIds, project.qaId]
		.flatMap((value) => String(value ?? "").split(","))
		.map((value) => value.trim())
		.filter(Boolean);

export const getProjectTeamRole = (user?: User): ProjectTeamRole => {
	const position = String(user?.position ?? "").toLowerCase();
	const title = String(user?.title ?? "").toLowerCase();
	const searchable = `${position} ${title}`;

	if (
		searchable.includes("pm") ||
		searchable.includes("project manager") ||
		searchable.includes("руководитель") ||
		searchable.includes("владелец проекта")
	) return "pm";

	if (
		user?.department === DEPARTMENT_IDS.ANALYTICS ||
		searchable.includes("analyst") ||
		searchable.includes("ba") ||
		searchable.includes("аналит")
	) return "analytics";

	if (
		searchable.includes("qa") ||
		searchable.includes("test") ||
		searchable.includes("tester") ||
		searchable.includes("тест")
	) return "qa";

	if (
		user?.department === DEPARTMENT_IDS.DEV ||
		searchable.includes("backend") ||
		searchable.includes("frontend") ||
		searchable.includes("developer") ||
		searchable.includes("dev") ||
		searchable.includes("разработ")
	) return "development";

	return "unknown";
};
