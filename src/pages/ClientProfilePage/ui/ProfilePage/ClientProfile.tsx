import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { FcConferenceCall, FcPlanner } from "react-icons/fc";
import { MdAddTask } from "react-icons/md";
import { useParams } from "react-router";
import { ReportCodes, TaskCodes } from "@/components/calendar/constants/const";
import type { ReportProps } from "@/components/calendar/types/types";
import { Modal } from "@/components/modal";
import { Spinner } from "@/components/spinner/Spinner";
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
import { classNames } from "@/shared/utils/utils";
import brandLogo from "/logo_colored.png";
import { TaskList } from "../TaskList/TaskList";
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

	const [open, setOpen] = useState<boolean>(false);

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

	const { data } = useLoadAllData<TaskProps>({
		initialEndpoint: Endpoints.crmItems,
		initialFilters: {
			params: {
				entityTypeId: EntityTypeIds.tasks,
				filter: {
					[TaskCodes.client]: clientId,
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

	const { data: taskFromPeriod } = useLoadAllData<TaskProps>({
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

	const { data: internalReports } = useLoadAllData<ReportProps>({
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

	const { data: externalReports } = useLoadAllData<ReportProps>({
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

	const totalTime = taskFromPeriod.reduce(
		(acc, task) => acc + +task[TaskCodes.estimateTime],
		0,
	);

	const commsTotalInternal = internalReports.reduce((acc, report) => {
		return acc + +report[ReportCodes.timeSpent];
	}, 0);

	const commsTotalExternal = externalReports.reduce((acc, report) => {
		console.log({ report });
		return acc + +report[ReportCodes.timeSpent];
	}, 0);

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
					<div
						style={{
							display: "flex",
						}}
					>
						<img src={brandLogo} alt="Логотип" width={"50px"} height={"50px"} />
						<div
							style={{
								display: "flex",
								flexDirection: "column",
								gap: "10px",
							}}
						>
							<h1 className={styles.pageTitle}>Evolutions Client's Desk</h1>
							<div className={styles.badge}>Кабинет клиента</div>
						</div>
					</div>
					<h1 className={styles.pageTitle}>
						{clientData?.NAME ?? <Spinner onlySpin />}
					</h1>
				</div>
			</div>

			<div className={styles.content}>
				<div className={styles.mainColumn}>
					<div className={styles.sectionCard}>
						<h2
							style={{
								textAlign: "left",
							}}
						>
							Общая информация
						</h2>
						<div
							style={{
								display: "grid",
								gridTemplateColumns: "1fr 1fr 1fr 1.5fr",
								gap: "10px",
							}}
						>
							<div className={styles.statCard}>
								<div
									style={{
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										gap: "1rem",
									}}
								>
									<div>
										<FcPlanner
											style={{
												width: "50px",
												height: "50px",
											}}
										/>
									</div>
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
								<div
									style={{
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										gap: "1rem",
									}}
								>
									<div>
										<MdAddTask
											style={{
												width: "50px",
												height: "50px",
												color: "blue",
											}}
										/>
									</div>
									<div>
										<div className={styles.statLabel}>Факт по задачам</div>
										<div className={styles.statValue}>{totalTime} ч.</div>
										<div
											style={{
												color: "blue",
											}}
										>
											Подробнее
										</div>
									</div>
								</div>
							</div>
							<div className={styles.statCard}>
								<div
									style={{
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										gap: "1rem",
									}}
								>
									<div>
										<FcConferenceCall
											style={{
												width: "50px",
												height: "50px",
											}}
										/>
									</div>
									<div>
										<div className={styles.statLabel}>
											Факт по коммуникациям
										</div>
										<div className={styles.statValue}>
											{commsTotalInternal + commsTotalExternal} ч.
										</div>
										<div
											style={{
												color: "blue",
											}}
										>
											Подробнее
										</div>
									</div>
								</div>
							</div>
							<div className={styles.statCard}>
								<div>
									<div>Период</div>
								</div>
								<SegmentedControl onChange={setPeriod} value={period} />

								<div
									style={{
										display: "flex",
										alignItems: "center",
										justifyContent: "space-evenly",
									}}
								>
									<button
										style={{ background: "white", color: "#aeacac" }}
										onClick={() => goPrev()}
									>
										пред. {periodLabelMap[period]}
									</button>
									<div
										style={{
											display: "flex",
											flexDirection: "column",
											alignItems: "center",
										}}
									>
										<div>
											{`${dayjs(start).format("DD.MM.YYYY")} - ${dayjs(end).format("DD.MM.YYYY")}`}
										</div>
									</div>
									<button
										style={{ background: "white", color: "#aeacac" }}
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
												{projReportsTime + projReportsTimeExternal}
											</div>
										</div>
									</div>
								);
							})}
						</div>
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
		// </CheckPermission>
	);
};

export default ClientProfile;
