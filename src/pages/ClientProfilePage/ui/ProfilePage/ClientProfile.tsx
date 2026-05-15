import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { FcConferenceCall, FcPlanner } from "react-icons/fc";
import { MdAddTask } from "react-icons/md";
import { useParams } from "react-router";
import { TaskCodes } from "@/components/calendar/constants/const";
import { Spinner } from "@/components/spinner/Spinner";
import { groupTasksByProject } from "@/pages/ReportsPage/helpers/groupTasks";
import { SegmentedControl } from "@/pages/ReportsPage/ui/AnalyticsReports/AnalyticsReports";
import { getProjectStatus } from "@/pages/ReportsPage/ui/ProjectReports/ClientsPage";
import { periodLabelMap } from "@/pages/ReportsPage/ui/SalesPage/SalesPage";
import { $backendApi } from "@/shared/config/axios/axios.config";
import { usePeriodBorders } from "@/shared/hooks/usePeriodBorders";
import type {
	ClientListItems,
	ClientProjectProps,
	TaskProps,
} from "@/shared/types/types";
import { getFixedNumber } from "@/shared/utils/getNumber";
import { classNames } from "@/shared/utils/utils";
import brandLogo from "/logo_colored.png";
import styles from "./ClientProfile.module.scss";
import { TaskListByProject } from "./TaskListByProject";
import { UpcomingMeetings } from "./UpcomingMeetings";

// const { VITE_BFF_API_URL } = import.meta.env;

export type ViewMode = "list" | "projects";

// const formatDate = (date?: string) => {
// 	if (!date) return "—";

// 	const parsed = dayjs(date);

// 	if (!parsed.isValid()) return date;

// 	return parsed.format("DD.MM.YYYY");
// };

const CLIENT_TASKS_CREATED_FROM = "2026-04-01";

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

export const getTasksInWork = (tasks?: TaskProps[]) => {
	if (!tasks?.length) {
		return {
			text: "Нет задач",
			type: "idle",
		};
	}

	const inWorkTasks = tasks.filter(
		(task) =>
			task.stageId === "DT1072_18:PREPARATION" ||
			task.stageId === "DT1072_18:CLIENT" ||
			task.stageId === "DT1072_18:UC_EW15HA" ||
			task.stageId === "DT1072_18:UC_6BH5MH" ||
			task.stageId === "DT1072_18:UC_5GG9S1",
	);

	return {
		text: `Задач в работе: ${inWorkTasks.length}`,
		type: "active",
	};
};

