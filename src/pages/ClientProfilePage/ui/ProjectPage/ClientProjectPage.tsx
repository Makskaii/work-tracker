import dayjs, { Dayjs } from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router";
import { ReportCodes, TaskCodes } from "@/components/calendar/constants/const";
import type { ReportProps } from "@/components/calendar/types/types";
import { Spinner } from "@/components/spinner/Spinner";
import { TaskItemExtended } from "@/components/taskItem/TaskItemExtended";
import { UserCard } from "@/components/userCard/UserCard";
import { getDevelopers } from "@/pages/ReportsPage/api/getDevelopers";
import { getStatuses } from "@/pages/ReportsPage/api/getStatusFields";
import { getItems } from "@/pages/ReportsPage/api/getTasks";
import type { ActivityListItem } from "@/pages/ReportsPage/types/types";
import { DoneTasksList } from "@/pages/ReportsPage/ui/ProjectReports/DoneTasksList";
import { getActivitiesList } from "@/shared/api/getCrmFields";
import { $backendApi } from "@/shared/config/axios/axios.config";
import {
	Endpoints,
	EntityTypeIds,
	TASK_SELECT_FIELDS,
} from "@/shared/constants/const";
import { useBitrixSlider } from "@/shared/hooks/useBitrixSlider";
import { useLoadAllData } from "@/shared/hooks/useLoadAllTasks";
import type { Status, TaskProps, User } from "@/shared/types/types";
import { convertNumberFormat, getWeekArray } from "@/shared/utils";
import { getSprintWeekBorders } from "@/shared/utils/statisticUtils/generateWeekBorders";
import styles from "./ProjectPage.module.scss";
import { ProjectReportsTimelineModal } from "./ProjectReportsTimelineModal";

const today = dayjs();

