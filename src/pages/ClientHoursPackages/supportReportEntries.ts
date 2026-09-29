import type { SupportProjectTask } from "./clientHoursPackages.api";
import type { PackagePurchase } from "./clientHoursPackages.types";

export type SupportHoursReportItem = {
	id: string;
	taskId: string | null;
	taskTitle: string | null;
	responsibleName: string | null;
	companyName: string | null;
	projectTitle: string | null;
	activityTitle: string | null;
	date: string;
	hours: number;
	totalHours?: number;
	hourScope?: "allocated" | "unallocated" | "excluded";
	includeInPackage?: boolean;
	title: string | null;
	description: string | null;
	allocations: { purchaseId: number; purchaseDate: string; hours: number }[];
};

export type SupportReportEntry =
	| { kind: "report"; id: string; report: SupportHoursReportItem }
	| {
			kind: "task";
			id: string;
			title: string;
			stageId: string | null;
			hours: number;
			reports: SupportHoursReportItem[];
	  };
export type TaskStatusFilter = "all" | "open" | "closed";

const CLOSED_TASK_STAGE_IDS = new Set([
	"DT1072_18:UC_6JNSDG",
	"DT1072_18:UC_JP9WR1",
]);

export const collectSupportReports = (purchases: PackagePurchase[]) => {
	const reports = new Map<string, SupportHoursReportItem>();
	for (const purchase of purchases) {
		for (const consumption of purchase.consumptions) {
			const report = consumption.report;
			const current = reports.get(report.bitrixReportId);
			reports.set(report.bitrixReportId, {
				id: report.bitrixReportId,
				taskId: report.bitrixTaskId,
				taskTitle: report.taskTitle,
				responsibleName: report.responsibleName,
				companyName: report.companyName,
				projectTitle: report.projectTitle,
				activityTitle: report.activityTitle,
				date: report.reportDate,
				hours: (current?.hours ?? 0) + consumption.hours,
				title: report.reportTitle,
				description: report.reportDescription,
				allocations: [
					...(current?.allocations ?? []),
					{
						purchaseId: purchase.id,
						purchaseDate: purchase.date,
						hours: consumption.hours,
					},
				],
			});
		}
	}
	return Array.from(reports.values()).toSorted(
		(first, second) =>
			new Date(second.date).getTime() - new Date(first.date).getTime(),
	);
};

export const collectSupportEntries = (
	reports: SupportHoursReportItem[],
	projectTasks: SupportProjectTask[],
): SupportReportEntry[] => {
	const taskDetails = new Map(projectTasks.map((task) => [task.id, task]));
	const entries: SupportReportEntry[] = [];
	const groups = new Map<
		string,
		Extract<SupportReportEntry, { kind: "task" }>
	>();
	for (const report of reports) {
		if (!report.taskId) {
			entries.push({ kind: "report", id: report.id, report });
			continue;
		}
		let group = groups.get(report.taskId);
		if (!group) {
			const task = taskDetails.get(report.taskId);
			group = {
				kind: "task",
				id: report.taskId,
				title: task?.title || report.taskTitle || `Задача #${report.taskId}`,
				stageId: task?.stageId ?? null,
				hours: 0,
				reports: [],
			};
			groups.set(report.taskId, group);
			entries.push(group);
		}
		group.reports.push(report);
		group.hours += report.hours;
	}
	return entries;
};

export const matchesSupportEntry = (
	entry: SupportReportEntry,
	query: string,
	status: TaskStatusFilter,
) => {
	const normalizedQuery = query.trim().toLocaleLowerCase("ru");
	const reports = entry.kind === "report" ? [entry.report] : entry.reports;
	const searchable = [
		entry.kind === "task" ? entry.title : "",
		...reports.flatMap((report) => [report.title, report.description]),
	];
	const matchesQuery =
		!normalizedQuery ||
		searchable.some((value) =>
			value?.toLocaleLowerCase("ru").includes(normalizedQuery),
		);
	// A standalone report has no task status, so status filters do not hide it.
	if (entry.kind === "report") return matchesQuery;
	const isClosed = CLOSED_TASK_STAGE_IDS.has(entry.stageId ?? "");
	return (
		matchesQuery &&
		(status === "all" || (status === "closed" ? isClosed : !isClosed))
	);
};
