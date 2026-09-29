import type { ProjectFromList } from "../../../ReportsPage";
import type { GroupedReportFields } from "@/shared/types/table";
import { parseTimeSpent } from "./utils";

export type ReportProject = {
	key: string;
	title: string;
	hours: number;
	reports: GroupedReportFields[];
};

export const groupReportsByProject = (
	reports: GroupedReportFields[],
	projects: ProjectFromList[],
): ReportProject[] => {
	const titles = new Map(
		projects.map((project) => [
			Number(project.id),
			project.title || project.name,
		]),
	);
	const groups = new Map<string, ReportProject>();
	for (const report of reports) {
		const projectId = Number(report.parentproject || report.project || 0);
		const key = String(projectId);
		const group = groups.get(key) ?? {
			key,
			title: projectId
				? titles.get(projectId) || `Проект #${projectId}`
				: "Без проекта",
			hours: 0,
			reports: [],
		};
		group.hours += parseTimeSpent(report.timeSpent);
		group.reports.push(report);
		groups.set(key, group);
	}
	return Array.from(groups.values())
		.map((group) => ({
			...group,
			reports: group.reports.toSorted(
				(a, b) => new Date(b.day).getTime() - new Date(a.day).getTime(),
			),
		}))
		.sort((a, b) => b.hours - a.hours || a.title.localeCompare(b.title, "ru"));
};
