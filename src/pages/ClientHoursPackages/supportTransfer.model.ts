import type { SupportHoursReportItem } from "./supportReportEntries";
import type { SupportProjectWorkspace } from "./supportWorkspace.api";

export type SupportTransferDraft = {
	projectId: number;
	fromPurchaseId: number | null;
	toPurchaseId: number | null;
	items: { reportId: string; hours: number }[];
	taskId?: string;
};

export const getTransferReports = (
	workspace: SupportProjectWorkspace,
	projectTitle: string,
	purchaseId: number | null,
): SupportHoursReportItem[] => {
	const taskLocations = new Map(
		workspace.tasks.map((task) => [task.id, task.purchaseId ?? null]),
	);
	const zeroHourReportsHere = new Set(
		workspace.reports
			.filter(
				(report) =>
					report.hours === 0 &&
					(report.taskId
						? (taskLocations.get(report.taskId) ?? null)
						: null) === purchaseId,
			)
			.map((report) => report.id),
	);
	return workspace.reports
		.map((report): SupportHoursReportItem => {
			const available =
				purchaseId === null
					? report.includeInPackage
						? report.unallocatedHours
						: report.hours
					: report.allocations
							.filter((part) => part.purchaseId === purchaseId)
							.reduce((sum, part) => sum + part.hours, 0);
			return {
				id: report.id,
				taskId: report.taskId,
				taskTitle: report.taskTitle,
				responsibleName: report.responsibleName,
				companyName: report.companyName ?? null,
				activityTitle: report.activityTitle ?? null,
				projectTitle,
				date: report.date,
				hours: Math.round(available * 100) / 100,
				totalHours: report.hours,
				hourScope:
					purchaseId !== null
						? "allocated"
						: report.includeInPackage
							? "unallocated"
							: "excluded",
				includeInPackage: report.includeInPackage,
				title: report.title,
				description: report.description,
				allocations: report.allocations,
			};
		})
		.filter((report) => report.hours > 0 || zeroHourReportsHere.has(report.id))
		.toSorted(
			(first, second) =>
				second.date.localeCompare(first.date) ||
				first.id.localeCompare(second.id, undefined, { numeric: true }),
		);
};

export const getTasksWithoutReports = (workspace: SupportProjectWorkspace) => {
	const tasksWithReports = new Set(
		workspace.reports.map((report) => report.taskId).filter(Boolean),
	);
	return workspace.tasks.filter((task) => !tasksWithReports.has(task.id));
};

export const validateTransferHours = (
	reports: SupportHoursReportItem[],
	values: Record<string, string>,
) => {
	const errors: Record<string, string> = {};
	const items: SupportTransferDraft["items"] = [];
	for (const report of reports) {
		const raw = (values[report.id] ?? "").trim().replace(",", ".");
		const value = Number(raw);
		if (!/^\d+(\.\d{1,2})?$/.test(raw) || !Number.isFinite(value)) {
			errors[report.id] =
				"Укажите часы числом, не больше двух знаков после запятой";
		} else if (value > report.hours + 0.000001) {
			errors[report.id] = `Доступно не больше ${report.hours} ч`;
		} else if (value > 0) {
			items.push({ reportId: report.id, hours: value });
		}
	}
	if (!Object.keys(errors).length && !items.length)
		errors._form = "Укажите количество часов для переноса";
	return { items, errors };
};

export type SupportTransferPreview = {
	fingerprint: string;
	movedHours: number;
	unallocatedHours: number;
	items: { reportId: string; hours: number }[];
	packages: {
		id: number;
		before: {
			purchasedHours: number;
			consumedHours: number;
			remainingHours: number;
		};
		after: {
			purchasedHours: number;
			consumedHours: number;
			remainingHours: number;
		};
	}[];
};
export type SupportTransferCallbacks = {
	onPreviewTransfer?: (
		draft: SupportTransferDraft,
	) => Promise<SupportTransferPreview>;
	onTransfer?: (
		draft: SupportTransferDraft,
		fingerprint: string,
	) => Promise<void>;
};
