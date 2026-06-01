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
	User,
} from "../../../../shared/types/types";
import { TASK_STAGE_IDS } from "../../constants/statuses";
import { ProjectActivityChart } from "./ActivityChart";
import styles from "./ProjectsReports.module.scss";

type ClientWithProjects = ClientListItems & {
	projects?: ClientProjectProps[];
};

const getSortedItems = <T,>(
	items: readonly T[],
	compareFn: (a: T, b: T) => number,
) => [...items].sort(compareFn);

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

const getClientTitle = (client: ClientWithProjects) => {
	return client.NAME || client.title || `Клиент #${client.ID}`;
};

const getTaskEstimate = (task: TaskProps) => {
	return (
		Number(String(task[TaskCodes.estimateTime] ?? 0).replace(",", ".")) || 0
	);
};

const getReportTaskId = (report: ReportProps) => {
	const taskId = report[ReportCodes.parentId] ?? report[ReportCodes.taskId];
	const normalizedTaskId =
		taskId === null || taskId === undefined ? "" : String(taskId).trim();

	return /^\d+$/.test(normalizedTaskId) ? normalizedTaskId : "";
};

const formatHoursValue = (value: number) => {
	return Number(value.toFixed(2)).toString();
};

const getTaskPaidHours = (task: TaskProps) => {
	return Number(String(task[TaskCodes.hours] ?? 0).replace(",", ".")) || 0;
};

const getReportsWeeksCount = (reports: ReportProps[]) => {
	const reportWeeks = reports
		.map((report) => dayjs(report.begindate))
		.filter((date) => date.isValid())
		.map((date) => date.startOf("week").format("YYYY-MM-DD"));

	return Math.max(new Set(reportWeeks).size, 1);
};

