import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router";
import {
	ProjectCodes,
	ReportCodes,
	TaskCodes,
} from "@/components/calendar/constants/const";
import type { ReportProps } from "@/components/calendar/types/types";
import { Modal } from "@/components/modal";
import { TaskItemExtended } from "@/components/taskItem/TaskItemExtended";
import { ClientProjectsStats } from "@/pages/ClientProfilePage/ui/ProjectPage/ClientProjectStats";
import { $backendApi } from "@/shared/config/axios/axios.config";
import {
	Endpoints,
	EntityTypeIds,
	TASK_SELECT_FIELDS,
} from "@/shared/constants/const";
import { useBitrixSlider } from "@/shared/hooks/useBitrixSlider";
import { useLoadAllData } from "@/shared/hooks/useLoadAllTasks";
import { useLoadCrmItemsByIds } from "@/shared/hooks/useLoadCrmItemsByIds";
import { useSprintBorders } from "@/shared/hooks/useSprintBorders";
import { notify } from "@/shared/ui/NotificationPopup/notify";
import { classNames } from "@/shared/utils/utils";
import type {
	ClientListItems,
	ClientProjectProps,
	ReportsContext,
	TaskProps,
} from "../../../../shared/types/types";
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

const getProjectCompanyId = (project: ClientProjectProps) => {
	return String(project[ProjectCodes.company] ?? "").trim();
};

const getReportTaskId = (report: ReportProps) => {
	const taskId = report[ReportCodes.parentId] ?? report[ReportCodes.taskId];
	const normalizedTaskId =
		taskId === null || taskId === undefined ? "" : String(taskId).trim();

	return /^\d+$/.test(normalizedTaskId) ? normalizedTaskId : "";
};

const isReportForProject = ({
	report,
	task,
	project,
}: {
	report: ReportProps;
	task?: TaskProps;
	project: ClientProjectProps;
}) => {
	const projectId = String(project.projectId ?? project.id);
	const companyId = getProjectCompanyId(project);
	const reportProjectId = String(
		report[ReportCodes.parentproject] ?? "",
	).trim();
	const reportCompanyId = String(report[ReportCodes.company] ?? "").trim();
	const taskProjectId = String(task?.[TaskCodes.parentproject] ?? "").trim();
	const taskCompanyId = String(task?.[TaskCodes.company] ?? "").trim();

	const isProjectReport = reportProjectId
		? reportProjectId === projectId
		: taskProjectId === projectId;
	const isCompanyReport =
		!companyId ||
		(reportCompanyId
			? reportCompanyId === companyId
			: taskCompanyId === companyId);

	return isProjectReport && isCompanyReport;
};

export const getProjectsWithStatuses = ({
	clients,
	reports,
	tasks,
}: {
	clients: ClientWithProjects[];
	reports: ReportProps[];
	tasks: TaskProps[];
}): ProjectWithStatus[] => {
	const tasksMap = new Map(tasks.map((task) => [String(task.id), task]));
	const allProjectsWithClient = clients.flatMap((client) =>
		(client.projects ?? []).map((project) => ({
			...project,
			clientId: client.ID,
			clientName: client.NAME,
		})),
	);

	return allProjectsWithClient
		.filter((item) => item.projectId)
		.map((project) => {
			const projectTaskIds = new Set(
				reports
					.filter((report) => {
						const taskId = getReportTaskId(report);
						const task = tasksMap.get(taskId);

						return (
							Boolean(taskId) &&
							isReportForProject({
								report,
								task,
								project,
							})
						);
					})
					.map(getReportTaskId),
			);

			const projectTasks = Array.from(projectTaskIds)
				.map((taskId) => tasksMap.get(taskId))
				.filter((task): task is TaskProps => Boolean(task));

			return {
				id: project.id,
				title: project.title,
				tasksCount: projectTasks.length,
				status: getProjectStatus(projectTasks),
			};
		});
};

