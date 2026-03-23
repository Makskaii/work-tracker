import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router";
import {
	dtoFieldsCodesDailyReports,
	dtoFieldsCodesUserReports,
} from "@/components/calendar/constants/const";
import { UniversalTable } from "@/components/Table/universalTable/UniversalTable";
import { $api } from "@/shared/config";
import {
	ClientsCodes,
	Endpoints,
	EntityTypeIds,
	TASK_SELECT_FIELDS,
} from "@/shared/constants/const";
import type { Header } from "@/shared/types/table";
import { getWeekBorders } from "@/shared/utils/statisticUtils/generateWeekBorders";
import { Modal } from "../../../../components/modal";
import type {
	ClientListItems,
	ClientProjectProps,
	ReportsContext,
	TaskProps,
} from "../../../../shared/types/types";
import { getItems } from "../../api/getTasks";
import type { ProjectTableRow } from "../../types/types";
import styles from "./ProjectsReports.module.scss";

type ClientWithProjects = ClientListItems & {
	projects?: ClientProjectProps[];
};

type ProjectWithStatus = Partial<ClientProjectProps> & {
	status: string;
	tasksCount: number;
	clientId: string;
	clientName: string;
};

const TASK_STAGE_IDS = {
	BACKLOG: "DT1072_18:NEW",
	SPRINT: "DT1072_18:PREPARATION",
	IN_WORK: "DT1072_18:CLIENT",
	DONE: "DT1072_18:UC_6JNSDG",
	TESTING: "DT1072_18:TESTING",
	WAITING: "DT1072_18:UC_A9IWFS",
	DOCS: "DT1072_18:UC_K596F0",
} as const;

export const getRiskColor = (risk: string): string => {
	return risk === "Перерасход" ? "#ef4444" : "#22c55e";
};

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

const getProjectPlanHours = (tasks: TaskProps[]) => {
	return tasks.reduce((acc, task) => {
		return acc + parseFloat(task[dtoFieldsCodesUserReports.estimateTime] ?? 0);
	}, 0);
};

const getReportsByProject = async ({ projectId }: { projectId: number }) => {
	const response = await $api.get(Endpoints.crmItems, {
		params: {
			entityTypeId: EntityTypeIds.reports,
			select: [
				"id",
				"title",
				"begindate",
				dtoFieldsCodesDailyReports.title,
				dtoFieldsCodesDailyReports.timeSpent,
				dtoFieldsCodesDailyReports.project,
				dtoFieldsCodesDailyReports.taskId,
				dtoFieldsCodesDailyReports.activityType,
				"assignedById",
				"createdTime",
				"lastActivityTime",
				`parentId${EntityTypeIds.tasks}`,
			],
			filter: {
				[dtoFieldsCodesDailyReports.project]: projectId,
			},
		},
	});

	return response?.data?.result?.items ?? [];
};

const getSpentHoursByReports = (reports: Array<Record<string, unknown>>) => {
	return reports.reduce((acc, report) => {
		return acc + Number(report[dtoFieldsCodesDailyReports.timeSpent] ?? 0);
	}, 0);
};

const getProjectRisk = (planHours: number, spentHours: number) => {
	return spentHours > planHours ? "Перерасход" : "Нет риска";
};

