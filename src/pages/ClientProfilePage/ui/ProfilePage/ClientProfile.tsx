import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { TaskCodes } from "@/components/calendar/constants/const";
import { Modal } from "@/components/modal";
import { Spinner } from "@/components/spinner/Spinner";
import { getItems } from "@/pages/ReportsPage/api/getTasks";
import { TASK_STAGE_IDS } from "@/pages/ReportsPage/constants/statuses";
import {
	mapProjectsFromList,
	type ProjectFromList,
} from "@/pages/ReportsPage/ReportsPage";
import { getProjectStatus } from "@/pages/ReportsPage/ui/ProjectReports/ClientsPage";
import {
	getClientsFromList,
	getProjectsFromList,
} from "@/shared/api/getCrmFields";
import { $backendApi } from "@/shared/config/axios/axios.config";
import {
	ClientsCodes,
	EntityTypeIds,
	TASK_SELECT_FIELDS,
} from "@/shared/constants/const";
import type {
	ClientListItems,
	ClientProjectProps,
	TaskProps,
} from "@/shared/types/types";
import { notify } from "@/shared/ui/NotificationPopup/notify";
import { getSprintWeekBorders } from "@/shared/utils/statisticUtils/generateWeekBorders";
import { classNames } from "@/shared/utils/utils";
import { TaskList } from "../TaskList/TaskList";
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

	const [taskList, setTaskList] = useState<TaskProps[]>([]);

	const [bundles, setBundles] = useState<{
		[projectId: number]: TaskProps[];
	}>();

	const [clientData, setClientData] = useState<ClientListItems>();

	const borders = useMemo(() => getSprintWeekBorders(dayjs()), []);

	const { clientId } = useParams<{ clientId: string }>();

	const [open, setOpen] = useState<boolean>(false);

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

			const tasksFlat = Object.entries(
				tasksInWork.reduce((acc, item) => ({ ...acc, ...item }), {}),
			).reduce((acc, [_id, tasks]) => {
				if (tasks.length > 0) {
					acc.push(...tasks);
				}

				return acc;
			}, [] as TaskProps[]);

			setTaskList(tasksFlat);

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
					<h1 className={styles.pageTitle}>
						{clientData?.NAME ?? <Spinner onlySpin />}
					</h1>
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
																	return acc + +(task[TaskCodes.hours] ?? 0);
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
					<div className={styles.sectionCard}>
						<h2 className={styles.sectionTitle}>Быстрые действия</h2>

						<div className={styles.quickActions}>
							<button
								onClick={() => setOpen(true)}
								type="button"
								className={styles.secondaryButton}
							>
								Просмотреть все задачи
							</button>
							<button className={styles.ghostButton}>Оставить обращение</button>
							<button
								onClick={() => {
									notify({
										message: "Кнопки заработают в ближайшее время!",
										type: "warning",
									});
								}}
								type="button"
								className={styles.ghostButton}
							>
								Запросить отчёт
							</button>
							<button
								onClick={() => {
									notify({
										message: "Кнопки заработают в ближайшее время!",
										type: "warning",
									});
								}}
								type="button"
								className={styles.ghostButton}
							>
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
					</div>

					<div className={styles.sectionCard}>
						<h2 className={styles.sectionTitle}>Ближайшие встречи</h2>

						<div className={styles.meetingsList}>
							<div className={styles.meetingCard}>
								<div className={styles.meetingTitle}>Нет ближайших встреч</div>
							</div>
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
