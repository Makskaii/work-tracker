import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { FcConferenceCall, FcPlanner } from "react-icons/fc";
import { MdAddTask } from "react-icons/md";
import { useParams } from "react-router";
import { TaskCodes } from "@/components/calendar/constants/const";
import { Spinner } from "@/components/spinner/Spinner";
import { SegmentedControl } from "@/pages/ReportsPage/ui/AnalyticsReports/AnalyticsReports";
import { periodLabelMap } from "@/pages/ReportsPage/ui/SalesPage/SalesPage";
import { $backendApi } from "@/shared/config/axios/axios.config";
import { usePeriodBorders } from "@/shared/hooks/usePeriodBorders";
import {
	type ClientListItems,
	type ClientProjectProps,
	type ClientTaskProps,
	ClientTaskStatuses,
} from "@/shared/types/types";
import { getFixedNumber } from "@/shared/utils/getNumber";
import brandLogo from "/logo_colored.png";
import styles from "./ClientProfile.module.scss";
import { CreateTaskProposalModal } from "./CreateTaskProposalModal";
import { HeaderSection, type TaskStatusFilter } from "./HeaderSection";
import { TaskListByProject } from "./TaskListByProject";
import { UpcomingMeetings } from "./UpcomingMeetings";

export type ViewMode = "list" | "projects";

// const formatDate = (date?: string) => {
// 	if (!date) return "—";

// 	const parsed = dayjs(date);

// 	if (!parsed.isValid()) return date;

// 	return parsed.format("DD.MM.YYYY");
// };

const CLIENT_TASKS_CREATED_FROM = "2026-04-01";

const getClientTasks = async (statusFilter: TaskStatusFilter = "all") => {
	const response = await $backendApi.get<ClientTaskProps[]>(
		"clients/me/tasks",
		{
			params: {
				createdFrom: CLIENT_TASKS_CREATED_FROM,
				status: statusFilter === "all" ? undefined : statusFilter,
			},
		},
	);

	return response.data ?? [];
};

const approveClientTask = async (taskId: string | number) => {
	await $backendApi.patch(`clients/me/tasks/${taskId}/approve`);
};

type RoleCode = "pm" | "analytic" | "qa" | "devs";

type ClientTeamUser = {
	id?: string | number;

	name?: string;
	lastName?: string;

	title?: string;
};

type RoleWithUsers = {
	roleCode: RoleCode;
	users: ClientTeamUser[];
};

type ClientTeamDto = RoleWithUsers[] | Record<string, unknown>;

type ClientStatsDto = {
	purchasedHours: number | null;
	period: {
		start: string;
		end: string;
	};
	tasks: {
		count: number;
		totalTime: number;
	};
	communications: {
		totalTime: number;
		internal: {
			activityType: "402";
			count: number;
			totalTime: number;
		};
		external: {
			activityType: "417";
			count: number;
			totalTime: number;
		};
	};
};

const ROLE_CODES: RoleCode[] = ["pm", "analytic", "qa", "devs"];

const isRecord = (value: unknown): value is Record<string, unknown> => {
	return typeof value === "object" && value !== null && !Array.isArray(value);
};

const isRoleCode = (value: unknown): value is RoleCode => {
	return typeof value === "string" && ROLE_CODES.includes(value as RoleCode);
};

const toStringOrNumber = (value: unknown) => {
	if (typeof value === "string" || typeof value === "number") {
		return value;
	}

	return undefined;
};

const toOptionalString = (value: unknown) => {
	return typeof value === "string" ? value : undefined;
};

const normalizeTeamUser = (value: unknown): ClientTeamUser | null => {
	if (typeof value === "string") {
		return { name: value };
	}

	if (!isRecord(value)) {
		return null;
	}

	return {
		id: toStringOrNumber(value.id),
		name: toOptionalString(value.name),
		lastName: toOptionalString(value.lastName),
		title: toOptionalString(value.title),
	};
};

