import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router";
import { TaskCodes } from "@/components/calendar/constants/const";
import { Modal } from "@/components/modal";
import { ClientProjectsStats } from "@/pages/ClientProfilePage/ui/ProjectPage/ClientProjectStats";
import { EntityTypeIds, TASK_SELECT_FIELDS } from "@/shared/constants/const";
import { getSprintWeekBorders } from "@/shared/utils/statisticUtils/generateWeekBorders";
import type {
	ClientListItems,
	ClientProjectProps,
	ReportsContext,
	TaskProps,
} from "../../../../shared/types/types";
import { getItems } from "../../api/getTasks";
import styles from "./ProjectsReports.module.scss";

type ClientWithProjects = ClientListItems & {
	projects?: ClientProjectProps[];
};

const STATUS_META: Record<
	ProjectStatus,
	{ label: string; className: string; order: number }
> = {
	active: {
		label: "Active",
		className: "active",
		order: 1,
	},
	backlog: {
		label: "Backlog",
		className: "backlog",
		order: 2,
	},
	done: {
		label: "Done",
		className: "done",
		order: 3,
	},
	empty: {
		label: "Empty",
		className: "empty",
		order: 4,
	},
};

export const ProjectStatusBadge = ({ status }: { status: ProjectStatus }) => {
	const meta = STATUS_META[status];

	return (
		<span className={`${styles.statusBadge} ${styles[meta.className]}`}>
			{meta.label}
		</span>
	);
};

type ProjectWithStatus = Partial<ClientProjectProps> & {
	status: ProjectStatus;
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

type ProjectStatus = "active" | "backlog" | "done" | "empty";

const getProjectStatus = (
	tasks: Array<{ stageId?: string }>,
): ProjectStatus => {
	if (tasks.length === 0) {
		return "empty";
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
		return "active";
	}

	const hasBacklogTasks = tasks.some(
		(task) => task.stageId === TASK_STAGE_IDS.BACKLOG,
	);

	if (hasBacklogTasks) {
		return "backlog";
	}

	const hasDoneTasks = tasks.some(
		(task) => task.stageId === TASK_STAGE_IDS.DONE,
	);

	if (hasDoneTasks) {
		return "done";
	}

	return "empty";
};

export const getProjectsWithStatuses = async ({
	clients,
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
					},
					TASK_SELECT_FIELDS,
				);

				const tasks = response ?? [];

				console.log(getProjectStatus(tasks), project.title, tasks);

				return {
					id: project.id,
					title: project.title,
					tasksCount: tasks.length,
					status: getProjectStatus(tasks),
				};
			}),
	);
	console.log({ result });
	return result;
};

const today = dayjs();

const ProjectsReports = () => {
	const [expandedClients, setExpandedClients] = useState<
		Record<string, boolean>
	>({});
	const [open, setOpen] = useState<boolean>(false);
	const { clientsList } = useOutletContext<ReportsContext>();
	const clients = (clientsList ?? []) as ClientWithProjects[];

	const [activeProject, setActiveProject] = useState<ClientProjectProps>();

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
					{clients
						.toSorted((a, b) => {
							if (a.projects && b.projects) {
								return b.projects?.length - a.projects?.length;
							}
							return 0;
						})
						.map((client) => {
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
											{clientProjects
												.toSorted((a, b) => {
													const statusA =
														getProjectMeta(String(a.id))?.status ?? "empty";
													const statusB =
														getProjectMeta(String(b.id))?.status ?? "empty";

													return (
														STATUS_META[statusA].order -
														STATUS_META[statusB].order
													);
												})
												.map((project) => {
													const meta = getProjectMeta(String(project.id));
													const status = meta?.status ?? "empty";

													return (
														<div
															onClick={() => {
																setOpen(true);
																setActiveProject(project);
															}}
															key={project.id}
															className={styles.projectItem}
														>
															<div className={styles.projectTitle}>
																{project.title}
															</div>

															<div className={styles.projectInfo}>
																<ProjectStatusBadge status={status} />

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
			</div>
		</>
	);
};

export default ProjectsReports;
