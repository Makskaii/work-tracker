import { createElement } from "react";
import {
	ProjectCodes,
	ReportCodes,
	TaskCodes,
} from "@/components/calendar/constants/const";
import type { ReportProps } from "@/components/calendar/types/types";
import { TableCell } from "@/components/Table/universalTable/TableCellDecoration";
import { $api } from "@/shared/config";
import {
	Endpoints,
	EntityTypeIds,
} from "@/shared/constants/const";
import type { Header } from "@/shared/types/table";
import type {
	ClientListItems,
	ClientProjectProps,
	TaskProps,
} from "@/shared/types/types";
import { getFixedNumber } from "@/shared/utils/getNumber";
import { getItems } from "../../api/getTasks";
import type { ProjectTableRow } from "../../types/types";

export type ClientWithProjects = ClientListItems & {
	projects?: ClientProjectProps[];
};

export type ProjectWithClient = ClientProjectProps & {
	clientId: string;
	clientName: string;
	projectId: string;
};

type ProjectWithStatus = ProjectWithClient & {
	status: string;
	tasksCount: number;
};

type CrmItemListResponse<T> = {
	result?: {
		items?: T[];
	};
	next?: number | null;
};

export const REPORT_SELECT_FIELDS = [
	"id",
	"title",
	"begindate",
	ReportCodes.title,
	ReportCodes.timeSpent,
	ReportCodes.company,
	ReportCodes.parentproject,
	ReportCodes.taskId,
	ReportCodes.activityType,
	"assignedById",
	"createdTime",
	"lastActivityTime",
	`parentId${EntityTypeIds.tasks}`,
] as const;

const TASK_STAGE_IDS = {
	BACKLOG: "DT1072_18:NEW",
	SPRINT: "DT1072_18:PREPARATION",
	IN_WORK: "DT1072_18:CLIENT",
	DONE: "DT1072_18:UC_6JNSDG",
	TESTING: "DT1072_18:TESTING",
	WAITING: "DT1072_18:UC_A9IWFS",
	DOCS: "DT1072_18:UC_K596F0",
} as const;

const getRiskColor = (risk: string): string =>
	risk === "Перерасход" ? "#ef4444" : "#22c55e";

const getProjectStatus = (tasks: Array<{ stageId?: string }>): string => {
	if (!tasks.length) {
		return "нет задач";
	}

	const hasInWorkTasks = tasks.some(
		(task) =>
			task.stageId === TASK_STAGE_IDS.IN_WORK ||
			task.stageId === TASK_STAGE_IDS.SPRINT ||
			task.stageId === TASK_STAGE_IDS.TESTING ||
			task.stageId === TASK_STAGE_IDS.WAITING ||
			task.stageId === TASK_STAGE_IDS.DOCS,
	);

	if (hasInWorkTasks) {
		return "в работе";
	}

	const hasBacklogTasks = tasks.some(
		(task) => task.stageId === TASK_STAGE_IDS.BACKLOG,
	);

	if (hasBacklogTasks) {
		return "в бэклоге";
	}

	return "нет задач";
};

const getProjectPlanHours = (tasks: TaskProps[]) =>
	tasks.reduce((acc, task) => {
		return acc + parseFloat(task[TaskCodes.estimateTime] ?? 0);
	}, 0);

const getProjectCompanyId = (project: ClientProjectProps) =>
	String(project[ProjectCodes.company] ?? "").trim();

export const getReportTaskId = (report: ReportProps) => {
	const taskId = report[ReportCodes.parentId] ?? report[ReportCodes.taskId];

	return taskId === null || taskId === undefined ? "" : String(taskId).trim();
};

export const fetchAllCrmItems = async <T,>({
	entityTypeId,
	select,
	filter,
}: {
	entityTypeId: number;
	select: readonly string[];
	filter: Record<string, unknown>;
}) => {
	const limit = 50;
	let start = 0;
	let next: number | null | undefined = 0;
	const items: T[] = [];

	while (next !== null) {
		const response = await $api.get<CrmItemListResponse<T>>(
			Endpoints.crmItems,
			{
				params: {
					entityTypeId,
					select,
					filter,
					start,
				},
			},
		);

		items.push(...(response.data.result?.items ?? []));

		next = response.data.next ?? null;
		start = next ?? start + limit;
	}

	return items;
};

export const getFlattenedProjects = (clients: ClientWithProjects[]) =>
	clients.flatMap((client) =>
		(client.projects ?? []).map((project) => ({
			...project,
			clientId: client.ID,
			clientName: client.NAME,
			projectId: String(project.projectId ?? project.id),
		})),
	);