const normalizeTeamUsers = (value: unknown): ClientTeamUser[] => {
	if (Array.isArray(value)) {
		return value
			.map((user) => normalizeTeamUser(user))
			.filter((user): user is ClientTeamUser => Boolean(user));
	}

	if (isRecord(value) && Array.isArray(value.users)) {
		return normalizeTeamUsers(value.users);
	}

	return [];
};

const normalizeTeam = (data: ClientTeamDto): RoleWithUsers[] => {
	if (Array.isArray(data)) {
		return data
			.map((item) => {
				if (!isRecord(item) || !isRoleCode(item.roleCode)) {
					return null;
				}

				return {
					roleCode: item.roleCode,
					users: normalizeTeamUsers(item.users),
				};
			})
			.filter((role): role is RoleWithUsers => Boolean(role));
	}

	return ROLE_CODES.map((roleCode) => ({
		roleCode,
		users: normalizeTeamUsers(data[roleCode]),
	}));
};

const normalizeProjects = (
	projects: ClientProjectProps[],
): ClientProjectProps[] => {
	return projects.map((project) => ({
		...project,
		id: Number(project.id),
		projectId: String(project.projectId ?? project.id),
	}));
};

const getTeamUserKey = (user: ClientTeamUser, index: number) => {
	return String(user.id ?? user.name ?? user.title ?? index);
};

const getTeamUserName = (user: ClientTeamUser) => {
	if (user.title) {
		return user.title;
	}

	return [user.name, user.lastName].filter(Boolean).join(" ");
};

const formatTaskHours = (value?: string | number | null) => {
	if (value === undefined || value === null || value === "") {
		return "0 ч.";
	}

	const numericValue = Number(value);

	if (Number.isNaN(numericValue)) {
		return `${value} ч.`;
	}

	return `${getFixedNumber(numericValue)} ч.`;
};

type ApprovalTasksBannerProps = {
	tasks: ClientTaskProps[];
	selectedTask: ClientTaskProps | null;
	approvingTaskId: string | null;
	confirmingTaskId: string | null;
	error: string | null;
	onSelectTask: (taskId: string) => void;
	onRequestApproveTask: (taskId: string) => void;
	onApproveTask: (task: ClientTaskProps) => void;
};

const ApprovalTasksBanner = ({
	tasks,
	selectedTask,
	approvingTaskId,
	confirmingTaskId,
	error,
	onSelectTask,
	onRequestApproveTask,
	onApproveTask,
}: ApprovalTasksBannerProps) => {
	if (!tasks.length) {
		return null;
	}

	return (
		<section className={styles.approvalBanner}>
			<div className={styles.approvalBannerHeader}>
				<div>
					<h2 className={styles.approvalBannerTitle}>
						Задачи требуют внимания
					</h2>
					<p className={styles.approvalBannerText}>
						Подтвердите задачи, которые команда готова взять в работу.
					</p>
				</div>

				<span className={styles.approvalCounter}>{tasks.length}</span>
			</div>

			<div className={styles.approvalTaskList}>
				{tasks.map((task) => (
					<button
						key={task.id}
						type="button"
						className={`${styles.approvalTaskButton} ${
							selectedTask?.id === task.id
								? styles.approvalTaskButtonActive
								: ""
						}`}
						onClick={() => onSelectTask(task.id)}
					>
						<span className={styles.approvalTaskTitle}>{task.title}</span>
						<span className={styles.approvalTaskHours}>
							{formatTaskHours(task[TaskCodes.hours])}
						</span>
					</button>
				))}
			</div>

			{selectedTask && (
				<div className={styles.approvalTaskDetails}>
					<h3 className={styles.approvalDetailsTitle}>{selectedTask.title}</h3>

					<div className={styles.approvalDetailsMeta}>
						<span>План: {formatTaskHours(selectedTask[TaskCodes.hours])}</span>
					</div>

					<div className={styles.approvalDescription}>
						{selectedTask[TaskCodes.description]
							? String(selectedTask[TaskCodes.description])
							: "Описание отсутствует"}
					</div>

					{error && <div className={styles.approvalError}>{error}</div>}

					<button
						type="button"
						className={`${styles.approvalApproveButton} ${
							confirmingTaskId === selectedTask.id
								? styles.approvalApproveButtonConfirm
								: ""
						}`}
						disabled={approvingTaskId === selectedTask.id}
						onClick={() => {
							if (confirmingTaskId !== selectedTask.id) {
								onRequestApproveTask(selectedTask.id);
								return;
							}

							onApproveTask(selectedTask);
						}}
					>
						{approvingTaskId === selectedTask.id
							? "Подтверждаем..."
							: confirmingTaskId === selectedTask.id
								? "Точно подтвердить?"
								: "Подтвердить"}
					</button>
				</div>
			)}
		</section>
	);
};

