import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { TaskCodes } from "@/components/calendar/constants/const";
import { getItems } from "@/pages/ReportsPage/api/getTasks";
import { TASK_STAGE_IDS } from "@/pages/ReportsPage/constants/statuses";
import {
	mapProjectsFromList,
	type ProjectFromList,
} from "@/pages/ReportsPage/ReportsPage";
import { getProjectStatus } from "@/pages/ReportsPage/ui/ProjectReports/ClientsPage";
import { getProjectsFromList } from "@/shared/api/getCrmFields";
import { $backendApi } from "@/shared/config/axios/axios.config";
import {
	ClientsCodes,
	EntityTypeIds,
	TASK_SELECT_FIELDS,
} from "@/shared/constants/const";
import type { ClientProjectProps, TaskProps } from "@/shared/types/types";
import { notify } from "@/shared/ui/NotificationPopup/notify";
import { getSprintWeekBorders } from "@/shared/utils/statisticUtils/generateWeekBorders";
import { classNames } from "@/shared/utils/utils";
import styles from "./ClientProfile.module.scss";

const { VITE_BFF_API_URL } = import.meta.env;

const formatDate = (date?: string) => {
	if (!date) return "—";

	const parsed = dayjs(date);

	if (!parsed.isValid()) return date;

	return parsed.format("DD.MM.YYYY");
};

