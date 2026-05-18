import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router";
import { ReportCodes } from "@/components/calendar/constants/const";
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

	const { setDay, endOfTheWeek, startOfTheWeek } = useSprintBorders("workweek");

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
					setGrouped({});
					setReportsByTask({});
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
				setGrouped(groupTasksByProject(sortedItems));
			} catch (error) {
				if (isCancelled) {
					return;
				}

				setAllSprintReports([]);
				setReportsByTask({});
				setTasks([]);
				setGrouped({});
				console.log("Ошибка при получении отчетов и задач сотрудника", error);
			}
		};

		if (user.id) {
			getReportsAndTasks();
		}

		return () => {
			isCancelled = true;
		};
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
