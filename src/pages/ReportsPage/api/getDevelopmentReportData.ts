import type { ReportProps } from "@/components/calendar/types/types";
import {
	ActivityType,
	ReportCodes,
	TaskCodes,
} from "@/components/calendar/constants/const";
import { $api } from "@/shared/config";
import {
	Endpoints,
	EntityTypeIds,
	TaskStageIds,
} from "@/shared/constants/const";
import type { TaskProps } from "@/shared/types/types";

const REPORT_SELECT_FIELDS = [
	"id",
	"assignedById",
	"stageId",
	ReportCodes.timeSpent,
	ReportCodes.activityType,
	ReportCodes.taskId,
	ReportCodes.parentId,
] as const;

const DEVELOPMENT_TASK_SELECT_FIELDS = [
	"id",
	"title",
	"assignedById",
	"movedTime",
	"stageId",
	TaskCodes.estimateTime,
	TaskCodes.hours,
	TaskCodes.project,
	TaskCodes.parentproject,
] as const;

const REPORT_TASK_CHUNK_SIZE = 40;

type CrmItemListResponse<T> = {
	result?: {
		items?: T[];
	};
	next?: number | null;
};

type FetchAllCrmItemsParams = {
	entityTypeId: number;
	select: readonly string[];
	filter: Record<string, unknown>;
	signal?: AbortSignal;
};

const fetchAllCrmItems = async <T,>({
	entityTypeId,
	select,
	filter,
	signal,
}: FetchAllCrmItemsParams): Promise<T[]> => {
	let start = 0;
	const items: T[] = [];

	while (true) {
		const response = await $api.get<CrmItemListResponse<T>>(Endpoints.crmItems, {
			params: {
				entityTypeId,
				select,
				filter,
				start,
			},
			signal,
		});

		items.push(...(response.data.result?.items ?? []));

		const next = response.data.next;

		if (next === null || next === undefined || next <= start) {
			break;
		}

		start = next;
	}

	return items;
};

const splitIntoChunks = <T,>(items: T[], chunkSize: number): T[][] => {
	const chunks: T[][] = [];

	for (let index = 0; index < items.length; index += chunkSize) {
		chunks.push(items.slice(index, index + chunkSize));
	}

	return chunks;
};

const fetchReportsByTaskField = async ({
	taskIds,
	field,
	signal,
}: {
	taskIds: string[];
	field: ReportCodes.parentId | ReportCodes.taskId;
	signal?: AbortSignal;
}): Promise<ReportProps[]> => {
	const reports: ReportProps[] = [];

	for (const taskIdChunk of splitIntoChunks(taskIds, REPORT_TASK_CHUNK_SIZE)) {
		const chunkReports = await fetchAllCrmItems<ReportProps>({
			entityTypeId: EntityTypeIds.reports,
			select: REPORT_SELECT_FIELDS,
			filter: {
				[ReportCodes.activityType]: ActivityType.development,
				[`@${field}`]: taskIdChunk,
			},
			signal,
		});

		reports.push(...chunkReports);
	}

	return reports;
};

export type DevelopmentReportSourceData = {
	tasks: TaskProps[];
	reports: ReportProps[];
};

export const getDevelopmentReportData = async ({
	periodStart,
	periodEnd,
	developerIds,
	signal,
}: {
	periodStart: string;
	periodEnd: string;
	developerIds: string[];
	signal?: AbortSignal;
}): Promise<DevelopmentReportSourceData> => {
	if (!developerIds.length) {
		return { tasks: [], reports: [] };
	}

	const completedTasks = await fetchAllCrmItems<TaskProps>({
		entityTypeId: EntityTypeIds.tasks,
		select: DEVELOPMENT_TASK_SELECT_FIELDS,
		filter: {
			"@assignedById": developerIds,
			stageId: TaskStageIds.done,
			">=movedTime": periodStart,
			"<movedTime": periodEnd,
		},
		signal,
	});
	const taskIds = Array.from(
		new Set(completedTasks.map((task) => String(task.id)).filter(Boolean)),
	);

	if (!taskIds.length) {
		return { tasks: completedTasks, reports: [] };
	}

	const [parentLinkedReports, legacyLinkedReports] = await Promise.all([
		fetchReportsByTaskField({
			taskIds,
			field: ReportCodes.parentId,
			signal,
		}),
		fetchReportsByTaskField({
			taskIds,
			field: ReportCodes.taskId,
			signal,
		}),
	]);

	const reportsById = new Map<string, ReportProps>();

	for (const report of [...parentLinkedReports, ...legacyLinkedReports]) {
		reportsById.set(String(report.id), report);
	}

	return {
		tasks: completedTasks,
		reports: Array.from(reportsById.values()),
	};
};