export const getProjectsTableData = async ({
	clients,
}: {
	clients: ClientWithProjects[];
}): Promise<ProjectTableRow[]> => {
	const allProjects = clients.flatMap((client) => client.projects ?? []);

	const result = await Promise.all(
		allProjects.map(async (project) => {
			const tasks = await getItems<TaskProps>(
				EntityTypeIds.tasks,
				{
					[dtoFieldsCodesUserReports.project]: project.id,
				},
				TASK_SELECT_FIELDS,
			);

			const reports = await getReportsByProject({
				projectId: project.id,
			});

			const planHours = getProjectPlanHours(tasks ?? []);
			const spentHours = getSpentHoursByReports(reports);
			const deviation = spentHours - planHours;
			const risk = getProjectRisk(planHours, spentHours);
			const purchasedHours = "-";

			return {
				id: String(project.id),
				title: project[ClientsCodes.title],
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
		convertFn: (value) => String(value),
	},
	{
		title: "Потрачено",
		key: "spentHours",
		convertFn: (value) => String(value),
	},
	{
		title: "Отклонение",
		key: "deviation",
		convertFn: (value) => (value > 0 ? `+${value}` : String(value)),
	},
	{
		title: "Риск",
		key: "risk",
		render: (value) => (
			<span style={{ color: getRiskColor(value) }}>{value}</span>
		),
	},
	{
		title: "Купленные часы на разработку",
		key: "purchasedHours",
	},
];

export const getProjectsWithStatuses = async ({
	clients,
	startOfTheWeek,
	endOfTheWeek,
}: {
	clients: ClientWithProjects[];
	startOfTheWeek: string;
	endOfTheWeek: string;
}): Promise<ProjectWithStatus[]> => {
	const allProjectsWithClient = clients.flatMap((client) =>
		(client.projects ?? []).map((project) => ({
			...project,
			clientId: client.ID,
			clientName: client.NAME,
		})),
	);

	const result = await Promise.all(
		allProjectsWithClient.map(async (project) => {
			const response = await getItems<TaskProps>(
				EntityTypeIds.tasks,
				{
					[dtoFieldsCodesUserReports.project]: project.id,
					[`<=${dtoFieldsCodesUserReports.sprintDateStart}`]: endOfTheWeek,
					[`>=${dtoFieldsCodesUserReports.sprintDateStart}`]: startOfTheWeek,
				},
				TASK_SELECT_FIELDS,
			);

			const tasks = response ?? [];

			return {
				ID: String(project.id),
				NAME: project[ClientsCodes.title],
				clientId: project.clientId,
				clientName: project.clientName,
				tasksCount: tasks.length,
				status: getProjectStatus(tasks),
			};
		}),
	);

	return result;
};

const today = dayjs();

const ProjectsReports = () => {
	const [_open, setOpen] = useState(false);
	const [showStatuses, setShowStatuses] = useState(false);
	const [_activeProject, setActiveProject] =
		useState<ClientProjectProps | null>(null);
	const [expandedClients, setExpandedClients] = useState<
		Record<string, boolean>
	>({});

	const { projects } = useOutletContext<ReportsContext>();
	const clients = (projects ?? []) as ClientWithProjects[];

	const borders = useMemo(() => getWeekBorders(dayjs(today)), []);
	const [projectsWithStatus, setProjectsWithStatus] = useState<
		ProjectWithStatus[]
	>([]);
	const [tableData, setTableData] = useState<ProjectTableRow[]>([]);

	useEffect(() => {
		const fetchData = async () => {
			const result = await getProjectsWithStatuses({
				clients,
				startOfTheWeek: borders.startOfTheWeek,
				endOfTheWeek: borders.endOfTheWeek,
			});

			setProjectsWithStatus(result);
		};

		if (clients.length) {
			fetchData();
		}
	}, [borders.endOfTheWeek, borders.startOfTheWeek, clients]);

	useEffect(() => {
		const fetchData = async () => {
			const result = await getProjectsTableData({
				clients,
			});

			setTableData(result);
		};

		if (clients.length) {
			fetchData();
		}
	}, [clients]);

	const toggleClient = (clientId: string) => {
		setExpandedClients((prev) => ({
			...prev,
			[clientId]: !prev[clientId],
		}));
	};

	const getProjectMeta = (projectId: string) => {
		return projectsWithStatus.find((item) => item.id === Number(projectId));
	};

	const totalProjectsCount = clients.reduce((acc, client) => {
		return acc + (client.projects?.length ?? 0);
	}, 0);

	return (
		<>
			<div className={styles.header}>Клиенты:</div>

			<div className={styles.contentContainer}>
				<div className={styles.itemsContainer}>
					{clients.map((client) => {
						const isExpanded = expandedClients[client.ID];
						const clientProjects = client.projects ?? [];

						return (
							<div key={client.ID} className={styles.clientBlock}>
								<div
									className={styles.clientItem}
									onClick={() => toggleClient(client.ID)}
								>
									<div className={styles.clientTitle}>{client.NAME}</div>
									<div className={styles.clientMeta}>
										<span>{clientProjects.length} проектов</span>
										<span className={styles.arrow}>
											{isExpanded ? "▲" : "▼"}
										</span>
									</div>
								</div>

								{isExpanded && (
									<div className={styles.projectsList}>
										{clientProjects.map((project) => {
											const meta = getProjectMeta(String(project.id));

											return (
												<div
													key={project.id}
													className={styles.projectItem}
													onClick={() => {
														setActiveProject(project);
														setOpen(true);
													}}
												>
													<div className={styles.projectTitle}>
														{project.title}
													</div>

													<div className={styles.projectInfo}>
														<div>{meta?.status ?? "нет задач"}</div>
														<div className={styles.tasksCount}>
															Задач: {meta?.tasksCount ?? 0}
														</div>
													</div>
												</div>
											);
										})}
									</div>
								)}
							</div>
						);
					})}
				</div>

				<div className={styles.statisticsContainer}>
					<div className={styles.noTasksMessage}>
						<div>Количество клиентов: {clients.length}</div>
						<div>Количество проектов: {totalProjectsCount}</div>

						<button onClick={() => setShowStatuses(true)}>
							Статус проектов
						</button>
					</div>
				</div>
			</div>

			{/* {activeProject && (
				<Modal
					isOpen={open}
					onClose={() => setOpen(false)}
					innerScroll
					size="covered"
				>
					<ProjectsStats project={activeProject} />
				</Modal>
			)} */}

			{showStatuses && (
				<Modal
					isOpen={showStatuses}
					onClose={() => setShowStatuses(false)}
					innerScroll
					size="covered"
				>
					<UniversalTable<ProjectTableRow>
						headers={headersForProjects}
						activeItems={tableData.toSorted((a, b) =>
							a.status.localeCompare(b.status),
						)}
					/>
				</Modal>
			)}
		</>
	);
};

export default ProjectsReports;