export const getTasksInWork = (tasks?: ClientTaskProps[]) => {
	if (!tasks?.length) {
		return {
			text: "Нет задач",
			type: "idle",
		};
	}

	const inWorkTasks = tasks.filter(
		(task) => task.status === ClientTaskStatuses.inWork,
	);

	return {
		text: `Задач в работе: ${inWorkTasks.length}`,
		type: inWorkTasks.length > 0 ? "active" : "idle",
	};
};

const getClientProjectStatus = (tasks?: ClientTaskProps[]) => {
	if (!tasks?.length) {
		return "Отсутствуют задачи";
	}

	if (tasks.some((task) => task.status === ClientTaskStatuses.approval)) {
		return "Требует внимания";
	}

	if (tasks.some((task) => task.status === ClientTaskStatuses.inWork)) {
		return "Активен";
	}

	if (tasks.some((task) => task.status === ClientTaskStatuses.newProposal)) {
		return "Новая заявка";
	}

	if (tasks.some((task) => task.status === ClientTaskStatuses.backlog)) {
		return "Беклог";
	}

	if (tasks.some((task) => task.status === ClientTaskStatuses.done)) {
		return "Завершен";
	}

	return "Отсутствуют задачи";
};

const ClientProfile = () => {
	const [projects, setProjects] = useState<ClientProjectProps[]>([]);

	const [loadingStats, setLoadingStats] = useState(false);

	const [error, setError] = useState<string | null>(null);

	const [tasks, setTasks] = useState<ClientTaskProps[]>([]);

	const [approvalTasks, setApprovalTasks] = useState<ClientTaskProps[]>([]);

	const [selectedApprovalTaskId, setSelectedApprovalTaskId] = useState<
		string | null
	>(null);

	const [approvingTaskId, setApprovingTaskId] = useState<string | null>(null);

	const [confirmingApprovalTaskId, setConfirmingApprovalTaskId] = useState<
		string | null
	>(null);

	const [approvalError, setApprovalError] = useState<string | null>(null);

	const [clientStats, setClientStats] = useState<ClientStatsDto>();

	const [clientData, setClientData] = useState<ClientListItems>();

	const { companyId } = useParams<{ companyId: string }>();

	const { setPeriod, start, end, period, goNext, goPrev } = usePeriodBorders(
		"week",
		"workweek",
	);

	const [viewMode, setViewMode] = useState<ViewMode>("projects");

	const [taskStatusFilter, setTaskStatusFilter] =
		useState<TaskStatusFilter>("all");

	const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);

	const [team, setTeam] = useState<RoleWithUsers[]>([]);

	const refreshClientTasks = async () => {
		const nextTasks = await getClientTasks(taskStatusFilter);
		const nextApprovalTasks =
			taskStatusFilter === "approval"
				? nextTasks
				: await getClientTasks("approval");

		setTasks(nextTasks);
		setApprovalTasks(nextApprovalTasks);
	};

	useEffect(() => {
		if (!companyId) {
			return;
		}

		let ignore = false;

		const fetchClientData = async () => {
			try {
				setError(null);

				const [companyResponse, projectsResponse, teamResponse] =
					await Promise.all([
						$backendApi.get<ClientListItems>("clients/me/company"),
						$backendApi.get<ClientProjectProps[]>("clients/me/projects"),
						$backendApi.get<ClientTeamDto>("clients/me/team"),
					]);

				if (ignore) {
					return;
				}

				setClientData(companyResponse.data);
				setProjects(normalizeProjects(projectsResponse.data ?? []));
				setTeam(normalizeTeam(teamResponse.data));
			} catch (err) {
				console.error(err);
				setError("Не удалось загрузить данные клиента");
			}
		};

		fetchClientData();

		return () => {
			ignore = true;
		};
	}, [companyId]);

	useEffect(() => {
		if (!companyId) {
			return;
		}

		let ignore = false;

		const fetchClientTasks = async () => {
			try {
				const nextTasks = await getClientTasks(taskStatusFilter);
				const nextApprovalTasks =
					taskStatusFilter === "approval"
						? nextTasks
						: await getClientTasks("approval");

				if (!ignore) {
					setTasks(nextTasks);
					setApprovalTasks(nextApprovalTasks);
				}
			} catch (err) {
				console.error(err);

				if (!ignore) {
					setError(
						"Не удалось загрузить задачи клиента. Попробуйте обновить страницу позже.",
					);
				}
			}
		};

		fetchClientTasks();

		return () => {
			ignore = true;
		};
	}, [companyId, taskStatusFilter]);

	useEffect(() => {
		if (!companyId) {
			return;
		}

		let ignore = false;

		const fetchClientStats = async () => {
			try {
				setLoadingStats(true);

				const response = await $backendApi.get<ClientStatsDto>(
					"clients/me/stats",
					{
						params: {
							start: CLIENT_TASKS_CREATED_FROM,
							end: dayjs().endOf("day").toISOString(),
						},
					},
				);

				if (!ignore) {
					setClientStats(response.data);
				}
			} catch (err) {
				console.error(err);

				if (!ignore) {
					setError("Не удалось загрузить статистику клиента");
				}
			} finally {
				if (!ignore) {
					setLoadingStats(false);
				}
			}
		};

		fetchClientStats();

		return () => {
			ignore = true;
		};
	}, [companyId]);

	const tasksByProject = useMemo(() => {
		return Object.groupBy(tasks, (task) => {
			return String(task[TaskCodes.parentproject] ?? "unknown");
		});
	}, [tasks]);

	const selectedApprovalTask = useMemo(() => {
		if (!approvalTasks.length) {
			return null;
		}

		return (
			approvalTasks.find((task) => task.id === selectedApprovalTaskId) ??
			approvalTasks[0]
		);
	}, [approvalTasks, selectedApprovalTaskId]);

	const handleApproveTask = async (task: ClientTaskProps) => {
		const numericTaskId = Number(task.id);

		if (!Number.isFinite(numericTaskId)) {
			setApprovalError("Не удалось определить задачу для подтверждения.");
			return;
		}

		try {
			setApprovalError(null);
			setApprovingTaskId(task.id);

			await approveClientTask(numericTaskId);
			await refreshClientTasks();

			setSelectedApprovalTaskId(null);
			setConfirmingApprovalTaskId(null);
		} catch (err) {
			console.error(err);
			setApprovalError(
				"Не удалось подтвердить задачу. Попробуйте обновить страницу позже.",
			);
		} finally {
			setApprovingTaskId(null);
		}
	};

	// const taskFromPeriod = useMemo(() => {
	// 	const startDate = dayjs(start).startOf("day").valueOf();
	// 	const endDate = dayjs(end).endOf("day").valueOf();

	// 	return tasks.filter((task) => {
	// 		const sprintStart = task[TaskCodes.sprintDateStart];

	// 		if (!sprintStart) {
	// 			return false;
	// 		}

	// 		const sprintStartDate = dayjs(sprintStart).valueOf();

	// 		return sprintStartDate >= startDate && sprintStartDate <= endDate;
	// 	});
	// }, [end, start, tasks]);

	const commsTotalInternal =
		clientStats?.communications.internal.totalTime ?? 0;

	const commsTotalExternal =
		clientStats?.communications.external.totalTime ?? 0;

	const isTeamExists = team.filter((item) => item.users.length > 0).length > 0;

	if (!companyId) return null;

	return (
		<div className={styles.page}>
			<div className={styles.headerCard}>
				<div className={styles.headerInfo}>
					<div className={styles.brandBlock}>
						<img className={styles.brandLogo} src={brandLogo} alt="Логотип" />

						<div className={styles.brandText}>
							<h1 className={styles.pageTitle}>
								Evolutions Client&apos;s Desk
							</h1>
							<div className={styles.badge}>Кабинет клиента</div>
						</div>
					</div>

					<div className={styles.clientBlock}>
						<h1 className={styles.clientTitle}>
							{clientData?.title ?? clientData?.NAME ?? <Spinner onlySpin />}
						</h1>
						{error && <div className={styles.badge}>{error}</div>}
					</div>
				</div>
			</div>

			<div className={styles.content}>
				<div className={styles.mainColumn}>
					<div className={styles.sectionCard}>
						<h2 className={styles.infoTitle}>Общая информация</h2>

						<div className={styles.infoGrid}>
							<div className={styles.statCard}>
								<div className={styles.statCardInner}>
									<FcPlanner className={styles.statIcon} />

									<div>
										<div className={styles.statLabel}>План часов</div>
										<div className={styles.statValue}>
											{loadingStats
												? "..."
												: clientStats?.purchasedHours
													? clientStats?.purchasedHours
													: period === "week"
														? 75
														: period === "month"
															? 75 * 4
															: period === "quarter"
																? 75 * 12
																: 75 * 48}
											ч.
										</div>
									</div>
								</div>
							</div>

							<div className={styles.statCard}>
								<div className={styles.statCardInner}>
									<MdAddTask className={styles.statIconBlue} />

									<div>
										<div className={styles.statLabel}>Факт по задачам</div>
										<div className={styles.statValue}>
											{loadingStats ? "..." : clientStats?.tasks.totalTime} ч.
										</div>
									</div>
								</div>
							</div>

							<div className={styles.statCard}>
								{!clientStats?.purchasedHours ? (
									<div className={styles.statCardInner}>
										<FcConferenceCall className={styles.statIcon} />

										<div>
											<div className={styles.statLabel}>
												{loadingStats ? "..." : "Факт по коммуникациям"}
											</div>
											<div className={styles.statValue}>
												{loadingStats
													? "..."
													: getFixedNumber(
															commsTotalInternal + commsTotalExternal,
														)}{" "}
												ч.
											</div>
										</div>
									</div>
								) : (
									<div className={styles.statCardInner}>
										<FcConferenceCall className={styles.statIcon} />

										<div>
											<div className={styles.statLabel}>Остаток</div>
											<div className={styles.statValue}>
												{loadingStats
													? "..."
													: getFixedNumber(
															clientStats.purchasedHours -
																clientStats.tasks.totalTime,
														)}{" "}
												ч.
											</div>
										</div>
									</div>
								)}
							</div>

							{!clientStats?.purchasedHours && !loadingStats && (
								<div className={`${styles.statCard} ${styles.periodCard}`}>
									<div className={styles.periodHeader}>Период</div>

									<SegmentedControl onChange={setPeriod} value={period} />

									<div className={styles.periodNavigation}>
										<button
											type="button"
											className={styles.periodButton}
											onClick={() => goPrev()}
										>
											пред. {periodLabelMap[period]}
										</button>

										<div className={styles.periodDates}>
											{`${dayjs(start).format("DD.MM.YYYY")} - ${dayjs(
												end,
											).format("DD.MM.YYYY")}`}
										</div>

										<button
											type="button"
											className={styles.periodButton}
											onClick={() => goNext()}
										>
											след. {periodLabelMap[period]}
										</button>
									</div>
								</div>
							)}
						</div>
					</div>

					<div className={styles.sectionCard}>
						<HeaderSection
							setViewMode={setViewMode}
							viewMode={viewMode}
							taskStatusFilter={taskStatusFilter}
							setTaskStatusFilter={setTaskStatusFilter}
							onCreateTask={() => setIsCreateTaskModalOpen(true)}
							tasksCount={tasks.length}
							companyId={companyId}
							start={start}
							end={end}
						/>

						<TaskListByProject
							tasks={tasks}
							onTaskClick={(task) => {
								console.log("clicked task", task);
							}}
							clientsProjects={projects}
							view={viewMode}
						/>
					</div>
				</div>

				<div className={styles.sideColumn}>
					<ApprovalTasksBanner
						tasks={approvalTasks}
						selectedTask={selectedApprovalTask}
						approvingTaskId={approvingTaskId}
						confirmingTaskId={confirmingApprovalTaskId}
						error={approvalError}
						onSelectTask={(taskId) => {
							setSelectedApprovalTaskId(taskId);
							setApprovalError(null);
							setConfirmingApprovalTaskId(null);
						}}
						onRequestApproveTask={(taskId) => {
							setApprovalError(null);
							setConfirmingApprovalTaskId(taskId);
						}}
						onApproveTask={handleApproveTask}
					/>

					<UpcomingMeetings />

					{projects.length > 0 && (
						<div className={styles.sectionCard}>
							<h2
								style={{
									textAlign: "left",
								}}
							>
								Проекты
							</h2>

							<div className={styles.projectsList}>
								{projects.map((project) => {
									const projTasks = tasksByProject?.[project.projectId];

									const activity = getTasksInWork(projTasks);
									const projectStatus = getClientProjectStatus(projTasks);

									const projReportsTime = 0;

									const projReportsTimeExternal = 0;

									return (
										<div key={project.id} className={styles.projectCard}>
											<div className={styles.projectTop}>
												<div className={styles.projectMainInfo}>
													<div className={styles.projectTitleRow}>
														<h3 className={styles.projectTitle}>
															{project.title}
														</h3>

														{projTasks && (
															<span
																className={`${styles.activityBadge} ${
																	projectStatus === "Требует внимания" ||
																	projectStatus === "Новая заявка"
																		? styles.activityWarning
																		: activity.type === "active"
																			? styles.activityActive
																			: activity.type === "warning"
																				? styles.activityWarning
																				: styles.activityIdle
																}`}
															>
																{projectStatus}
															</span>
														)}
													</div>
												</div>
											</div>
											<div className={styles.projectBody}>
												<div className={styles.infoTileLabel}>
													{"Кол-во часов по задачам:"}{" "}
												</div>
												<div className={styles.infoTileValue}>
													{clientStats?.tasks.totalTime}
												</div>

												<div className={styles.infoTileLabel}>
													Кол-во по коммуникациям:
												</div>
												<div className={styles.infoTileValue}>
													{getFixedNumber(
														projReportsTime + projReportsTimeExternal,
													)}
												</div>
											</div>
										</div>
									);
								})}
							</div>
						</div>
					)}

					{isTeamExists && (
						<div className={styles.sectionCard}>
							<h2 className={styles.sectionTitle}>Команда</h2>

							{team.map((item) => (
								<div
									style={{
										textAlign: "left",
									}}
									key={item.roleCode}
									className={styles.infoTile}
								>
									<div className={styles.infoTileLabel}>
										{item.roleCode === "pm"
											? "PM"
											: item.roleCode === "analytic"
												? "Аналитик"
												: item.roleCode === "qa"
													? "QA"
													: "Разработчики"}
									</div>
									{item.users.map((user, index) => (
										<div
											key={getTeamUserKey(user, index)}
											className={styles.infoTileValue}
										>
											{getTeamUserName(user)}
										</div>
									))}
								</div>
							))}
						</div>
					)}
				</div>
			</div>

			<CreateTaskProposalModal
				isOpen={isCreateTaskModalOpen}
				onClose={() => setIsCreateTaskModalOpen(false)}
				onCreated={refreshClientTasks}
				projects={projects}
			/>
		</div>
	);
};

export default ClientProfile;