const ClientProfile = () => {
	const [projects, setProjects] = useState<ClientProjectProps[]>([]);

	const [loadingStats, setLoadingStats] = useState(false);

	const [error, setError] = useState<string | null>(null);

	const [tasks, setTasks] = useState<TaskProps[]>([]);

	const [clientStats, setClientStats] = useState<ClientStatsDto>();

	const [clientData, setClientData] = useState<ClientListItems>();

	const { companyId } = useParams<{ companyId: string }>();

	const { setPeriod, start, end, period, goNext, goPrev } = usePeriodBorders(
		"week",
		"workweek",
	);

	const [viewMode, setViewMode] = useState<ViewMode>("projects");
	// const [loadingReport, setLoadingReport] = useState(false);
	// const [loadUrl, setLoadUrl] = useState("");

	const [team, setTeam] = useState<RoleWithUsers[]>([]);

	// const navigate = useNavigate();

	// const getReportPdf = async (
	// 	id: string,
	// 	startOfThePeriod: string,
	// 	endOfThePeriod: string,
	// ) => {
	// 	try {
	// 		setLoadingReport(true);
	// 		const response = await $backendApi.post("doc-records/client-report", {
	// 			id,
	// 			startOfThePeriod,
	// 			endOfThePeriod,
	// 		});

	// 		const downloadUrl = response.data.downloadUrl;

	// 		setLoadUrl(`${VITE_BFF_API_URL}${downloadUrl}`);

	// 		notify({
	// 			message: "Отчет сформирован",
	// 			type: "success",
	// 		});
	// 	} catch (error) {
	// 		console.log(error);

	// 		notify({
	// 			message: "Ошибка загрузки отчёта",
	// 			type: "error",
	// 		});
	// 	} finally {
	// 		setLoadingReport(false);
	// 	}
	// };

	useEffect(() => {
		if (!companyId) {
			return;
		}

		let ignore = false;

		const fetchClientData = async () => {
			try {
				setError(null);

				const [companyResponse, projectsResponse, tasksResponse, teamResponse] =
					await Promise.all([
						$backendApi.get<ClientListItems>("clients/me/company"),
						$backendApi.get<ClientProjectProps[]>("clients/me/projects"),
						$backendApi.get<TaskProps[]>("clients/me/tasks", {
							params: {
								createdFrom: CLIENT_TASKS_CREATED_FROM,
							},
						}),
						$backendApi.get<ClientTeamDto>("clients/me/team"),
					]);

				if (ignore) {
					return;
				}

				setClientData(companyResponse.data);
				setProjects(normalizeProjects(projectsResponse.data ?? []));
				setTasks(tasksResponse.data ?? []);
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

		const fetchClientStats = async () => {
			try {
				setLoadingStats(true);

				const response = await $backendApi.get<ClientStatsDto>(
					"clients/me/stats",
					{
						params: {
							start,
							end,
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
	}, [companyId, end, start]);

	const tasksByProject = useMemo(() => {
		return groupTasksByProject(tasks);
	}, [tasks]);

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

	const totalTimeFromTasks = tasks.reduce((acc, task) => {
		if (task[TaskCodes.hours]) {
			acc = acc + +task[TaskCodes.hours];
		} else {
			acc + 0;
		}
		return acc;
	}, 0);

	const totalTime = totalTimeFromTasks;

	const commsTotalInternal =
		clientStats?.communications.internal.totalTime ?? 0;

	const commsTotalExternal =
		clientStats?.communications.external.totalTime ?? 0;

	const isTeamExists = team.filter((item) => item.users.length > 0).length > 0;

	if (!companyId) return null;

	return (
		// <CheckPermission permission="read" subject={`client-profile-${companyId}`}>
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
											{loadingStats ? "..." : totalTime} ч.
										</div>
										<button type="button" className={styles.detailsButton}>
											Подробнее
										</button>
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
											<button type="button" className={styles.detailsButton}>
												Подробнее
											</button>
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
															clientStats.purchasedHours - totalTime,
														)}{" "}
												ч.
											</div>
											<button type="button" className={styles.detailsButton}>
												Подробнее
											</button>
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
						<div className={styles.sectionHeader}>
							<div
								style={{
									display: "flex",
									justifyContent: "space-between",
									width: "100%",
								}}
							>
								<div
									style={{
										display: "flex",
										alignItems: "center",
										gap: "1rem",
									}}
								>
									<h2
										style={{
											textAlign: "left",
										}}
										className={styles.sectionTitle}
									>
										Все задачи
									</h2>
									<div className={styles.badge}>
										Задач: {clientStats?.tasks.count ?? tasks.length}{" "}
									</div>
									{/* {loadUrl === "" ? (
										<button
											disabled={loadingReport}
											type="button"
											className={classNames(styles.primaryButton, {
												[styles.loadingPulse]: loadingReport,
											})}
											onClick={async () =>
												await getReportPdf(companyId, start, end)
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
									)} */}
								</div>

								<div className={styles.toolbar}>
									<div className={styles.viewModeSwitcher}>
										<button
											type="button"
											className={classNames(styles.viewModeButton, {
												[styles.viewModeButtonActive]: viewMode === "list",
											})}
											onClick={() => setViewMode("list")}
										>
											Режим список
										</button>

										<button
											type="button"
											className={classNames(styles.viewModeButton, {
												[styles.viewModeButtonActive]: viewMode === "projects",
											})}
											onClick={() => setViewMode("projects")}
										>
											По проектам
										</button>
									</div>
								</div>
							</div>
						</div>

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
																	activity.type === "active"
																		? styles.activityActive
																		: activity.type === "warning"
																			? styles.activityWarning
																			: styles.activityIdle
																}`}
															>
																{getProjectStatus(projTasks)}
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
													{projTasks?.reduce((acc, task) => {
														return acc + +(task[TaskCodes.hours] ?? 0);
													}, 0)}
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
		</div>
		// </CheckPermission>
	);
};

export default ClientProfile;
