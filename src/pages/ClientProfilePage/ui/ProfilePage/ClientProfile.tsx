import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { FcConferenceCall, FcPlanner } from "react-icons/fc";
import { MdAddTask } from "react-icons/md";
import { useParams } from "react-router";
import {
	ProjectCodes,
	ReportCodes,
	TaskCodes,
} from "@/components/calendar/constants/const";
import type { ReportProps } from "@/components/calendar/types/types";
import { Modal } from "@/components/modal";
import { Spinner } from "@/components/spinner/Spinner";
import {
	type BitrixUser,
	getUsersByIds,
} from "@/pages/ReportsPage/api/getDevelopers";
import { getItems } from "@/pages/ReportsPage/api/getTasks";
import { groupTasksByProject } from "@/pages/ReportsPage/helpers/groupTasks";
import {
	mapProjectsFromList,
	type ProjectFromList,
} from "@/pages/ReportsPage/ReportsPage";
import { SegmentedControl } from "@/pages/ReportsPage/ui/AnalyticsReports/AnalyticsReports";
import { getProjectStatus } from "@/pages/ReportsPage/ui/ProjectReports/ClientsPage";
import { periodLabelMap } from "@/pages/ReportsPage/ui/SalesPage/SalesPage";
import {
	getClientsFromList,
	getProjectsFromList,
} from "@/shared/api/getCrmFields";
import { $backendApi } from "@/shared/config/axios/axios.config";
import {
	ClientsCodes,
	Endpoints,
	EntityTypeIds,
	TASK_SELECT_FIELDS,
} from "@/shared/constants/const";
import { useLoadAllData } from "@/shared/hooks/useLoadAllTasks";
import { usePeriodBorders } from "@/shared/hooks/usePeriodBorders";
import type {
	ClientListItems,
	ClientProjectProps,
	TaskProps,
} from "@/shared/types/types";
import { notify } from "@/shared/ui/NotificationPopup/notify";
import { getFixedNumber } from "@/shared/utils/getNumber";
import { classNames } from "@/shared/utils/utils";
import brandLogo from "/logo_colored.png";
import { TaskList } from "../TaskList/TaskList";
import styles from "./ClientProfile.module.scss";
import { TaskListByProject } from "./TaskListByProject";
import { UpcomingMeetings } from "./UpcomingMeetings";

const { VITE_BFF_API_URL } = import.meta.env;

export type ViewMode = "list" | "projects";

// const formatDate = (date?: string) => {
// 	if (!date) return "—";

// 	const parsed = dayjs(date);

// 	if (!parsed.isValid()) return date;

// 	return parsed.format("DD.MM.YYYY");
// };

type RoleCode = keyof typeof ProjectCodes;

type RawRoleItem = {
	[key: string]: number | string | string[] | number[] | null;
};

type PreparedRoleUsers = {
	roleCode: RoleCode;
	userIds: number[];
};

const normalizeUserIds = (
	value: number | string | string[] | number[] | null,
): number[] => {
	if (value === null) {
		return [];
	}

	if (Array.isArray(value)) {
		return value.map(Number).filter((id) => Number.isFinite(id) && id > 0);
	}

	const id = Number(value);

	return Number.isFinite(id) && id > 0 ? [id] : [];
};

export const prepareRoleUsers = (
	data: RawRoleItem[][],
): PreparedRoleUsers[] => {
	const items = data.flat();

	return Object.entries(ProjectCodes).map(([roleCode, fieldCode]) => {
		const userIds = items.flatMap((item) => normalizeUserIds(item[fieldCode]));

		return {
			roleCode: roleCode as RoleCode,
			userIds: Array.from(new Set(userIds)),
		};
	});
};

export const getUniqueUserIds = (roles: PreparedRoleUsers[]): number[] => {
	return Array.from(new Set(roles.flatMap((role) => role.userIds)));
};

type RoleWithUsers = PreparedRoleUsers & {
	users: BitrixUser[];
};

export const attachUsersToRoles = (
	roles: PreparedRoleUsers[],
	users: BitrixUser[],
): RoleWithUsers[] => {
	const usersMap = new Map(users.map((user) => [Number(user.ID), user]));

	return roles.map((role) => ({
		...role,
		users: role.userIds
			.map((userId) => usersMap.get(userId))
			.filter((user): user is BitrixUser => Boolean(user)),
	}));
};

