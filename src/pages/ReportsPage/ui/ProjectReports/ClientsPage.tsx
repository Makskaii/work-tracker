import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router";
import { TaskCodes } from "@/components/calendar/constants/const";
import {
	ClientsCodes,
	EntityTypeIds,
	TASK_SELECT_FIELDS,
} from "@/shared/constants/const";
import type { Header } from "@/shared/types/table";
import { getSprintWeekBorders } from "@/shared/utils/statisticUtils/generateWeekBorders";
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
	if (tasks.length === 0) {
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

	if (
		tasks.filter((task) => task.stageId === TASK_STAGE_IDS.DONE).length !== 0
	) {
		return `сделано задач:${tasks.filter((task) => task.stageId === TASK_STAGE_IDS.DONE).length}`;
	}

	return "нет задач";
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
		allProjectsWithClient
			.filter((item) => item.projectId)
			.map(async (project) => {
				const response = await getItems<TaskProps>(
					EntityTypeIds.tasks,
					{
						[TaskCodes.project]: project.projectId,
						[`<=${TaskCodes.sprintDateStart}`]: endOfTheWeek,
						[`>=${TaskCodes.sprintDateStart}`]: startOfTheWeek,
					},
					TASK_SELECT_FIELDS,
				);

				const tasks = response ?? [];

				return {
					id: project.id,
					title: project[ClientsCodes.title],
					tasksCount: tasks.length,
					status: getProjectStatus(tasks),
				};
			}),
	);

	return result;
};

const today = dayjs();

const ProjectsReports = () => {
	const [expandedClients, setExpandedClients] = useState<
		Record<string, boolean>
	>({});

	const { projects } = useOutletContext<ReportsContext>();
	const clients = (projects ?? []) as ClientWithProjects[];

	const borders = useMemo(() => getSprintWeekBorders(dayjs(today)), []);
	const [projectsWithStatus, setProjectsWithStatus] = useState<
		ProjectWithStatus[]
	>([]);

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

	const toggleClient = (clientId: string) => {
		setExpandedClients((prev) => ({
			...prev,
			[clientId]: !prev[clientId],
		}));
	};

	const getProjectMeta = (projectId: string) => {
		return projectsWithStatus.find((item) => item.id === Number(projectId));
	};

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
												<div key={project.id} className={styles.projectItem}>
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
			</div>
		</>
	);
};

export default ProjectsReports;