const ClientTasksModal = ({
	client,
	endOfTheWeek,
	onNextWeek,
	onPrevWeek,
	reports,
	startOfTheWeek,
	tasks,
}: {
	client: ClientWithProjects;
	endOfTheWeek: string;
	onNextWeek: () => void;
	onPrevWeek: () => void;
	reports: ReportProps[];
	startOfTheWeek: string;
	tasks: TaskProps[];
}) => {
	const { users, statuses } = useOutletContext<ReportsContext>();
	const { openTask } = useBitrixSlider();
	const tasksMap = useMemo(
		() => new Map(tasks.map((task) => [String(task.id), task])),
		[tasks],
	);
	const reportsByTask = useMemo(() => {
		return reports.reduce<Record<string, ReportProps[]>>((acc, report) => {
			const taskId = getReportTaskId(report);
			if (!taskId) return acc;

			acc[taskId] = [...(acc[taskId] ?? []), report];
			return acc;
		}, {});
	}, [reports]);

	const projectsWithTasks = useMemo(() => {
		return (client.projects ?? [])
			.map((project) => {
				const taskIds = new Set(
					reports
						.filter((report) => {
							const taskId = getReportTaskId(report);
							const task = tasksMap.get(taskId);

							return (
								Boolean(taskId) &&
								isReportForProject({
									report,
									task,
									project,
								})
							);
						})
						.map(getReportTaskId),
				);

				const projectTasks = Array.from(taskIds)
					.map((taskId) => tasksMap.get(taskId))
					.filter((task): task is TaskProps => Boolean(task))
					.toSorted((a, b) => a.stageId.localeCompare(b.stageId));

				return {
					project,
					tasks: projectTasks,
				};
			})
			.filter((item) => item.tasks.length);
	}, [client.projects, reports, tasksMap]);

	const getTaskSpent = (taskId: string) => {
		return (reportsByTask[taskId] ?? []).reduce((acc, report) => {
			return acc + Number(report[ReportCodes.timeSpent] ?? 0);
		}, 0);
	};

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					gap: "16px",
					flexWrap: "wrap",
				}}
			>
				<div style={{ fontSize: "20px", fontWeight: 700 }}>{client.NAME}</div>

				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: "10px",
					}}
				>
					<button type="button" onClick={onPrevWeek}>
						пред. неделя
					</button>

					<div style={{ fontWeight: 600 }}>
						{dayjs(startOfTheWeek).format("DD.MM")}-
						{dayjs(endOfTheWeek).format("DD.MM")}
					</div>

					<button type="button" onClick={onNextWeek}>
						след. неделя
					</button>
				</div>
			</div>

			{projectsWithTasks.length ? (
				projectsWithTasks.map(({ project, tasks }) => (
					<section
						key={project.id}
						style={{ display: "flex", flexDirection: "column", gap: "10px" }}
					>
						<div style={{ fontWeight: 600 }}>
							{project.title} · {tasks.length}
						</div>

						<div
							style={{ display: "flex", flexDirection: "column", gap: "8px" }}
						>
							{tasks.map((task) => (
								<div
									key={task.id}
									onClick={() => openTask(task.id, EntityTypeIds.tasks)}
								>
									<TaskItemExtended
										task={task}
										estimateTime={task[TaskCodes.estimateTime]}
										timeSpent={getTaskSpent(String(task.id))}
										statuses={statuses}
										users={users}
									/>
								</div>
							))}
						</div>
					</section>
				))
			) : (
				<div className={styles.noTasksMessage}>
					Нет задач по отчетам за выбранную неделю
				</div>
			)}
		</div>
	);
};

const { VITE_BFF_API_URL } = import.meta.env;

