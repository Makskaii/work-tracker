import type {
	SupportProjectWorkspace,
	SupportWorkspaceReport,
} from "./supportWorkspace.api";
import type { SupportHoursReportItem } from "./supportReportEntries";

export type SupportWorklistTab =
	| "allocated"
	| "unallocated"
	| "excluded"
	| "tasks";
const toWorklistReport = (
	report: SupportWorkspaceReport,
	scope: "unallocated" | "excluded",
	projectTitle: string,
): SupportHoursReportItem => ({
	id: report.id,
	taskId: report.taskId,
	taskTitle: report.taskTitle,
	responsibleName: report.responsibleName,
	companyName: null,
	projectTitle,
	activityTitle: null,
	date: report.date,
	hours: scope === "unallocated" ? report.unallocatedHours : report.hours,
	totalHours: report.hours,
	hourScope: scope,
	includeInPackage: report.includeInPackage,
	title: report.title,
	description: report.description,
	allocations: report.allocations,
});
const newestFirst = (reports: SupportHoursReportItem[]) =>
	reports.toSorted((first, second) => second.date.localeCompare(first.date));
export const buildSupportWorkspaceLists = (
	workspace: SupportProjectWorkspace,
	projectTitle: string,
) => {
	const tasksWithReports = new Set(
		workspace.reports.flatMap((report) =>
			report.taskId ? [report.taskId] : [],
		),
	);
	return {
		unallocated: newestFirst(
			workspace.reports
				.filter(
					(report) => report.includeInPackage && report.unallocatedHours > 0,
				)
				.map((report) => toWorklistReport(report, "unallocated", projectTitle)),
		),
		excluded: newestFirst(
			workspace.reports
				.filter((report) => !report.includeInPackage)
				.map((report) => toWorklistReport(report, "excluded", projectTitle)),
		),
		tasks: workspace.tasks.filter((task) => !tasksWithReports.has(task.id)),
	};
};