export const ProjectsStats = () => {
	const [tasks, setTasks] = useState<TaskProps[]>([]);
	const [day, setDay] = useState<Dayjs>(today);
	const [view, setView] = useState<"stats" | "task">("stats");
	const [loading, setLoading] = useState(false);
	const [loadUrl, setLoadUrl] = useState("");
	const [activities, setActivities] = useState<ActivityListItem[]>([]);
	const [users, setUsers] = useState<User[]>([]);
	const { projId } = useParams<{ projId: string }>();
	const [statuses, setStatuses] = useState<Status[]>([]);
	const [reportsOpen, setReportsOpen] = useState(false);

	const { state } = useLocation();

	const { openTask } = useBitrixSlider();

	const borders = useMemo(() => getSprintWeekBorders(dayjs(day)), [day]);
	const { startOfTheWeek, endOfTheWeek } = borders;

	useEffect(() => {
		const fetchStatuses = async () => {
			const response = await getStatuses();

			setStatuses(response);
		};

		fetchStatuses();
	}, []);

	useEffect(() => {
		const fetchTasks = async () => {
			const response = await getItems<TaskProps>(
				EntityTypeIds.tasks,
				{
					[TaskCodes.project]: projId,
					[`<=${TaskCodes.sprintDateStart}`]: endOfTheWeek,
					[`>=${TaskCodes.sprintDateStart}`]: startOfTheWeek,
				},
				TASK_SELECT_FIELDS,
			);

			setTasks(response.sort((a, b) => a.stageId.localeCompare(b.stageId)));
		};

		fetchTasks();
	}, [projId, startOfTheWeek, endOfTheWeek]);

	const devsIds = useMemo(() => {
		return new Set(tasks.map((task) => task.assignedById));
	}, [tasks]);

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
					ReportCodes.client,
					ReportCodes.taskId,
					ReportCodes.activityType,
					"assignedById",
					"createdTime",
					"lastActivityTime",
					`parentId${EntityTypeIds.tasks}`,
				],
				filter: {
					[ReportCodes.project]: projId,
					">=begindate": startOfTheWeek,
					"<=begindate": endOfTheWeek,
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
					ReportCodes.client,
					ReportCodes.taskId,
					ReportCodes.activityType,
					"assignedById",
					"createdTime",
					"lastActivityTime",
					`parentId${EntityTypeIds.tasks}`,
				],
				filter: {
					[ReportCodes.project]: projId,
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
					ReportCodes.client,
					ReportCodes.taskId,
					ReportCodes.activityType,
					"assignedById",
					"createdTime",
					"lastActivityTime",
					`parentId${EntityTypeIds.tasks}`,
				],
				filter: {
					[ReportCodes.project]: projId,
					">=begindate": startOfTheWeek,
					"<=begindate": endOfTheWeek,
				},
			},
		});
	}, [endOfTheWeek, projId, setFilters, startOfTheWeek]);

	const totalSpentTime = useMemo(() => {
		return allReports.reduce(
			(acc, report) => acc + convertNumberFormat(report[ReportCodes.timeSpent]),
			0,
		);
	}, [allReports]);

	const sprintSpentTime = useMemo(() => {
		return data.reduce((acc, report) => {
			return acc + convertNumberFormat(report[ReportCodes.timeSpent]);
		}, 0);
	}, [data]);

	const totalEstimateTime = useMemo(() => {
		return tasks.reduce((acc, task) => {
			return acc + convertNumberFormat(task[TaskCodes.estimateTime]);
		}, 0);
	}, [tasks]);

	const groupedByTaskReports = useMemo(() => {
		return data.reduce(
			(acc, report) => {
				const parentId = Number(report[ReportCodes.parentId]);

				if (!parentId) return acc;

				if (!acc[parentId]) {
					acc[parentId] = [report];
				} else {
					acc[parentId].push(report);
				}

				return acc;
			},
			{} as Record<number, ReportProps[]>,
		);
	}, [data]);

	const week = useMemo(() => getWeekArray(borders.startOfTheWeek), [borders]);

	const weeklyActivity = useMemo(() => {
		return week.map((weekDay) => {
			const dayKey = dayjs(weekDay.day).format("YYYY-MM-DD");

			const reportsByDay = data.filter((report) => {
				return dayjs(report.begindate).format("YYYY-MM-DD") === dayKey;
			});

			const groupedByActivity = reportsByDay.reduce(
				(acc, report) => {
					const activityId = String(report[ReportCodes.activityType] ?? "");

					if (!activityId) return acc;

					acc[activityId] =
						(acc[activityId] || 0) +
						convertNumberFormat(report[ReportCodes.timeSpent]);

					return acc;
				},
				{} as Record<string, number>,
			);

			const total = Object.values(groupedByActivity).reduce(
				(acc, value) => acc + value,
				0,
			);

			return {
				...weekDay,
				total,
				activities: groupedByActivity,
			};
		});
	}, [data, week]);

	const activityMap = useMemo(() => {
		return activities.reduce(
			(acc, activity) => {
				acc[String(activity.ID)] = activity;
				return acc;
			},
			{} as Record<
				string,
				{
					ID: string;
					IBLOCK_ID: string;
					NAME: string;
					IBLOCK_SECTION_ID: string | null;
					CREATED_BY: string;
					BP_PUBLISHED: string;
					CODE: string | null;
					SORT: string;
				}
			>,
		);
	}, [activities]);

	const maxDayLoad = useMemo(() => {
		const max = Math.max(...weeklyActivity.map((day) => day.total), 1);
		return max;
	}, [weeklyActivity]);

	const activitySummary = useMemo(() => {
		return data.reduce(
			(acc, report) => {
				const activityId = String(report[ReportCodes.activityType] ?? "");

				if (!activityId) return acc;

				acc[activityId] =
					(acc[activityId] || 0) +
					convertNumberFormat(report[ReportCodes.timeSpent]);

				return acc;
			},
			{} as Record<string, number>,
		);
	}, [data]);

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

			setLoadUrl(
				`https://crm.evolution-soft.ru/devapps/work-tracker/api${downloadUrl}`,
			);

			setView("task");
		} catch (error) {
			console.log(error);
		} finally {
			setLoading(false);
		}
	};

	const activityColorClasses = [
		styles.activityColor1,
		styles.activityColor2,
		styles.activityColor3,
		styles.activityColor4,
		styles.activityColor5,
		styles.activityColor6,
	];

	const activityIdsOrdered = useMemo(() => {
		return Object.keys(activitySummary).sort((a, b) => {
			const aSort = Number(activityMap[a]?.SORT ?? 9999);
			const bSort = Number(activityMap[b]?.SORT ?? 9999);
			return aSort - bSort;
		});
	}, [activitySummary, activityMap]);

	const getActivityColorClass = (activityId: string, fallbackIndex = 0) => {
		const index = activityIdsOrdered.indexOf(activityId);
		const safeIndex = index >= 0 ? index : fallbackIndex;

		return activityColorClasses[safeIndex % activityColorClasses.length];
	};

	if (!projId) return;

	if (view === "task") {
		return (
			<div className={styles.reportView}>
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

				<DoneTasksList projectId={projId} />
			</div>
		);
	}

	return (
		<div className={styles.page}>
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
								{totalSpentTime.toFixed(1)} ч
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
								<h2 className={styles.sectionTitle}>Активность за спринт</h2>
								<p className={styles.sectionSubtitle}>
									Распределение активности по дням недели
								</p>
							</div>
						</div>

						<div className={styles.chart}>
							{weeklyActivity.map((item) => {
								let currentOffset = 0;

								return (
									<div className={styles.chartColumn} key={item.day}>
										<div className={styles.chartBarArea}>
											{Object.entries(item.activities).map(
												([activityId, value], index) => {
													const percent = (value / maxDayLoad) * 100;
													const bottom = (currentOffset / maxDayLoad) * 100;
													currentOffset += value;

													return (
														<div
															key={activityId}
															className={`${styles.chartSegment} ${getActivityColorClass(
																activityId,
																index,
															)}`}
															style={{
																height: `${percent}%`,
																bottom: `${bottom}%`,
															}}
															title={`${activityMap[activityId]?.NAME || activityId}: ${value.toFixed(1)} ч`}
														/>
													);
												},
											)}
										</div>

										<div className={styles.chartMeta}>
											<div className={styles.chartDay}>{item.name}</div>
											<div className={styles.chartDate}>
												{dayjs(item.day).format("DD.MM")}
											</div>
											<div className={styles.chartTotal}>
												{item.total.toFixed(1)} ч
											</div>
										</div>
									</div>
								);
							})}
						</div>

						<div className={styles.legend}>
							{Object.entries(activitySummary).map(
								([activityId, value], index) => (
									<div className={styles.legendItem} key={activityId}>
										<span
											className={`${styles.legendDot} ${getActivityColorClass(
												activityId,
												index,
											)}`}
										/>
										<span className={styles.legendLabel}>
											{activityMap[activityId]?.NAME ||
												`Активность #${activityId}`}
										</span>
										<span className={styles.legendValue}>
											{value.toFixed(1)} ч
										</span>
									</div>
								),
							)}
						</div>
					</div>

					<div className={styles.sectionCard}>
						<div className={styles.sectionHeader}>
							<div>
								<h2 className={styles.sectionTitle}>Задачи спринта</h2>
								<p className={styles.sectionSubtitle}>
									Список задач с фактически списанным временем
								</p>
							</div>
						</div>

						<div className={styles.tasksList}>
							{tasks.map((task) => {
								const timeSpent = groupedByTaskReports?.[
									Number(task.id)
								]?.reduce((acc, report) => {
									return (
										acc + convertNumberFormat(report[ReportCodes.timeSpent])
									);
								}, 0);

								return (
									<div
										key={task.id}
										className={styles.taskRow}
										onClick={() => openTask(task.id)}
									>
										<TaskItemExtended
											task={task}
											estimateTime={task[TaskCodes.estimateTime]}
											timeSpent={timeSpent ?? 0}
											statuses={statuses}
											users={users}
										/>
									</div>
								);
							})}
						</div>
					</div>
				</div>

				<div className={styles.sideColumn}>
					<div className={styles.sectionCard}>
						<h2 className={styles.sectionTitle}>Команда проекта</h2>

						<div className={styles.teamList}>
							{projectUsers.map((user) => (
								<div className={styles.teamItem} key={user.id}>
									<UserCard user={user} />
									<div className={styles.teamInfo}>
										<div className={styles.teamMeta}>
											Задач в проекте:{" "}
											{
												tasks.filter(
													(task) => String(task.assignedById) === user.id,
												).length
											}
										</div>
									</div>
								</div>
							))}
						</div>
					</div>

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
							<button type="button" className={styles.secondaryButton}>
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
									getReportPdf(projId, startOfTheWeek, endOfTheWeek)
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
		</div>
	);
};
