import type { ProjectFromList } from "@/pages/ReportsPage/ReportsPage";
import type { ActivityListItem } from "@/pages/ReportsPage/types/types";
import { ClientsCodes } from "@/shared/constants/const";
import type { GroupedReportFields } from "@/shared/types/table";
import type { ClientListItems } from "@/shared/types/types";
import { ActivityType } from "../constants/const";

export type ReportCategory = "client" | "internal" | "notAtWork";

export const REPORT_CATEGORIES: readonly ReportCategory[] = [
	"client",
	"internal",
	"notAtWork",
];

export const REPORT_CATEGORY_TITLES: Record<ReportCategory, string> = {
	client: "Clients tasks",
	internal: "Internal tasks",
	notAtWork: "Not at work",
};

// Evolution's six company records in CRM, verified against project ownership.
// These are company IDs, not payment types or report activity IDs.
const INTERNAL_COMPANY_IDS = new Set([7401, 7402, 7403, 7404, 7405, 7406]);
const INTERNAL_COMPANY_NAMES = new Set(
	[
		"Эволюция",
		"Эволюция Work Tracker",
		"Эволюция Приложение для клиентов",
		"Эволюция Внутренние отчеты",
		"Вебсайт evolution-soft.ru",
		"Эволюция Другое",
		"Эволюция Встречи и планирование",
	].map((name) => name.toLocaleLowerCase("ru-RU")),
);
const EMPTY_INTERNAL_PROJECT_IDS: ReadonlySet<number> = new Set();

export const getInternalProjectIds = (
	projects: ProjectFromList[],
	clients: ClientListItems[] = [],
): Set<number> => {
	const companyIds = new Set(INTERNAL_COMPANY_IDS);

	for (const client of clients) {
		const name = (client.NAME || client.title || "")
			.trim()
			.replace(/\s+/g, " ")
			.toLocaleLowerCase("ru-RU");

		if (INTERNAL_COMPANY_NAMES.has(name)) {
			companyIds.add(Number(client.ID));
		}
	}

	return new Set(
		projects
			.filter((project) => companyIds.has(Number(project[ClientsCodes.client])))
			.map((project) => Number(project.id))
			.filter((id) => Number.isSafeInteger(id) && id > 0),
	);
};

export const isNotAtWorkReport = (
	report: Pick<GroupedReportFields, "activity">,
	activities: ActivityListItem[] = [],
): boolean => {
	const activityId = Number(report.activity);

	if (activityId === ActivityType.notAtWork) return true;

	const activity = activities.find((item) => Number(item.ID) === activityId);
	const activityLabel = `${activity?.NAME ?? ""} ${activity?.CODE ?? ""}`;

	return /\bnot[\s_-]*at[\s_-]*work\b/i.test(activityLabel);
};

export const getReportCategory = (
	report: GroupedReportFields,
	activities: ActivityListItem[] = [],
	internalProjectIds: ReadonlySet<number> = EMPTY_INTERNAL_PROJECT_IDS,
): ReportCategory => {
	if (isNotAtWorkReport(report, activities)) return "notAtWork";

	const projectId = Number(report.parentproject || report.project);
	return internalProjectIds.has(projectId) ? "internal" : "client";
};

export const getReportCategorySummary = (
	reports: GroupedReportFields[] = [],
	activities: ActivityListItem[] = [],
	internalProjectIds: ReadonlySet<number> = EMPTY_INTERNAL_PROJECT_IDS,
): Record<ReportCategory, number> => {
	const summary: Record<ReportCategory, number> = {
		client: 0,
		internal: 0,
		notAtWork: 0,
	};

	for (const report of reports) {
		const hours = Number(String(report.timeSpent).trim().replace(",", "."));
		if (!Number.isFinite(hours) || hours < 0) continue;

		summary[getReportCategory(report, activities, internalProjectIds)] += hours;
	}

	return summary;
};