const getReportsByProject = async ({
	projectId,
	companyId,
}: {
	projectId: string;
	companyId?: string;
}) => {
	const response = await $api.get(Endpoints.crmItems, {
		params: {
			entityTypeId: EntityTypeIds.reports,
			select: REPORT_SELECT_FIELDS,
			filter: {
				[ReportCodes.parentproject]: projectId,
				...(companyId ? { [ReportCodes.company]: companyId } : {}),
				stageId: "DT1060_15:PREPARATION",
			},
		},
	});

	return response?.data?.result?.items ?? [];
};

const getSpentHoursByReports = (reports: Array<Record<string, unknown>>) =>
	reports.reduce((acc, report) => {
		return acc + Number(report[ReportCodes.timeSpent] ?? 0);
	}, 0);

const getProjectRisk = (planHours: number, spentHours: number) =>
	spentHours > planHours ? "Перерасход" : "Нет риска";

export const getProjectsTableData = async ({
	clients,
}: {
	clients: ClientWithProjects[];
}): Promise<ProjectTableRow[]> => {
	const projects = getFlattenedProjects(clients);

	const result = await Promise.all(
		projects.map(async (project) => {
			const projectId = String(project.projectId ?? project.id);
			const companyId = getProjectCompanyId(project);

			const tasks = await getItems<TaskProps>({
				typeId: EntityTypeIds.tasks,
				filters: {
					[TaskCodes.parentproject]: projectId,
					...(companyId ? { [TaskCodes.company]: companyId } : {}),
				},
			});

			const reports = await getReportsByProject({
				projectId,
				companyId,
			});

			const planHours = getProjectPlanHours(tasks ?? []);
			const spentHours = getSpentHoursByReports(reports);
			const deviation = spentHours - planHours;
			const risk = getProjectRisk(planHours, spentHours);
			const purchasedHours = "-";

			return {
				id: projectId,
				title: project.title,
				status: getProjectStatus(tasks ?? []),
				planHours,
				spentHours,
				deviation,
				risk,
				purchasedHours,
			};
		}),
	);

	return result;
};

export const headersForProjects: Header<ProjectTableRow>[] = [
	{
		title: "Проект",
		key: "title",
	},
	{
		title: "Статус",
		key: "status",
	},
	{
		title: "План часов",
		key: "planHours",
		convertFn: (value) => getFixedNumber(value),
	},
	{
		title: "Потрачено",
		key: "spentHours",
		convertFn: (value) => getFixedNumber(value),
	},
	{
		title: "Отклонение",
		key: "deviation",
		convertFn: (value) =>
			value > 0 ? `+${getFixedNumber(value)}` : getFixedNumber(value),
	},
	{
		title: "Риск",
		key: "risk",
		render: (value) =>
			createElement(TableCell, {
				value,
				styles: {
					color: getRiskColor(value),
				},
			}),
	},
	{
		title: "Купленные часы на разработку",
		key: "purchasedHours",
	},
];

export const getProjectsWithStatuses = ({
	projects,
	reports,
	tasks,
}: {
	projects: ProjectWithClient[];
	reports: ReportProps[];
	tasks: TaskProps[];
}): ProjectWithStatus[] => {
	const tasksMap = new Map(tasks.map((task) => [String(task.id), task]));

	return projects.map((project) => {
		const projectId = String(project.projectId ?? project.id);
		const companyId = getProjectCompanyId(project);

		const projectTaskIds = new Set(
			reports
				.filter((report) => {
					const taskId = getReportTaskId(report);
					const task = tasksMap.get(taskId);
					const reportProjectId = String(
						report[ReportCodes.parentproject] ?? "",
					).trim();
					const reportCompanyId = String(
						report[ReportCodes.company] ?? "",
					).trim();
					const taskProjectId = String(
						task?.[TaskCodes.parentproject] ?? "",
					).trim();
					const taskCompanyId = String(task?.[TaskCodes.company] ?? "").trim();

					const isProjectReport = reportProjectId
						? reportProjectId === projectId
						: taskProjectId === projectId;
					const isCompanyReport =
						!companyId ||
						(reportCompanyId
							? reportCompanyId === companyId
							: taskCompanyId === companyId);

					return Boolean(taskId) && isProjectReport && isCompanyReport;
				})
				.map(getReportTaskId),
		);

		const projectTasks = Array.from(projectTaskIds)
			.map((taskId) => tasksMap.get(taskId))
			.filter((task): task is TaskProps => Boolean(task));

		return {
			...project,
			tasksCount: projectTasks.length,
			status: getProjectStatus(projectTasks),
		};
	});
};
