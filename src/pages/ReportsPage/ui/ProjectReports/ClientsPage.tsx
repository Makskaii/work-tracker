import { useEffect, useState } from "react";
import { useOutletContext } from "react-router";
import { TaskCodes } from "@/components/calendar/constants/const";
import { Modal } from "@/components/modal";
import { ClientProjectsStats } from "@/pages/ClientProfilePage/ui/ProjectPage/ClientProjectStats";
import { EntityTypeIds, TASK_SELECT_FIELDS } from "@/shared/constants/const";
import { useSprintBorders } from "@/shared/hooks/useSprintBorders";
import type {
	ClientListItems,
	ClientProjectProps,
	ReportsContext,
	TaskProps,
} from "../../../../shared/types/types";
import { getItems } from "../../api/getTasks";
import { TASK_STAGE_IDS } from "../../constants/statuses";
import styles from "./ProjectsReports.module.scss";

type ClientWithProjects = ClientListItems & {
	projects?: ClientProjectProps[];
};

const STATUS_META: Record<
	ProjectStatus,
	{ label: string; className: string; order: number }
> = {
	Активен: {
		label: "Active",
		className: "active",
		order: 1,
	},
	Беклог: {
		label: "Backlog",
		className: "backlog",
		order: 2,
	},
	Завершен: {
		label: "Done",
		className: "done",
		order: 3,
	},
	"Отсутствуют задачи": {
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

export const getRiskColor = (risk: string): string => {
	return risk === "Перерасход" ? "#ef4444" : "#22c55e";
};

type ProjectStatus = "Активен" | "Беклог" | "Завершен" | "Отсутствуют задачи";

export const getProjectStatus = (
	tasks: Array<{ stageId?: string }>,
): ProjectStatus => {
	if (tasks.length === 0) {
		return "Отсутствуют задачи";
	}

	const hasInWorkTasks = tasks.some(
		(task) =>
			task.stageId === TASK_STAGE_IDS.IN_WORK ||
			task.stageId === TASK_STAGE_IDS.SPRINT ||
			task.stageId === TASK_STAGE_IDS.TESTING ||
			task.stageId === TASK_STAGE_IDS.WAITING ||
			task.stageId === TASK_STAGE_IDS.DOCS ||
			task.stageId === TASK_STAGE_IDS.REVIEW ||
			task.stageId === TASK_STAGE_IDS.QA,
	);

	if (hasInWorkTasks) {
		return "Активен";
	}

	const hasBacklogTasks = tasks.some(
		(task) => task.stageId === TASK_STAGE_IDS.BACKLOG,
	);

	if (hasBacklogTasks) {
		return "Беклог";
	}

	const hasDoneTasks = tasks.some(
		(task) => task.stageId === TASK_STAGE_IDS.DONE,
	);

	if (hasDoneTasks) {
		return "Завершен";
	}

	return "Отсутствуют задачи";
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
				const response = await getItems<TaskProps>({
					typeId: EntityTypeIds.tasks,
					filters: {
						[TaskCodes.project]: project.projectId,
					},
					select: TASK_SELECT_FIELDS,
				});

				const tasks = response ?? [];

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

const ProjectsReports = () => {
	const [expandedClients, setExpandedClients] = useState<
		Record<string, boolean>
	>({});
	const [open, setOpen] = useState<boolean>(false);
	const { clientsList } = useOutletContext<ReportsContext>();
	const clients = (clientsList ?? []) as ClientWithProjects[];

	const [activeProject, setActiveProject] = useState<ClientProjectProps>();

	const { endOfTheWeek, startOfTheWeek } = useSprintBorders();
	const [projectsWithStatus, setProjectsWithStatus] = useState<
		ProjectWithStatus[]
	>([]);

	useEffect(() => {
		const fetchData = async () => {
			const result = await getProjectsWithStatuses({
				clients,
				startOfTheWeek: startOfTheWeek,
				endOfTheWeek: endOfTheWeek,
			});

			setProjectsWithStatus(result);
		};

		if (clients.length) {
			fetchData();
		}
	}, [endOfTheWeek, startOfTheWeek, clients]);

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
														getProjectMeta(String(a.id))?.status ??
														"Отсутствуют задачи";
													const statusB =
														getProjectMeta(String(b.id))?.status ??
														"Отсутствуют задачи";

													return (
														STATUS_META[statusA].order -
														STATUS_META[statusB].order
													);
												})
												.map((project) => {
													const meta = getProjectMeta(String(project.id));
													const status = meta?.status ?? "Отсутствуют задачи";

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
