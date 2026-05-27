import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router";
import { ReportCodes, TaskCodes } from "@/components/calendar/constants/const";
import type { ReportProps } from "@/components/calendar/types/types";
import { $api } from "@/shared/config";
import {
	Endpoints,
	EntityTypeIds,
	TASK_SELECT_FIELDS,
} from "@/shared/constants/const";
import { useSprintBorders } from "@/shared/hooks/useSprintBorders";
import type { ReportsContext, TaskProps, User } from "@/shared/types/types";
import { UserCard } from "../../userCard/UserCard";
import { EmployeeStats } from "./EmployeeStats";
import cls from "./StatsModal.module.scss";
import { TasksList } from "./TasksList";

type CrmItemListResponse<T> = {
	result?: {
		items?: T[];
	};
	next?: number | null;
};

const REPORT_SELECT_FIELDS = [
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
] as const;

const fetchAllCrmItems = async <T,>({
	entityTypeId,
	select,
	filter,
}: {
	entityTypeId: number;
	select: readonly string[];
	filter: Record<string, unknown>;
}) => {
	const limit = 50;
	let start = 0;
	let next: number | null | undefined = 0;
	const items: T[] = [];

	while (next !== null) {
		const response = await $api.get<CrmItemListResponse<T>>(
			Endpoints.crmItems,
			{
				params: {
					entityTypeId,
					select,
					filter,
					start,
				},
			},
		);

		items.push(...(response.data.result?.items ?? []));

		next = response.data.next ?? null;
		start = next ?? start + limit;
	}

	return items;
};

const getReportTaskId = (report: ReportProps) => {
	const taskId = report[ReportCodes.parentId] ?? report[ReportCodes.taskId];

	return taskId === null || taskId === undefined ? "" : String(taskId).trim();
};

const groupReportsByTask = (reports: ReportProps[]) => {
	return reports.reduce<Record<string, ReportProps[]>>((acc, report) => {
		const taskId = getReportTaskId(report);

		if (!taskId) {
			return acc;
		}

		acc[taskId] = [...(acc[taskId] ?? []), report];

		return acc;
	}, {});
};

const getNumberValue = (value: unknown) => {
	if (typeof value === "number") {
		return Number.isFinite(value) ? value : 0;
	}

	if (typeof value === "string") {
		const normalizedValue = value.trim().replace(",", ".");

		if (!normalizedValue) {
			return 0;
		}

		const numberValue = Number(normalizedValue);

		return Number.isFinite(numberValue) ? numberValue : 0;
	}

	return 0;
};

const formatHours = (value: unknown) => {
	const numberValue = getNumberValue(value);

	return Number.isInteger(numberValue)
		? String(numberValue)
		: numberValue.toFixed(1);
};

const getTaskProjectId = (task: TaskProps) => {
	const projectId = task[TaskCodes.parentproject] ?? task[TaskCodes.project];

	return projectId === null || projectId === undefined
		? ""
		: String(projectId).trim();
};

