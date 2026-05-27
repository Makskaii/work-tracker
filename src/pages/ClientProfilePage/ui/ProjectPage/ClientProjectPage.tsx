import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router";
import { ReportCodes, TaskCodes } from "@/components/calendar/constants/const";
import type { ReportProps } from "@/components/calendar/types/types";
import { Spinner } from "@/components/spinner/Spinner";
import { getDevelopers } from "@/pages/ReportsPage/api/getDevelopers";
import { getStatuses } from "@/pages/ReportsPage/api/getStatusFields";
import { getItems } from "@/pages/ReportsPage/api/getTasks";
import type { ActivityListItem } from "@/pages/ReportsPage/types/types";
import { DoneTasksList } from "@/pages/ReportsPage/ui/ProjectReports/DoneTasksList";
import { getActivitiesList } from "@/shared/api/getCrmFields";
import { $api, $backendApi } from "@/shared/config/axios/axios.config";
import {
	Endpoints,
	EntityTypeIds,
	TASK_SELECT_FIELDS,
} from "@/shared/constants/const";
import { useLoadAllData } from "@/shared/hooks/useLoadAllTasks";
import { useSprintBorders } from "@/shared/hooks/useSprintBorders";
import type { Status, TaskProps, User } from "@/shared/types/types";
import { convertNumberFormat } from "@/shared/utils";
import { TaskBundleSection } from "../BundleSection/TaskBundleSection";
import theme from "../ClientProfileTheme.module.scss";
import { TaskList } from "../TaskList/TaskList";
import { ProjectAllTasksModal } from "./ProjectAllTasksModal";
import styles from "./ProjectPage.module.scss";
import { ProjectReportsTimelineModal } from "./ProjectReportsTimelineModal";

export type TaskBundle = TaskProps & { tasks: TaskProps[] };

const { VITE_BFF_API_URL } = import.meta.env;