const getPaidHoursAdjustmentValue = ({
	paidHours,
	reports,
	timeSpent,
}: {
	paidHours: number;
	reports: ReportProps[];
	timeSpent: number;
}) => {
	return (paidHours - timeSpent) / getReportsWeeksCount(reports);
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
	const { users, statuses, activities } = useOutletContext<ReportsContext>();
	const { openTask } = useBitrixSlider();
	const [selectedUserId, setSelectedUserId] = useState("");
	const tasksMap = useMemo(
		() => new Map(tasks.map((task) => [String(task.id), task])),
		[tasks],
	);
	const [loadingReport, setLoadingReport] = useState(false);
	const [loadUrl, setLoadUrl] = useState("");
	const { data: allClientReports, setFilters: setAllClientReportsFilters } =
		useLoadAllData<ReportProps>({
			initialEndpoint: Endpoints.crmItems,
			initialFilters: {
				params: {
					entityTypeId: EntityTypeIds.reports,
					select: REPORT_SELECT_FIELDS,
					filter: {
						[ReportCodes.company]: client.ID,
						stageId: "DT1060_15:PREPARATION",
					},
				},
			},
		});

	useEffect(() => {
		setAllClientReportsFilters({
			params: {
				entityTypeId: EntityTypeIds.reports,
				select: REPORT_SELECT_FIELDS,
				filter: {
					[ReportCodes.company]: client.ID,
					stageId: "DT1060_15:PREPARATION",
				},
			},
		});
	}, [client.ID, setAllClientReportsFilters]);

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

	const clientReports = useMemo(() => {
		return reports.filter((report) => {
			const taskId = getReportTaskId(report);
			const task = tasksMap.get(taskId);

			return (client.projects ?? []).some((project) =>
				isReportForProject({
					report,
					task,
					project,
				}),
			);
		});
	}, [client.projects, reports, tasksMap]);

	const clientTasks = useMemo(() => {
		const taskIds = new Set(clientReports.map(getReportTaskId).filter(Boolean));

		return getSortedItems(
			Array.from(taskIds)
				.map((taskId) => tasksMap.get(taskId))
				.filter((task): task is TaskProps => Boolean(task)),
			(a, b) => a.stageId.localeCompare(b.stageId),
		);
	}, [clientReports, tasksMap]);

	const clientUsers = useMemo(() => {
		const userIds = new Set([
			...clientTasks.map((task) => String(task.assignedById)),
			...clientReports.map((report) => String(report.assignedById)),
		]);

		return getSortedItems(
			users.filter((user) => userIds.has(String(user.id))),
			(a, b) => a.title.localeCompare(b.title, "ru"),
		);
	}, [clientReports, clientTasks, users]);

	const filteredReports = useMemo(() => {
		if (!selectedUserId) return clientReports;

		return clientReports.filter(
			(report) => String(report.assignedById) === selectedUserId,
		);
	}, [clientReports, selectedUserId]);

	const filteredTasks = useMemo(() => {
		if (!selectedUserId) return clientTasks;

		return clientTasks.filter(
			(task) => String(task.assignedById) === selectedUserId,
		);
	}, [clientTasks, selectedUserId]);

	const reportsByTask = useMemo(() => {
		return filteredReports.reduce<Record<string, ReportProps[]>>(
			(acc, report) => {
				const taskId = getReportTaskId(report);
				if (!taskId) return acc;

				acc[taskId] = [...(acc[taskId] ?? []), report];
				return acc;
			},
			{},
		);
	}, [filteredReports]);

	const allReportsByTask = useMemo(() => {
		return allClientReports.reduce<Record<string, ReportProps[]>>(
			(acc, report) => {
				const taskId = getReportTaskId(report);
				if (!taskId) return acc;

				acc[taskId] = [...(acc[taskId] ?? []), report];
				return acc;
			},
			{},
		);
	}, [allClientReports]);

	const projectsWithTasks = useMemo(() => {
		return (client.projects ?? [])
			.map((project) => {
				const projectTasks = filteredTasks.filter((task) => {
					const taskProjectId = String(
						task[TaskCodes.parentproject] ?? "",
					).trim();
					const taskCompanyId = String(task[TaskCodes.company] ?? "").trim();
					const projectId = String(project.projectId ?? project.id);
					const companyId = getProjectCompanyId(project);

					return (
						taskProjectId === projectId &&
						(!companyId || taskCompanyId === companyId)
					);
				});

				return {
					project,
					tasks: projectTasks,
				};
			})
			.filter((item) => item.tasks.length);
	}, [client.projects, filteredTasks]);

	const totalSpent = filteredReports.reduce(
		(acc, report) => acc + Number(report[ReportCodes.timeSpent] ?? 0),
		0,
	);
	const totalPlan = filteredTasks.reduce(
		(acc, task) => acc + getTaskEstimate(task),
		0,
	);
	const selectedUser = clientUsers.find(
		(user) => String(user.id) === selectedUserId,
	);

	const getTaskSpent = (taskId: string) => {
		return (reportsByTask[taskId] ?? []).reduce((acc, report) => {
			return acc + Number(report[ReportCodes.timeSpent] ?? 0);
		}, 0);
	};

	const getPaidHoursAdjustment = (task: TaskProps) => {
		const allTaskReports = allReportsByTask[String(task.id)] ?? [];
		const totalTimeSpent = allTaskReports.reduce((acc, report) => {
			return (
				acc + Number(String(report[ReportCodes.timeSpent] ?? 0).replace(",", "."))
			);
		}, 0);
		const paidHours = getTaskPaidHours(task);

		if (paidHours <= 0 || allTaskReports.length === 0) return undefined;

		return {
			value: formatHoursValue(
				getPaidHoursAdjustmentValue({
					paidHours,
					reports: allTaskReports,
					timeSpent: totalTimeSpent,
				}),
			),
			total: formatHoursValue(paidHours),
		};
	};

	const totalPaidHoursAdjustment = filteredTasks.reduce((acc, task) => {
		if (task.stageId !== TASK_STAGE_IDS.DONE) return acc;

		const paidHours = getTaskPaidHours(task);

		if (paidHours <= 0) return acc;

		const allTaskReports = allReportsByTask[String(task.id)] ?? [];
		if (allTaskReports.length === 0) return acc;

		const totalTimeSpent = allTaskReports.reduce((sum, report) => {
			return (
				sum + Number(String(report[ReportCodes.timeSpent] ?? 0).replace(",", "."))
			);
		}, 0);

		return (
			acc +
			getPaidHoursAdjustmentValue({
				paidHours,
				reports: allTaskReports,
				timeSpent: totalTimeSpent,
			})
		);
	}, 0);
	const totalSpentWithPaidHours = totalSpent + totalPaidHoursAdjustment;

	return (
		<div className={styles.clientStatsModal}>
			<header className={styles.clientStatsHeader}>
				<div className={styles.clientStatsTitle}>{getClientTitle(client)}</div>
				{loadUrl === "" ? (
					<button
						disabled={loadingReport}
						type="button"
						className={classNames(styles.primaryButton, {
							[styles.loadingPulse]: loadingReport,
						})}
						onClick={async () =>
							await getReportPdf(client.ID, startOfTheWeek, endOfTheWeek)
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
				<div className={styles.weekSwitcher}>
					<button type="button" onClick={onPrevWeek}>
						пред. неделя
					</button>

					<div className={styles.weekLabel}>
						<span>Неделя</span>
						{dayjs(startOfTheWeek).format("DD.MM")}-
						{dayjs(endOfTheWeek).format("DD.MM")}
					</div>

					<button type="button" onClick={onNextWeek}>
						след. неделя
					</button>
				</div>
				<div className={styles.clientStatsTotal}>
					Всего времени: {totalSpentWithPaidHours.toFixed(2)} ч.
				</div>
			</header>

			<div className={styles.clientStatsBody}>
				<div className={styles.clientTasksColumn}>
					<div className={styles.clientStatsMetric}>
						<span>Задач за неделю: {filteredTasks.length}</span>
					</div>

					{projectsWithTasks.length ? (
						projectsWithTasks.map(({ project, tasks }) => (
							<section key={project.id} className={styles.clientProjectGroup}>
								<div className={styles.clientProjectGroupTitle}>
									<span>{project.title}</span>
									<strong>{tasks.length}</strong>
								</div>

								<div className={styles.clientTaskList}>
									{tasks.map((task) => (
										<div
											key={task.id}
											onClick={() => openTask(task.id, EntityTypeIds.tasks)}
										>
											<TaskItemExtended
												task={task}
												estimateTime={task[TaskCodes.estimateTime]}
												timeSpent={getTaskSpent(String(task.id))}
												paidHoursAdjustment={getPaidHoursAdjustment(task)}
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
				<aside className={styles.clientStatsAside}>
					<div className={styles.clientStatsSummary}>
						<div>
							<span>Всего затрачено за неделю:</span>
							<strong>{totalSpentWithPaidHours.toFixed(2)} ч.</strong>
						</div>
						<div>
							<span>План по часам:</span>
							<strong>{totalPlan.toFixed(2)} ч.</strong>
						</div>
					</div>

					<section className={styles.clientDevelopersCard}>
						<div className={styles.clientStatsSectionTitle}>Разработчики:</div>
						<div className={styles.clientDevelopersList}>
							<button
								type="button"
								className={classNames(styles.clientDeveloperButton, {
									[styles.clientDeveloperButtonActive]: selectedUserId === "",
								})}
								onClick={() => setSelectedUserId("")}
							>
								<span className={styles.clientDeveloperAvatar}>∑</span>
								<span>Все сотрудники</span>
								<strong>{clientTasks.length}</strong>
							</button>
							{clientUsers.map((user: User) => {
								const userTaskCount = clientTasks.filter(
									(task) => String(task.assignedById) === String(user.id),
								).length;

								return (
									<button
										type="button"
										key={user.id}
										className={classNames(styles.clientDeveloperButton, {
											[styles.clientDeveloperButtonActive]:
												selectedUserId === String(user.id),
										})}
										onClick={() => setSelectedUserId(String(user.id))}
									>
										{user.photo ? (
											<img src={user.photo} alt="" />
										) : (
											<span className={styles.clientDeveloperAvatar}>
												{user.title.charAt(0)}
											</span>
										)}
										<span>{user.title}</span>
										<strong>{userTaskCount}</strong>
									</button>
								);
							})}
						</div>
					</section>

					<section className={styles.clientActivityCard}>
						<div className={styles.clientStatsSectionTitle}>
							Активность клиента:
							{selectedUser ? <span>{selectedUser.title}</span> : null}
						</div>
						<ProjectActivityChart
							reports={filteredReports}
							activities={activities}
							users={users}
							startOfWeek={startOfTheWeek}
						/>
					</section>
				</aside>
			</div>
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

	return (
		<>
			<div className={styles.header}>Клиенты:</div>

			<div className={styles.contentContainer}>
				<div className={styles.itemsContainer}>
					{getSortedItems(clients, (a, b) => {
						if (a.projects && b.projects) {
							return b.projects?.length - a.projects?.length;
						}
						return 0;
					}).map((client) => {
						const isExpanded = expandedClients[client.ID];
						const clientProjects = client.projects ?? [];

						return (
							<div key={client.ID} className={styles.clientBlock}>
								<div
									className={styles.clientItem}
									onClick={() => toggleClient(client.ID)}
									aria-expanded={Boolean(isExpanded)}
								>
									<div className={styles.clientTitle}>
										{getClientTitle(client)}
									</div>
									<div className={styles.clientMeta}>
										<span>{clientProjects.length} проектов</span>
										<button
											type="button"
											onClick={(event) => {
												event.stopPropagation();
												toggleClient(client.ID);
											}}
										>
											{isExpanded ? "Свернуть" : "Проекты"}
										</button>
										<button
											type="button"
											onClick={(event) => {
												event.stopPropagation();
												setActiveClient(client);
												setClientOpen(true);
											}}
										>
											Отчёт
										</button>

										<span className={styles.arrow}>
											{isExpanded ? "▲" : "▼"}
										</span>
									</div>
								</div>

								{isExpanded && (
									<div className={styles.projectsList}>
										{getSortedItems(clientProjects, (a, b) => {
											const statusA =
												getProjectMeta(String(a.id))?.status ??
												"Отсутствуют задачи";
											const statusB =
												getProjectMeta(String(b.id))?.status ??
												"Отсутствуют задачи";

											return (
												STATUS_META[statusA].order - STATUS_META[statusB].order
											);
										}).map((project) => {
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