export const StatsModal = ({
	user,
	onTasksChange,
}: {
	user: User;
	onTasksChange?: (tasks: TaskProps[]) => void;
}) => {
	const { setUser, statuses, activities, projects } =
		useOutletContext<ReportsContext>();

	const [tasks, setTasks] = useState<TaskProps[]>([]);
	const [activeTaskId, setActiveTaskId] = useState<string>("");
	const [reportsByTask, setReportsByTask] = useState<
		Record<string, ReportProps[]>
	>({});
	const [allSprintReports, setAllSprintReports] = useState<ReportProps[]>([]);
	const [expandedProjectId, setExpandedProjectId] = useState<string>("");

	const [taskFilter, setTaskFilter] = useState<"all" | "overrun">("all");
	const [overrunTaskIds, setOverrunTaskIds] = useState<string[]>([]);

	const filteredTasks = useMemo(() => {
		if (taskFilter === "overrun") {
			return tasks.filter((task) => overrunTaskIds.includes(String(task.id)));
		}

		return tasks;
	}, [tasks, taskFilter, overrunTaskIds]);

	const activeTask = useMemo(() => {
		return filteredTasks.find((task) => String(task.id) === activeTaskId) ?? null;
	}, [filteredTasks, activeTaskId]);

	const activeTaskReports = useMemo(() => {
		if (!activeTaskId) {
			return [];
		}

		return reportsByTask[activeTaskId] ?? [];
	}, [reportsByTask, activeTaskId]);

	const sprintProjects = useMemo(() => {
		const result = new Map<
			string,
			{ id: string; name: string; tasksCount: number; hours: number }
		>();

		tasks.forEach((task) => {
			const projectId = getTaskProjectId(task);

			if (!projectId) {
				return;
			}

			const project = projects.find((item) => String(item.id) === projectId);
			const taskReports = reportsByTask[String(task.id)] ?? [];
			const taskHours = taskReports.reduce((sum, report) => {
				return sum + getNumberValue(report[ReportCodes.timeSpent]);
			}, 0);
			const current = result.get(projectId);

			result.set(projectId, {
				id: projectId,
				name: project?.name ?? project?.title ?? `Проект #${projectId}`,
				tasksCount: (current?.tasksCount ?? 0) + 1,
				hours: (current?.hours ?? 0) + taskHours,
			});
		});

		return Array.from(result.values());
	}, [tasks, projects, reportsByTask]);

	const { setDay, endOfTheWeek, startOfTheWeek } = useSprintBorders("workweek");

	useEffect(() => {
		if (!filteredTasks.length) {
			setActiveTaskId("");
			return;
		}

		const hasActiveTask = filteredTasks.some(
			(task) => String(task.id) === activeTaskId,
		);

		if (!hasActiveTask) {
			setActiveTaskId(String(filteredTasks[0].id));
		}
	}, [filteredTasks, activeTaskId]);

	useEffect(() => {
		let isCancelled = false;

		const getReportsAndTasks = async () => {
			try {
				const reports = await fetchAllCrmItems<ReportProps>({
					entityTypeId: EntityTypeIds.reports,
					select: REPORT_SELECT_FIELDS,
					filter: {
						assignedById: user.id,
						">=begindate": startOfTheWeek,
						"<=begindate": endOfTheWeek,
						stageId: "DT1060_15:PREPARATION",
					},
				});

				if (isCancelled) {
					return;
				}

				const reportsMap = groupReportsByTask(reports);
				const taskIds = Object.keys(reportsMap);

				setAllSprintReports(reports);
				setReportsByTask(reportsMap);

				if (!taskIds.length) {
					setTasks([]);
					setReportsByTask({});
					setActiveTaskId("");
					onTasksChange?.([]);
					return;
				}

				const items = await fetchAllCrmItems<TaskProps>({
					entityTypeId: EntityTypeIds.tasks,
					select: TASK_SELECT_FIELDS,
					filter: {
						"@id": taskIds,
					},
				});

				if (isCancelled) {
					return;
				}

				const sortedItems = items.toSorted((a, b) =>
					a.stageId.localeCompare(b.stageId),
				);

				setTasks(sortedItems);
				onTasksChange?.(sortedItems);
				setActiveTaskId((prev) => {
					const hasPrevTask = sortedItems.some((task) => String(task.id) === prev);

					if (hasPrevTask) {
						return prev;
					}

					return sortedItems[0] ? String(sortedItems[0].id) : "";
				});
			} catch (error) {
				if (isCancelled) {
					return;
				}

				setAllSprintReports([]);
				setReportsByTask({});
				setTasks([]);
				setActiveTaskId("");
				onTasksChange?.([]);
				console.log("Ошибка при получении отчетов и задач сотрудника", error);
			}
		};

		if (user.id) {
			getReportsAndTasks();
		}

		return () => {
			isCancelled = true;
		};
	}, [user.id, startOfTheWeek, endOfTheWeek, onTasksChange]);

	const projectsPanel = (
		<div className={cls.projectsPanel}>
			<div className={cls.projectsPanelHeader}>Список проектов</div>

			{!sprintProjects.length ? (
				<div className={cls.projectsEmpty}>Нет проектов за спринт</div>
			) : (
				<div className={cls.projectsList}>
					{sprintProjects.map((project) => {
						const isExpanded = expandedProjectId === project.id;
						const projectTasks = tasks.filter((task) => {
							return getTaskProjectId(task) === project.id;
						});

						return (
							<div
								key={project.id}
								className={`${cls.projectCard} ${
									isExpanded ? cls.projectCardExpanded : ""
								}`}
							>
								<button
									type="button"
									className={cls.projectCardButton}
									aria-expanded={isExpanded}
									onClick={() => {
										setExpandedProjectId((currentProjectId) =>
											currentProjectId === project.id ? "" : project.id,
										);
									}}
								>
									<div className={cls.projectCardBody}>
										<div className={cls.projectCardTitle}>{project.name}</div>
										<div className={cls.projectCardMeta}>
											{project.tasksCount} задач · {formatHours(project.hours)} ч
										</div>
									</div>
									<div className={cls.projectCardArrow}>›</div>
								</button>

								{isExpanded && (
									<div className={cls.projectTasksList}>
										{projectTasks.map((task) => {
											const taskReports = reportsByTask[String(task.id)] ?? [];
											const taskHours = taskReports.reduce((sum, report) => {
												return sum + getNumberValue(report[ReportCodes.timeSpent]);
											}, 0);

											return (
												<button
													key={task.id}
													type="button"
													className={`${cls.projectTaskItem} ${
														String(task.id) === activeTaskId
															? cls.projectTaskItemActive
															: ""
													}`}
													onClick={() => setActiveTaskId(String(task.id))}
												>
													<span className={cls.projectTaskTitle}>{task.title}</span>
													<span className={cls.projectTaskMeta}>
														{formatHours(taskHours)} ч
													</span>
												</button>
											);
										})}
									</div>
								)}
							</div>
						);
					})}
				</div>
			)}
		</div>
	);

	return (
		<div className={cls.modalContent}>
			<div className={cls.header}>
				<div className={cls.userSection}>
					<UserCard user={user} />
					<div className={cls.calendarLink} onClick={() => setUser(user.id)}>
						<Link to="/reports/calendar">Календарь отчетов</Link>
					</div>
				</div>

				<div className={cls.sprintControls}>
					<button
						type="button"
						className={cls.sprintButton}
						onClick={() => {
							setDay((prev) => prev.subtract(7, "day"));
						}}
					>
						пред. спринт
					</button>

					<div className={cls.sprintPeriod}>
						{dayjs(startOfTheWeek).format("DD.MM")}-
						{dayjs(endOfTheWeek).format("DD.MM")}
					</div>

					<button
						type="button"
						className={cls.sprintButton}
						onClick={() => {
							setDay((prev) => prev.add(7, "day"));
						}}
					>
						след. спринт
					</button>
				</div>
			</div>

			<div className={cls.contentGrid}>
				<section className={cls.tasksColumn}>
					<div className={cls.tasksHeader}>
						<span className={cls.tasksTitle}>
							Задачи спринта:
							{taskFilter === "overrun" && (
								<button
									type="button"
									className={cls.resetFilterButton}
									onClick={() => setTaskFilter("all")}
								>
									Сбросить фильтр
								</button>
							)}
						</span>
						<span>Времени затрачено / Оценка</span>
					</div>

					<TasksList
						tasks={filteredTasks}
						reports={reportsByTask}
						statuses={statuses}
						activeTaskId={activeTaskId}
						onTaskSelect={setActiveTaskId}
					/>

					<div className={cls.taskReportsPanel}>
						<div className={cls.taskReportsPanelHeader}>
							<div className={cls.taskReportsPanelTitle}>
								Отчеты за выбранный период по задаче
							</div>
							<div className={cls.taskReportsPanelNote}>
								{activeTask?.title ?? "Задача не выбрана"}
							</div>
						</div>

						<div className={cls.taskReportList}>
							{activeTaskReports.length > 0 ? (
								activeTaskReports.map((report) => {
									const activityId = String(report[ReportCodes.activityType] ?? "");
									const activityName =
										activities.find((item) => item.ID === activityId)?.NAME ||
										String(report[ReportCodes.title] ?? report.title ?? "Отчет");

									return (
										<div key={report.id} className={cls.taskReportCard}>
											<div className={cls.taskReportDate}>
												{report.begindate
													? dayjs(report.begindate).format("DD.MM")
													: "—"}
											</div>
											<div className={cls.taskReportBody}>
												<div className={cls.taskReportTitle}>{activityName}</div>
												<div className={cls.taskReportMeta}>
													{user.title} · {String(report[ReportCodes.title] ?? report.title ?? "")}
												</div>
											</div>
											<span className={cls.payChip}>Client paid</span>
											<span className={cls.hoursChip}>
												{formatHours(report[ReportCodes.timeSpent])} ч
											</span>
										</div>
									);
								})
							) : (
								<div className={cls.taskReportsEmpty}>
									Нет отчетов по выбранной задаче
								</div>
							)}
						</div>
					</div>

					{projectsPanel}
				</section>

				<section className={cls.statsColumn}>
					<EmployeeStats
						tasks={tasks}
						taskReportsMap={reportsByTask}
						allSprintReports={allSprintReports}
						activities={activities}
						sprintStart={startOfTheWeek}
						sprintEnd={endOfTheWeek}
						onOpenOverrunTasks={(taskIds) => {
							setOverrunTaskIds(taskIds);
							setTaskFilter("overrun");
						}}
						doneStageId={"DT1072_18:UC_6JNSDG"}
					/>

				</section>
			</div>
		</div>
	);
};