export const getRolesWithUsers = async (
	rawData: RawRoleItem[][],
): Promise<RoleWithUsers[]> => {
	const preparedRoles = prepareRoleUsers(rawData);

	const userIds = getUniqueUserIds(preparedRoles);

	const users = await getUsersByIds(userIds);

	return attachUsersToRoles(preparedRoles, users);
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
	const [normalizedProjects, setNormalizedProjects] = useState<
		ProjectFromList[]
	>([]);
	const [_loading, setLoading] = useState(false);

	const [_error, setError] = useState<string | null>(null);

	const [taskList, _setTaskList] = useState<TaskProps[]>([]);

	const [clientData, setClientData] = useState<ClientListItems>();

	const { clientId } = useParams<{ clientId: string }>();

	const { setPeriod, start, end, period, goNext, goPrev } = usePeriodBorders(
		"week",
		"workweek",
	);

	const [viewMode, setViewMode] = useState<ViewMode>("projects");
	const [loadingReport, setLoadingReport] = useState(false);
	const [loadUrl, setLoadUrl] = useState("");

	const [team, setTeam] = useState<RoleWithUsers[]>([]);

	const [open, setOpen] = useState<boolean>(false);

	// const navigate = useNavigate();

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

	const { data } = useLoadAllData<TaskProps>({
		initialEndpoint: Endpoints.crmItems,
		initialFilters: {
			params: {
				entityTypeId: EntityTypeIds.tasks,
				filter: {
					[TaskCodes.client]: clientId,
					">=createdTime": "2026-04-01",
				},
				select: TASK_SELECT_FIELDS,
			},
		},
	});

	const tasksByProject = useMemo(() => {
		return groupTasksByProject(data);
	}, [data]);

	const projectsWithActualIds = projects?.map((project) => ({
		...project,
		projectId:
			normalizedProjects?.find((proj) => Number(proj.projectId) === project.id)
				?.id ?? "",
	}));

	const {
		data: taskFromPeriod,
		setFilters,
		loading: loadingTasks,
	} = useLoadAllData<TaskProps>({
		initialEndpoint: Endpoints.crmItems,
		initialFilters: {
			params: {
				entityTypeId: EntityTypeIds.tasks,
				filter: {
					[TaskCodes.client]: clientId,
					[`>=${TaskCodes.sprintDateStart}`]: start,
					[`<=${TaskCodes.sprintDateStart}`]: end,
				},
				select: TASK_SELECT_FIELDS,
			},
		},
	});

	const {
		data: internalReports,
		setFilters: setForInternal,
		loading: loadingReports,
	} = useLoadAllData<ReportProps>({
		initialEndpoint: Endpoints.crmItems,
		initialFilters: {
			params: {
				entityTypeId: EntityTypeIds.reports,
				filter: {
					[ReportCodes.client]: clientId,
					[ReportCodes.activityType]: "402",
					">=begindate": start,
					"<=begindate": end,
				},
				select: [
					"id",
					"title",
					"begindate",
					ReportCodes.title,
					ReportCodes.timeSpent,
					ReportCodes.project,
					ReportCodes.taskId,
					ReportCodes.activityType,
					"assignedById",
					"createdTime",
					"lastActivityTime",
					`parentId${EntityTypeIds.tasks}`,
				],
			},
		},
	});

	const {
		data: externalReports,
		setFilters: setForExternal,
		loading: loadingExternal,
	} = useLoadAllData<ReportProps>({
		initialEndpoint: Endpoints.crmItems,
		initialFilters: {
			params: {
				entityTypeId: EntityTypeIds.reports,
				filter: {
					[ReportCodes.client]: clientId,
					[ReportCodes.activityType]: "417",
					">=begindate": start,
					"<=begindate": end,
				},
				select: [
					"id",
					"title",
					"begindate",
					ReportCodes.title,
					ReportCodes.timeSpent,
					ReportCodes.project,
					ReportCodes.taskId,
					ReportCodes.activityType,
					"assignedById",
					"createdTime",
					"lastActivityTime",
					`parentId${EntityTypeIds.tasks}`,
				],
			},
		},
	});

	useEffect(() => {
		setFilters({
			params: {
				entityTypeId: EntityTypeIds.tasks,
				filter: {
					[TaskCodes.client]: clientId,
					[`>=${TaskCodes.sprintDateStart}`]: start,
					[`<=${TaskCodes.sprintDateStart}`]: end,
				},
				select: TASK_SELECT_FIELDS,
			},
		});

		setForInternal({
			params: {
				entityTypeId: EntityTypeIds.reports,
				filter: {
					[ReportCodes.client]: clientId,
					[ReportCodes.activityType]: "402",
					">=begindate": start,
					"<=begindate": end,
				},
				select: [
					"id",
					"title",
					"begindate",
					ReportCodes.title,
					ReportCodes.timeSpent,
					ReportCodes.project,
					ReportCodes.taskId,
					ReportCodes.activityType,
					"assignedById",
					"createdTime",
					"lastActivityTime",
					`parentId${EntityTypeIds.tasks}`,
				],
			},
		});

		setForExternal({
			params: {
				entityTypeId: EntityTypeIds.reports,
				filter: {
					[ReportCodes.client]: clientId,
					[ReportCodes.activityType]: "402",
					">=begindate": start,
					"<=begindate": end,
				},
				select: [
					"id",
					"title",
					"begindate",
					ReportCodes.title,
					ReportCodes.timeSpent,
					ReportCodes.project,
					ReportCodes.taskId,
					ReportCodes.activityType,
					"assignedById",
					"createdTime",
					"lastActivityTime",
					`parentId${EntityTypeIds.tasks}`,
				],
			},
		});
	}, [start, end, clientId, setFilters, setForExternal, setForInternal]);

	const totalTime = taskFromPeriod.reduce((acc, task) => {
		if (task[TaskCodes.hours]) {
			acc = acc + +task[TaskCodes.hours];
		} else {
			acc + 0;
		}
		return acc;
	}, 0);

	const commsTotalInternal = internalReports.reduce((acc, report) => {
		return acc + +report[ReportCodes.timeSpent];
	}, 0);

	const commsTotalExternal = externalReports.reduce((acc, report) => {
		return acc + +report[ReportCodes.timeSpent];
	}, 0);

	useEffect(() => {
		const fetchCrew = async () => {
			const responses = await Promise.all(
				projects.map(async (project) => {
					const proj = await getItems<{
						[ProjectCodes.analytic]: number | null;
						[ProjectCodes.qa]: number[];
						[ProjectCodes.pm]: number | null;
						[ProjectCodes.devs]: number[];
					}>({
						typeId: EntityTypeIds.projects,
						filters: {
							id: project.id,
						},
						select: [
							ProjectCodes.analytic,
							ProjectCodes.devs,
							ProjectCodes.pm,
							ProjectCodes.qa,
						],
					});

					return proj;
				}),
			);

			const rolesWithUsers = await getRolesWithUsers(responses);

			setTeam(rolesWithUsers);
		};

		fetchCrew();
	}, [projects]);

	useEffect(() => {
		const fetchProjects = async () => {
			if (!clientId) return;

			try {
				setLoading(true);
				setError(null);

				const response = await getItems<ClientProjectProps>({
					typeId: EntityTypeIds.projects,
					filters: {
						[ClientsCodes.client]: clientId,
					},
				});

				const projectsList = await getProjectsFromList();

				const normalizedProjects = mapProjectsFromList(projectsList);

				setNormalizedProjects(normalizedProjects);

				const fetchclientData = await getClientsFromList();

				setClientData(fetchclientData.find((client) => client.ID === clientId));

				setProjects(response ?? []);
			} catch (err) {
				console.error(err);
				setError("Не удалось загрузить проекты клиента");
			} finally {
				setLoading(false);
			}
		};

		fetchProjects();
	}, [clientId]);

	if (!clientId) return null;

	return (
		// <CheckPermission permission="read" subject={`client-profile-${clientId}`}>
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
							{clientData?.NAME ?? <Spinner onlySpin />}
						</h1>
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
											{period === "week"
												? 75
												: period === "month"
													? 75 * 4
													: period === "quarter"
														? 75 * 12
														: 75 * 48}{" "}
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
											{loadingTasks ? "..." : totalTime} ч.
										</div>
										<button type="button" className={styles.detailsButton}>
											Подробнее
										</button>
									</div>
								</div>
							</div>

							<div className={styles.statCard}>
								<div className={styles.statCardInner}>
									<FcConferenceCall className={styles.statIcon} />

									<div>
										<div className={styles.statLabel}>
											Факт по коммуникациям
										</div>
										<div className={styles.statValue}>
											{loadingReports && loadingExternal
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
							</div>

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
									<div className={styles.badge}>Задач: {data.length} </div>
									{loadUrl === "" ? (
										<button
											disabled={loadingReport}
											type="button"
											className={classNames(styles.primaryButton, {
												[styles.loadingPulse]: loadingReport,
											})}
											onClick={async () =>
												await getReportPdf(clientId, start, end)
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
							normalizedProjects={normalizedProjects}
							tasks={data ?? []}
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

					<div className={styles.sectionCard}>
						<h2
							style={{
								textAlign: "left",
							}}
						>
							Проекты
						</h2>
						<div className={styles.projectsList}>
							{projectsWithActualIds.map((project) => {
								const projTasks = tasksByProject?.[project.projectId];

								const activity = getTasksInWork(projTasks);

								const projReportsTime = internalReports
									?.filter(
										(report) =>
											report[ReportCodes.project] === Number(project.projectId),
									)
									.reduce((acc, report) => {
										if (report[ReportCodes.timeSpent]) {
											acc += +report[ReportCodes.timeSpent];
										}

										return acc;
									}, 0);

								const projReportsTimeExternal = externalReports
									?.filter(
										(report) =>
											report[ReportCodes.project] === Number(project.projectId),
									)
									.reduce((acc, report) => {
										if (report[ReportCodes.timeSpent]) {
											acc += +report[ReportCodes.timeSpent];
										}

										return acc;
									}, 0);

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
								{item.users.map((user) => (
									<div key={user.ID} className={styles.infoTileValue}>
										{`${user.NAME} ${user.LAST_NAME}`}
									</div>
								))}
							</div>
						))}
					</div>
				</div>
			</div>

			<Modal
				isOpen={open}
				onClose={() => setOpen(false)}
				innerScroll
				size="full"
			>
				<TaskList
					tasks={taskList}
					normalizedProjects={normalizedProjects}
					clientsProjects={projects}
				/>
			</Modal>
		</div>
	);
};

export default ClientProfile;