const ProjectsReports = () => {
	const [expandedClients, setExpandedClients] = useState<
		Record<string, boolean>
	>({});
	const [projectOpen, setProjectOpen] = useState<boolean>(false);
	const [clientOpen, setClientOpen] = useState<boolean>(false);
	const { clientsList } = useOutletContext<ReportsContext>();
	const clients = (clientsList ?? []) as ClientWithProjects[];

	const [loadingReport, setLoadingReport] = useState(false);
	const [loadUrl, setLoadUrl] = useState("");

	const [activeProject, setActiveProject] = useState<ClientProjectProps>();
	const [activeClient, setActiveClient] = useState<ClientWithProjects>();

	const { endOfTheWeek, setDay, startOfTheWeek } = useSprintBorders("workweek");
	const statusPeriod = useMemo(
		() => ({
			end: dayjs().format("YYYY-MM-DD"),
			start: dayjs().subtract(1, "month").format("YYYY-MM-DD"),
		}),
		[],
	);
	const { data: weekReports, setFilters: setWeekReportsFilters } =
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

	const { data: statusReports } = useLoadAllData<ReportProps>({
		initialEndpoint: Endpoints.crmItems,
		initialFilters: {
			params: {
				entityTypeId: EntityTypeIds.reports,
				select: REPORT_SELECT_FIELDS,
				filter: {
					">=begindate": statusPeriod.start,
					"<=begindate": statusPeriod.end,
					stageId: "DT1060_15:PREPARATION",
				},
			},
		},
	});

	const weekReportTaskIds = useMemo(() => {
		return Array.from(
			new Set(weekReports.map(getReportTaskId).filter(Boolean)),
		);
	}, [weekReports]);

	const statusReportTaskIds = useMemo(() => {
		return Array.from(
			new Set(statusReports.map(getReportTaskId).filter(Boolean)),
		);
	}, [statusReports]);

	const { data: weekTasks } = useLoadCrmItemsByIds<TaskProps>({
		entityTypeId: EntityTypeIds.tasks,
		ids: weekReportTaskIds,
		select: TASK_SELECT_FIELDS,
	});

	const { data: statusTasks } = useLoadCrmItemsByIds<TaskProps>({
		entityTypeId: EntityTypeIds.tasks,
		ids: statusReportTaskIds,
		select: TASK_SELECT_FIELDS,
	});

	useEffect(() => {
		setWeekReportsFilters({
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
	}, [endOfTheWeek, setWeekReportsFilters, startOfTheWeek]);

	const projectsWithStatus = useMemo(() => {
		return getProjectsWithStatuses({
			clients,
			reports: statusReports,
			tasks: statusTasks,
		});
	}, [clients, statusReports, statusTasks]);

	const toggleClient = (clientId: string) => {
		setExpandedClients((prev) => ({
			...prev,
			[clientId]: !prev[clientId],
		}));
	};

	const getProjectMeta = (projectId: string) => {
		return projectsWithStatus.find((item) => item.id === Number(projectId));
	};

	const getReportPdf = async (
		id: string,
		startOfThePeriod: string,
		endOfThePeriod: string,
	) => {
		try {
			setLoadingReport(true);
			const response = await $backendApi.post("doc-records/client-report", {
				id,
				startOfThePeriod,
				endOfThePeriod,
			});

			const downloadUrl = response.data.downloadUrl;

			setLoadUrl(`${VITE_BFF_API_URL}${downloadUrl}`);

			notify({
				message: "Отчет сформирован",
				type: "success",
			});
		} catch (error) {
			console.log(error);

			notify({
				message: "Ошибка загрузки отчёта",
				type: "error",
			});
		} finally {
			setLoadingReport(false);
		}
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
											<button
												type="button"
												onClick={(event) => {
													event.stopPropagation();
													setActiveClient(client);
													setClientOpen(true);
												}}
											>
												Открыть
											</button>
											{loadUrl === "" ? (
												<button
													disabled={loadingReport}
													type="button"
													className={classNames(styles.primaryButton, {
														[styles.loadingPulse]: loadingReport,
													})}
													onClick={async () =>
														await getReportPdf(
															client.ID,
															startOfTheWeek,
															endOfTheWeek,
														)
													}
												>
													{loadingReport ? "Генерация..." : "Отчёт за 2 недели"}
												</button>
											) : (
												<button
													type="button"
													className={styles.primaryButton}
													onClick={async () =>
														loadUrl !== "" && window.open(loadUrl, "_blank")
													}
													style={{
														background: "green",
													}}
												>
													Скачать отчёт
												</button>
											)}

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
																if ((meta?.tasksCount ?? 0) === 0) {
																	notify({
																		message: "Задач совсем нет",
																		type: "warning",
																	});
																	return;
																}

																setProjectOpen(true);
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
						isOpen={projectOpen}
						onClose={() => setProjectOpen(false)}
						innerScroll
						size="covered"
					>
						<ClientProjectsStats project={activeProject} />
					</Modal>
				)}
				{activeClient && (
					<Modal
						isOpen={clientOpen}
						onClose={() => setClientOpen(false)}
						innerScroll
						size="covered"
					>
						<ClientTasksModal
							client={activeClient}
							endOfTheWeek={endOfTheWeek}
							onNextWeek={() => setDay((prev) => prev.add(7, "day"))}
							onPrevWeek={() => setDay((prev) => prev.subtract(7, "day"))}
							reports={weekReports}
							startOfTheWeek={startOfTheWeek}
							tasks={weekTasks}
						/>
					</Modal>
				)}
			</div>
		</>
	);
};

export default ProjectsReports;