export const ClientProjectPage = () => {
	const [tasks, setTasks] = useState<TaskProps[]>([]);
	const [view, setView] = useState<"stats" | "task">("stats");
	const [loading, setLoading] = useState(false);
	const [loadUrl, setLoadUrl] = useState("");
	const [activities, setActivities] = useState<ActivityListItem[]>([]);
	const [users, setUsers] = useState<User[]>([]);
	const { companyId, projId } = useParams<{
		companyId?: string;
		projId: string;
	}>();
	const [statuses, setStatuses] = useState<Status[]>([]);
	const [reportsOpen, setReportsOpen] = useState(false);
	const [allTasksOpen, setAllTasksOpen] = useState(false);
	const [bundle, setBundles] = useState<TaskBundle[]>([]);
	const projectTaskFilter = useMemo(
		() => ({
			[TaskCodes.parentproject]: projId,
			...(companyId ? { [TaskCodes.company]: companyId } : {}),
		}),
		[projId, companyId],
	);
	const projectReportFilter = useMemo(
		() => ({
			[ReportCodes.parentproject]: projId,
			...(companyId ? { [ReportCodes.company]: companyId } : {}),
		}),
		[projId, companyId],
	);

	const { state } = useLocation();

	const { endOfTheWeek, setDay, startOfTheWeek } = useSprintBorders();

	useEffect(() => {
		const fetchStatuses = async () => {
			const response = await getStatuses();

			setStatuses(response);
		};

		fetchStatuses();
	}, []);

	useEffect(() => {
		if (!projId) return;

		const fetchTasks = async () => {
			const response = await getItems<TaskProps>({
				typeId: EntityTypeIds.tasks,
				filters: {
					...projectTaskFilter,
					[`<=${TaskCodes.sprintDateStart}`]: endOfTheWeek,
					[`>=${TaskCodes.sprintDateStart}`]: startOfTheWeek,
				},
				select: TASK_SELECT_FIELDS,
			});

			setTasks(response.sort((a, b) => a.stageId.localeCompare(b.stageId)));
		};

		fetchTasks();
	}, [projId, projectTaskFilter, startOfTheWeek, endOfTheWeek]);

	const devsIds = useMemo(() => {
		return new Set(tasks.map((task) => task.assignedById));
	}, [tasks]);

	useEffect(() => {
		if (!projId) return;

		const fetchBundles = async () => {
			const bundleTask = await getItems<TaskProps>({
				typeId: EntityTypeIds.tasks,
				filters: {
					...projectTaskFilter,
					[`!${TaskCodes.linkedTasks}`]: false,
				},
				select: TASK_SELECT_FIELDS,
			});

			const bundlesWithTasks = await Promise.all(
				bundleTask.map(async (bundle) => {
					const linkedTaskIds = bundle[TaskCodes.linkedTasks] ?? [];

					const tasks = await Promise.all(
						linkedTaskIds.map(async (taskId) => {
							const response = await $api.get<{
								result: {
									item: TaskProps;
								};
							}>(Endpoints.item, {
								params: {
									entityTypeId: EntityTypeIds.tasks,
									id: taskId,
								},
							});

							return response.data.result.item;
						}),
					);

					return {
						...bundle,
						tasks,
					} as TaskBundle;
				}),
			);

			setBundles(bundlesWithTasks);
		};

		fetchBundles();
	}, [projId, projectTaskFilter]);

	useEffect(() => {
		const fetchActivities = async () => {
			const fields = await getActivitiesList();

			setActivities(fields);
		};

		fetchActivities();
	}, []);

	const { data, setFilters } = useLoadAllData<ReportProps>({
		initialEndpoint: Endpoints.crmItems,
		initialFilters: {
			params: {
				entityTypeId: EntityTypeIds.reports,
				select: [
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
				],
				filter: {
					...projectReportFilter,
					">=begindate": startOfTheWeek,
					"<=begindate": endOfTheWeek,
					stageId: "DT1060_15:PREPARATION",
				},
			},
		},
	});

	const { data: allReports } = useLoadAllData<ReportProps>({
		initialEndpoint: Endpoints.crmItems,
		initialFilters: {
			params: {
				entityTypeId: EntityTypeIds.reports,
				select: [
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
				],
				filter: {
					...projectReportFilter,
					stageId: "DT1060_15:PREPARATION",
				},
			},
		},
	});

	useEffect(() => {
		setFilters({
			params: {
				entityTypeId: EntityTypeIds.reports,
				select: [
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
				],
				filter: {
					...projectReportFilter,
					">=begindate": startOfTheWeek,
					"<=begindate": endOfTheWeek,
					stageId: "DT1060_15:PREPARATION",
				},
			},
		});
	}, [endOfTheWeek, projectReportFilter, setFilters, startOfTheWeek]);

	const sprintSpentTime = useMemo(() => {
		return tasks.reduce((acc, task) => {
			return acc + convertNumberFormat(Number(task[TaskCodes.hours]) ?? 0);
		}, 0);
	}, [tasks]);

	const totalEstimateTime = useMemo(() => {
		return tasks.reduce((acc, task) => {
			return acc + convertNumberFormat(Number(task[TaskCodes.hours]) ?? 0);
		}, 0);
	}, [tasks]);

	useEffect(() => {
		const getUsers = async () => {
			const response = await getDevelopers();

			setUsers(
				response
					.map((user) => ({
						id: user.ID,
						value: user.NAME + user.LAST_NAME,
						title: user.NAME + " " + user.LAST_NAME,
						position: user.WORK_POSITION,
						photo: user.PERSONAL_PHOTO,
						department: user.UF_DEPARTMENT[0],
					}))
					.toSorted((a, b) => a.department - b.department),
			);
		};

		getUsers();
	}, []);

	const projectUsers = useMemo(() => {
		return users.filter((user) => devsIds.has(Number(user.id)));
	}, [users, devsIds]);

	const getReportPdf = async (
		projectId: string,
		startOfThePeriod: string,
		endOfThePeriod: string,
	) => {
		try {
			setLoading(true);

			const response = await $backendApi.post("doc-records/report", {
				projectId,
				startOfThePeriod,
				endOfThePeriod,
			});

			const downloadUrl = response.data.downloadUrl;

			setLoadUrl(`${VITE_BFF_API_URL}${downloadUrl}`);

			setView("task");
		} catch (error) {
			console.log(error);
		} finally {
			setLoading(false);
		}
	};

	if (!projId) return;

	if (view === "task") {
		return (
			<div className={`${styles.reportView} ${theme.lightTheme}`}>
				<div className={styles.reportToolbar}>
					<button
						type="button"
						className={styles.primaryButton}
						onClick={() => {
							if (loadUrl) window.open(loadUrl, "_blank");
						}}
					>
						Скачать отчёт
					</button>

					<button
						type="button"
						className={styles.secondaryButton}
						onClick={() => {
							setLoadUrl("");
							setView("stats");
						}}
					>
						Назад к карточке проекта
					</button>
				</div>

				<DoneTasksList projectId={projId} companyId={companyId} />
			</div>
		);
	}

	return (
		<div className={`${styles.page} ${theme.lightTheme}`}>
			<div className={styles.heroCard}>
				<div className={styles.heroMain}>
					<div className={styles.badge}>Карточка проекта</div>

					<h1 className={styles.projectTitle}>{state.title}</h1>

					<p className={styles.projectSubtitle}>
						Обзор задач, команды и активности проекта за выбранный спринт.
					</p>

					<div className={styles.periodControls}>
						<button
							type="button"
							className={styles.ghostButton}
							onClick={() => setDay((prev) => prev.subtract(7, "day"))}
						>
							Пред. спринт
						</button>

						<div className={styles.periodCard}>
							<div className={styles.periodLabel}>Спринт</div>
							<div className={styles.periodValue}>
								{dayjs(startOfTheWeek).format("DD.MM")} –{" "}
								{dayjs(endOfTheWeek).format("DD.MM")}
							</div>
						</div>

						<button
							type="button"
							className={styles.ghostButton}
							onClick={() => setDay((prev) => prev.add(7, "day"))}
						>
							След. спринт
						</button>
					</div>
				</div>

				<div className={styles.heroAside}>
					<div className={styles.kpiGrid}>
						<div className={styles.kpiCard}>
							<div className={styles.kpiValue}>{tasks.length}</div>
							<div className={styles.kpiLabel}>Задач в спринте</div>
						</div>

						<div className={styles.kpiCard}>
							<div className={styles.kpiValue}>
								{sprintSpentTime.toFixed(1)} ч
							</div>
							<div className={styles.kpiLabel}>Списано за спринт</div>
						</div>

						<div className={styles.kpiCard}>
							<div className={styles.kpiValue}>
								{totalEstimateTime.toFixed(1)} ч
							</div>
							<div className={styles.kpiLabel}>План по оценке</div>
						</div>

						<div className={styles.kpiCard}>
							<div className={styles.kpiValue}>
								{totalEstimateTime.toFixed(1)} ч
							</div>
							<div className={styles.kpiLabel}>Всего по проекту</div>
						</div>
					</div>

					<button
						type="button"
						className={styles.primaryButton}
						onClick={() => getReportPdf(projId, startOfTheWeek, endOfTheWeek)}
					>
						{loading ? (
							<>
								Подготовка...
								<Spinner
									onlySpin
									additionalStyles={{ width: "18px", height: "18px" }}
								/>
							</>
						) : (
							"Отчёт за 2 недели"
						)}
					</button>
				</div>
			</div>

			<div className={styles.content}>
				<div className={styles.mainColumn}>
					<div className={styles.sectionCard}>
						<div className={styles.sectionHeader}>
							<div>
								<h2 className={styles.sectionTitle}>Задачи спринта</h2>
							</div>
						</div>

						<div className={styles.tasksList}>
							<TaskList tasks={tasks} isProject />
						</div>
					</div>
				</div>

				<div className={styles.sideColumn}>
					<TaskBundleSection bundles={bundle} />

					<div className={styles.sectionCard}>
						<h2 className={styles.sectionTitle}>Сводка по спринту</h2>

						<div className={styles.summaryList}>
							<div className={styles.summaryRow}>
								<span>Всего затрачено</span>
								<strong>{sprintSpentTime.toFixed(1)} ч</strong>
							</div>
							<div className={styles.summaryRow}>
								<span>План по оценке</span>
								<strong>{totalEstimateTime.toFixed(1)} ч</strong>
							</div>
							<div className={styles.summaryRow}>
								<span>Разработчиков</span>
								<strong>{projectUsers.length}</strong>
							</div>
							<div className={styles.summaryRow}>
								<span>Активностей</span>
								<strong>{data.length}</strong>
							</div>
						</div>
					</div>

					<div className={styles.sectionCard}>
						<h2 className={styles.sectionTitle}>Быстрые действия</h2>

						<div className={styles.actionsList}>
							<button
								onClick={() => setAllTasksOpen(true)}
								type="button"
								className={styles.secondaryButton}
							>
								Открыть все задачи
							</button>
							<button
								onClick={() => setReportsOpen(true)}
								type="button"
								className={styles.secondaryButton}
							>
								Показать историю отчётности
							</button>
							<button
								type="button"
								className={styles.secondaryButton}
								onClick={() =>
									!loading && getReportPdf(projId, startOfTheWeek, endOfTheWeek)
								}
							>
								Сформировать отчёт
							</button>
						</div>
					</div>
				</div>
			</div>

			<ProjectReportsTimelineModal
				open={reportsOpen}
				onClose={() => setReportsOpen(false)}
				projectName={state.title}
				reports={allReports}
				users={users}
				activities={activities}
				tasks={tasks}
			/>

			<ProjectAllTasksModal
				open={allTasksOpen}
				onClose={() => setAllTasksOpen(false)}
				projectId={projId}
				companyId={companyId}
				projectName={state.title}
				users={users}
				statuses={statuses}
				reports={allReports}
			/>
		</div>
	);
};
