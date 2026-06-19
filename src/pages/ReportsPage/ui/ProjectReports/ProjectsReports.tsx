import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router";
import {
	ProjectCodes,
	ReportCodes,
	TaskCodes,
} from "@/components/calendar/constants/const";
import type { ReportProps } from "@/components/calendar/types/types";
import { ClientProjectsStats } from "@/pages/ClientProfilePage/ui/ProjectPage/ClientProjectStats";
import { $api } from "@/shared/config";
import {
	Endpoints,
	EntityTypeIds,
	TASK_SELECT_FIELDS,
} from "@/shared/constants/const";
import { useLoadAllData } from "@/shared/hooks/useLoadAllTasks";
import { useSprintBorders } from "@/shared/hooks/useSprintBorders";
import { Modal } from "../../../../components/modal";
import type {
	ClientListItems,
	ClientProjectProps,
	ReportsContext,
	TaskProps,
} from "../../../../shared/types/types";
import styles from "./ProjectsReports.module.scss";

type ClientWithProjects = ClientListItems & {
	projects?: ClientProjectProps[];
};

type ProjectWithClient = ClientProjectProps & {
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

const REPORT_SELECT_FIELDS = [
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

const getProjectCompanyId = (project: ClientProjectProps) => {
	return String(project[ProjectCodes.company] ?? "").trim();
};

const getReportTaskId = (report: ReportProps) => {
	const taskId = report[ReportCodes.parentId] ?? report[ReportCodes.taskId];

	return taskId === null || taskId === undefined ? "" : String(taskId).trim();
};

const fetchAllCrmItems = async <T,>({
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

const getFlattenedProjects = (clients: ClientWithProjects[]) => {
	return clients.flatMap((client) =>
		(client.projects ?? []).map((project) => ({
			...project,
			clientId: client.ID,
			clientName: client.NAME,
			projectId: String(project.projectId ?? project.id),
		})),
	);
};

const getProjectsWithStatuses = ({
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

const ProjectsReports = () => {
	const [open, setOpen] = useState<boolean>(false);
	const [activeProject, setActiveProject] = useState<ProjectWithClient>();
	const [tasks, setTasks] = useState<TaskProps[]>([]);

	const { clientsList } = useOutletContext<ReportsContext>();
	const projects = useMemo(
		() => getFlattenedProjects(clientsList ?? []),
		[clientsList],
	);
	const { startOfTheWeek, endOfTheWeek } = useSprintBorders("workweek");

	const { data: reports, setFilters: setReportsFilters } =
		useLoadAllData<ReportProps>({
			initialEndpoint: Endpoints.crmItems,
			initialFilters: {
				params: {
					entityTypeId: EntityTypeIds.reports,
					select: REPORT_SELECT_FIELDS,
					filter: {
						">=begindate": startOfTheWeek,
						"<=begindate": endOfTheWeek,
						stageId: "DT1060_15:PREPARATION",
					},
				},
			},
		});

	const reportTaskIds = useMemo(() => {
		return Array.from(new Set(reports.map(getReportTaskId).filter(Boolean)));
	}, [reports]);

	useEffect(() => {
		setReportsFilters({
			params: {
				entityTypeId: EntityTypeIds.reports,
				select: REPORT_SELECT_FIELDS,
				filter: {
					">=begindate": startOfTheWeek,
					"<=begindate": endOfTheWeek,
					stageId: "DT1060_15:PREPARATION",
				},
			},
		});
	}, [endOfTheWeek, setReportsFilters, startOfTheWeek]);

	useEffect(() => {
		let isCancelled = false;

		const fetchTasksByReports = async () => {
			if (!reportTaskIds.length) {
				setTasks([]);
				return;
			}

			const response = await fetchAllCrmItems<TaskProps>({
				entityTypeId: EntityTypeIds.tasks,
				filter: {
					"@id": reportTaskIds,
				},
				select: TASK_SELECT_FIELDS,
			});

			if (!isCancelled) {
				setTasks(response ?? []);
			}
		};

		fetchTasksByReports();

		return () => {
			isCancelled = true;
		};
	}, [reportTaskIds]);

	const projWithStatus = useMemo(() => {
		return getProjectsWithStatuses({
			projects,
			reports,
			tasks,
		});
	}, [projects, reports, tasks]);

	return (
		<>
			<div className={styles.header}>Проекты</div>
			<div className={styles.contentContainer}>
				<div className={styles.itemsContainer}>
					{projWithStatus
						.toSorted((a, b) => a.status.localeCompare(b.status))
						.map((proj) => (
							<div
								key={proj.projectId}
								className={styles.projectItem}
								onClick={() => {
									setActiveProject(proj);
									setOpen(true);
								}}
							>
								<div
									style={{
										display: "flex",
										justifyContent: "space-between",
										width: "100%",
									}}
								>
									<div className={styles.projectTitle}> {proj.title}</div>
									<div>
										<div>{proj.status}</div>
									</div>
								</div>
							</div>
						))}
				</div>
			</div>

			{activeProject && (
				<Modal
					isOpen={open}
					onClose={() => setOpen(false)}
					innerScroll
					size="covered"
				>
					<ClientProjectsStats project={activeProject} />
				</Modal>
			)}
		</>
	);
};

export default ProjectsReports;
