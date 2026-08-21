import type { ReportProps } from "@/components/calendar/types/types";
import {
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
	"createdTime",
	"movedTime",
	"stageId",
	TaskCodes.estimateTime,
	TaskCodes.hours,
	TaskCodes.project,
	TaskCodes.parentproject,
] as const;

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

const getEarliestTaskCreatedTime = (
	tasks: TaskProps[],
	fallback: string,
): string => {
	const timestamps = tasks
		.map((task) => Date.parse(String(task.createdTime ?? "")))
		.filter(Number.isFinite);

	if (!timestamps.length) {
		return fallback;
	}

	return new Date(Math.min(...timestamps)).toISOString();
};

const getRelationIds = (value: unknown): string[] => {
	const values = Array.isArray(value) ? value : [value];

	return values
		.map((item) => String(item ?? "").trim())
		.filter(Boolean);
};

const getReportTaskIds = (report: ReportProps): string[] => [
	...getRelationIds(report[ReportCodes.parentId]),
	...getRelationIds(report[ReportCodes.taskId]),
];

const fetchDevelopmentReports = async ({
	taskIds,
	reportsFrom,
	developmentActivityIds,
	signal,
}: {
	taskIds: string[];
	reportsFrom: string;
	developmentActivityIds: Array<string | number>;
	signal?: AbortSignal;
}): Promise<ReportProps[]> => {
	const taskIdSet = new Set(taskIds);
	const activityIds = Array.from(
		new Set(developmentActivityIds.map(String).filter(Boolean)),
	);
	const reportPages = await Promise.all(
		activityIds.map((activityId) =>
			fetchAllCrmItems<ReportProps>({
				entityTypeId: EntityTypeIds.reports,
				select: REPORT_SELECT_FIELDS,
				filter: {
					[ReportCodes.activityType]: activityId,
					">=begindate": reportsFrom,
				},
				signal,
			}),
		),
	);
	const reportsById = new Map<string, ReportProps>();

	for (const report of reportPages.flat()) {
		if (!getReportTaskIds(report).some((taskId) => taskIdSet.has(taskId))) {
			continue;
		}

		reportsById.set(String(report.id), report);
	}

	return Array.from(reportsById.values());
};

export type DevelopmentReportSourceData = {
	tasks: TaskProps[];
	reports: ReportProps[];
};

export const getDevelopmentReportData = async ({
	periodStart,
	periodEnd,
	developerIds,
	developmentActivityIds,
	signal,
}: {
	periodStart: string;
	periodEnd: string;
	developerIds: string[];
	developmentActivityIds: Array<string | number>;
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

	if (!taskIds.length || !developmentActivityIds.length) {
		return { tasks: completedTasks, reports: [] };
	}

	const reports = await fetchDevelopmentReports({
		taskIds,
		reportsFrom: getEarliestTaskCreatedTime(completedTasks, periodStart),
		developmentActivityIds,
		signal,
	});

	return {
		tasks: completedTasks,
		reports,
	};
};