const getTasksInWork = (tasks?: TaskProps[]) => {
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
	const [loading, setLoading] = useState(false);
	const [loadingReport, setLoadingReport] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [loadUrl, setLoadUrl] = useState("");
	const [projectTasks, setProjectTasks] = useState<{
		[projectId: number]: TaskProps[];
	}>();

	const [bundles, setBundles] = useState<{
		[projectId: number]: TaskProps[];
	}>();

	const borders = useMemo(() => getSprintWeekBorders(dayjs()), []);

	const { clientId } = useParams<{ clientId: string }>();

	const navigate = useNavigate();

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

	useEffect(() => {
		const fetchTasks = async () => {
			const tasksInWork = await Promise.all(
				projects.map(async (project) => ({
					[project.id]: await getItems<TaskProps>({
						typeId: EntityTypeIds.tasks,
						filters: {
							[TaskCodes.project]: normalizedProjects.find(
								(p) => Number(p.projectId) === project.id,
							)?.id,
							"!@stageId": [
								"DT1072_18:UC_6JNSDG",
								"DT1072_18:UC_UZMTY8",
								"DT1072_18:NEW",
								"DT1072_18:UC_A9IWFS",
								"DT1072_18:UC_YU7VRR",
								"DT1072_18:UC_GEW05D",
								"DT1072_18:SUCCESS",
								"DT1072_18:FAIL",
							],
						},
						select: TASK_SELECT_FIELDS,
					}),
				})),
			);

			const bundlesAmount = await Promise.all(
				projects.map(async (project) => ({
					[project.id]: await getItems<TaskProps>({
						typeId: EntityTypeIds.tasks,
						filters: {
							[TaskCodes.project]: normalizedProjects.find(
								(p) => Number(p.projectId) === project.id,
							)?.id,
							stageId: "DT1072_18:UC_YU7VRR",
						},
						select: TASK_SELECT_FIELDS,
					}),
				})),
			);

			setProjectTasks(
				tasksInWork.reduce((acc, item) => ({ ...acc, ...item }), {}),
			);

			setBundles(
				bundlesAmount.reduce((acc, item) => ({ ...acc, ...item }), {}),
			);
		};

		projects && fetchTasks();
	}, [projects, normalizedProjects]);

	// useEffect(() => {
	// 	const getUsers = async () => {
	// 		const response = await getDevelopers();

	// 		setUsers(
	// 			response
	// 				.map((user) => ({
	// 					id: user.ID,
	// 					value: user.NAME + user.LAST_NAME,
	// 					title: user.NAME + " " + user.LAST_NAME,
	// 					position: user.WORK_POSITION,
	// 					photo: user.PERSONAL_PHOTO,
	// 					department: user.UF_DEPARTMENT[0],
	// 				}))
	// 				.toSorted((a, b) => a.department - b.department),
	// 		);
	// 	};

	// 	getUsers();
	// }, []);

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

	// const latestActivityProjects = useMemo(() => {
	// 	return [...projects]
	// 		.filter((project) => project.lastActivityTime)
	// 		.sort(
	// 			(a, b) =>
	// 				dayjs(b.lastActivityTime).valueOf() -
	// 				dayjs(a.lastActivityTime).valueOf(),
	// 		)
	// 		.slice(0, 4);
	// }, [projects]);

	const totalProjects = projects.length;
	const activeProjectsCount = Object.entries(projectTasks ?? {}).filter(
		([_connectProjectIds, tasks]) => tasks.length > 0,
	).length;

	const doneProjects = Object.entries(projectTasks ?? {}).reduce(
		(acc, [_connectProjectIds, tasks]) => {
			if (
				tasks.filter((task) => task.stageId === TASK_STAGE_IDS.DONE).length ===
					tasks.length &&
				tasks.length > 0
			) {
				acc += 1;
			}

			return acc;
		},
		0,
	);

	if (!clientId) return null;

	return (
		// <CheckPermission permission="read" subject={`client-profile-${clientId}`}>
		<div className={styles.page}>
			<div className={styles.headerCard}>
				<div className={styles.headerInfo}>
					<div className={styles.badge}>Кабинет клиента</div>
					<h1 className={styles.pageTitle}>Профиль клиента</h1>
					<p className={styles.pageSubtitle}>
						Здесь отображаются все проекты клиента, последние обновления по ним
						и ближайшие активности команды.
					</p>
				</div>

				<div className={styles.headerStats}>
					<div className={styles.statCard}>
						<div className={styles.statValue}>{totalProjects}</div>
						<div className={styles.statLabel}>Всего проектов</div>
					</div>

					<div className={styles.statCard}>
						<div className={styles.statValue}>{activeProjectsCount}</div>
						<div className={styles.statLabel}>Проекты в работе</div>
					</div>

					<div className={styles.statCard}>
						<div className={styles.statValue}>{doneProjects}</div>
						<div className={styles.statLabel}>Завершенных проектов</div>
					</div>
				</div>
			</div>

			<div className={styles.content}>
				<div className={styles.mainColumn}>
					<div className={styles.sectionCard}>
						<div className={styles.sectionHeader}>
							<div>
								<h2
									style={{
										textAlign: "left",
									}}
									className={styles.sectionTitle}
								>
									Проекты
								</h2>
								<p className={styles.sectionSubtitle}>
									Основной список проектов с краткой сводкой по каждому
								</p>
							</div>

							{loadUrl === "" ? (
								<button
									disabled={loadingReport}
									type="button"
									className={classNames(styles.primaryButton, {
										[styles.loadingPulse]: loadingReport,
									})}
									onClick={async () =>
										await getReportPdf(
											clientId,
											borders.startOfTheWeek,
											borders.endOfTheWeek,
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
						</div>

						{loading && (
							<div className={styles.stateBox}>
								<div className={styles.stateTitle}>Загрузка проектов...</div>
								<div className={styles.stateText}>
									Получаем список проектов клиента
								</div>
							</div>
						)}

						{error && !loading && (
							<div className={styles.stateBoxError}>
								<div className={styles.stateTitle}>{error}</div>
								<div className={styles.stateText}>
									Попробуй обновить страницу или проверить доступ к данным
								</div>
							</div>
						)}

						{!loading && !error && projects.length === 0 && (
							<div className={styles.stateBox}>
								<div className={styles.stateTitle}>Проекты не найдены</div>
								<div className={styles.stateText}>
									Для этого клиента пока нет доступных проектов
								</div>
							</div>
						)}

						{!loading && !error && projects.length > 0 && (
							<div className={styles.projectsList}>
								{projects.map((project) => {
									const projTasks = projectTasks?.[project.id];

									const activity = getTasksInWork(projTasks);

									const actualId = normalizedProjects.find(
										(p) => Number(p.projectId) === project.id,
									)?.id;

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
												<div className={styles.projectBody}>
													<div className={styles.projectInfoGrid}>
														<div className={styles.infoTile}>
															<div className={styles.infoTileLabel}>
																Дата создания
															</div>
															<div className={styles.infoTileValue}>
																{formatDate(project.createdTime)}
															</div>
														</div>

														{bundles?.[project.id] && (
															<div className={styles.infoTile}>
																<div className={styles.infoTileLabel}>
																	Бандлов в проекте
																</div>
																<div className={styles.infoTileValue}>
																	{bundles[project.id].length}
																</div>
															</div>
														)}

														<div className={styles.infoTile}>
															<div className={styles.infoTileLabel}>
																Кол-во часов
															</div>
															<div className={styles.infoTileValue}>
																{projTasks?.reduce((acc, task) => {
																	return acc + +task[TaskCodes.estimateTime];
																}, 0)}
															</div>
														</div>
													</div>

													<div className={styles.projectActions}>
														<span
															className={`${styles.activityBadge} ${
																activity.type === "active"
																	? styles.activityActive
																	: activity.type === "warning"
																		? styles.activityWarning
																		: styles.activityIdle
															}`}
														>
															{activity.text}
														</span>
														<button
															type="button"
															className={styles.secondaryButton}
															onClick={() =>
																navigate(
																	`/client-projects/${clientId}/project/${actualId}`,
																	{
																		state: project,
																	},
																)
															}
														>
															Открыть карточку проекта
														</button>
													</div>
												</div>
											</div>
										</div>
									);
								})}
							</div>
						)}
					</div>
				</div>

				<div className={styles.sideColumn}>
					<div
						className={styles.sectionCard}
						onClick={() => {
							notify({
								message: "Кнопки заработают в ближайшее время!",
								type: "warning",
							});
						}}
					>
						<h2 className={styles.sectionTitle}>Быстрые действия</h2>

						<div className={styles.quickActions}>
							<button disabled type="button" className={styles.ghostButton}>
								Оставить обращение
							</button>
							<button disabled type="button" className={styles.ghostButton}>
								Запросить отчёт
							</button>
							<button disabled type="button" className={styles.ghostButton}>
								Запланировать встречу
							</button>
						</div>
					</div>

					<div className={styles.sectionCard}>
						<h2 className={styles.sectionTitle}>Последняя активность</h2>

						<div className={styles.meetingCard}>
							<div className={styles.meetingTitle}>
								Активности скоро появятся
							</div>
						</div>

						{/* <div className={styles.activityList}>
							{latestActivityProjects.length > 0 ? (
								latestActivityProjects.map((project) => (
									<div key={project.id} className={styles.activityItem}>
										<div className={styles.activityDot} />
										<div className={styles.activityContent}>
											<div className={styles.activityProjectTitle}>
												{project.title}
											</div>
											<div className={styles.activityProjectText}>
												Последнее действие:{" "}
												{formatDate(project.lastActivityTime)}
											</div>
										</div>
									</div>
								))
							) : (
								<div className={styles.mutedText}>
									Пока нет данных по активности
								</div>
							)}
						</div> */}
					</div>

					<div className={styles.sectionCard}>
						<h2 className={styles.sectionTitle}>Ближайшие встречи</h2>

						<div className={styles.meetingsList}>
							{/* {mockMeetings.map((meeting) => (
								<div key={meeting.id} className={styles.meetingCard}>
									<div className={styles.meetingTitle}>{meeting.title}</div>
									<div className={styles.meetingProject}>
										{meeting.projectTitle}
									</div>
									<div className={styles.meetingMeta}>
										<span>{dayjs(meeting.date).format("DD.MM.YYYY")}</span>
										<span>{meeting.time}</span>
									</div>
									<a href={meeting.link} className={styles.meetingLink}>
										Подключиться
									</a>
								</div>
							))} */}

							<div className={styles.meetingCard}>
								<div className={styles.meetingTitle}>Нет ближайших встреч</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
		// </CheckPermission>
	);
};

export default ClientProfile;
