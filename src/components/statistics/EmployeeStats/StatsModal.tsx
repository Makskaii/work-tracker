import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router";
import { ReportCodes, TaskCodes } from "@/components/calendar/constants/const";
import type { ReportProps } from "@/components/calendar/types/types";
import { groupTasksByProject } from "@/pages/ReportsPage/helpers/groupTasks";
import type { TGroupedTasks } from "@/pages/ReportsPage/ui/ProgressReports/types";
import { $api } from "@/shared/config";
import {
	Endpoints,
	EntityTypeIds,
	TASK_SELECT_FIELDS,
} from "@/shared/constants/const";
import { useSprintBorders } from "@/shared/hooks/useSprintBorders";
import type { ReportsContext, TaskProps, User } from "@/shared/types/types";
import { UserCard } from "../../userCard/UserCard";
import { DeveloperProjectsAccordion } from "./DeveloperProjectsList";
import { EmployeeStats } from "./EmployeeStats";
import cls from "./StatsModal.module.scss";
import { TasksList } from "./TasksList";

export const StatsModal = ({ user }: { user: User }) => {
	const { setUser, projects, statuses, activities } =
		useOutletContext<ReportsContext>();

	const [grouped, setGrouped] = useState<TGroupedTasks>({});
	const [tasks, setTasks] = useState<TaskProps[]>([]);
	const [reportsByTask, setReportsByTask] = useState<
		Record<string, ReportProps[]>
	>({});
	const [allSprintReports, setAllSprintReports] = useState<ReportProps[]>([]);

	const [taskFilter, setTaskFilter] = useState<"all" | "overrun">("all");
	const [overrunTaskIds, setOverrunTaskIds] = useState<string[]>([]);

	const filteredTasks = useMemo(() => {
		if (taskFilter === "overrun") {
			return tasks.filter((task) => overrunTaskIds.includes(String(task.id)));
		}

		return tasks;
	}, [tasks, taskFilter, overrunTaskIds]);

	const { setDay, endOfTheWeek, startOfTheWeek } = useSprintBorders();

	useEffect(() => {
		const getTasks = async () => {
			try {
				const response = await $api.get<{
					result: {
						items: TaskProps[];
					};
				}>(Endpoints.crmItems, {
					params: {
						entityTypeId: EntityTypeIds.tasks,
						select: TASK_SELECT_FIELDS,
						filter: {
							[`<=${TaskCodes.sprintDateStart}`]: endOfTheWeek,
							[`>=${TaskCodes.sprintDateStart}`]: startOfTheWeek,
							assignedById: user.id,
						},
					},
				});

				const items = response.data.result.items.toSorted((a, b) =>
					a.stageId.localeCompare(b.stageId),
				);

				setTasks(items);
				setGrouped(groupTasksByProject(items));
			} catch (error) {
				console.log("Ошибка при получении задач сотрудника", error);
			}
		};

		if (user.id) {
			getTasks();
		}
	}, [user.id, startOfTheWeek, endOfTheWeek]);

	useEffect(() => {
		const getReportsByTask = async () => {
			try {
				if (!tasks.length) {
					setReportsByTask({});
					return;
				}

				const responses = await Promise.all(
					tasks.map((task) =>
						$api.get(Endpoints.crmItems, {
							params: {
								entityTypeId: EntityTypeIds.reports,
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
									`parentId1072`,
								],
								filter: {
									[ReportCodes.parentId]: task.id,
									assignedById: user.id,
									">=begindate": startOfTheWeek,
									"<=begindate": endOfTheWeek,
								},
							},
						}),
					),
				);

				const nextMap: Record<string, ReportProps[]> = {};

				for (const response of responses) {
					const items = response.data.result.items as ReportProps[];
					if (!items.length) continue;

					const taskId =
						String(items[0]?.parentId1072) ??
						String(items[0]?.[ReportCodes.taskId]);

					if (taskId) {
						nextMap[taskId] = items;
					}
				}

				setReportsByTask(nextMap);
			} catch (error) {
				console.log("Ошибка при получении отчетов по задачам", error);
			}
		};

		if (user.id) {
			getReportsByTask();
		}
	}, [tasks, user.id, startOfTheWeek, endOfTheWeek]);

	useEffect(() => {
		const getAllSprintReports = async () => {
			try {
				const response = await $api.get<{
					result: {
						items: ReportProps[];
					};
				}>(Endpoints.crmItems, {
					params: {
						entityTypeId: EntityTypeIds.reports,
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
						filter: {
							assignedById: user.id,
							">=begindate": startOfTheWeek,
							"<=begindate": endOfTheWeek,
						},
					},
				});

				setAllSprintReports(response.data.result.items ?? []);
			} catch (error) {
				console.log("Ошибка при получении всех отчетов сотрудника", error);
			}
		};

		if (user.id) {
			getAllSprintReports();
		}
	}, [user.id, startOfTheWeek, endOfTheWeek]);

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
					/>
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

					{tasks.length !== 0 && (
						<DeveloperProjectsAccordion
							projects={projects}
							tasks={tasks}
							grouped={grouped}
						/>
					)}
				</section>
			</div>
		</div>
	);
};
