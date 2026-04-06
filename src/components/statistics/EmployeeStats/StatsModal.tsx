import dayjs, { Dayjs } from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router";
import { ReportCodes, TaskCodes } from "@/components/calendar/constants/const";
import type { ReportProps } from "@/components/calendar/types/types";
import { TaskView } from "@/components/taskItem/TaskView";
import { groupTasksByProject } from "@/pages/ReportsPage/helpers/groupTasks";
import type { TGroupedTasks } from "@/pages/ReportsPage/ui/ProgressReports/types";
import { $api } from "@/shared/config";
import {
	Endpoints,
	EntityTypeIds,
	TASK_SELECT_FIELDS,
} from "@/shared/constants/const";
import type { ReportsContext, TaskProps, User } from "@/shared/types/types";
import { getSprintWeekBorders } from "@/shared/utils/statisticUtils/generateWeekBorders";
import { UserCard } from "../../userCard/UserCard";
import { EmployeeStats } from "./EmployeeStats";
import { TasksList } from "./TasksList";

const today = dayjs();

export const StatsModal = ({ user }: { user: User }) => {
	const [day, setDay] = useState<Dayjs>(today);
	const borders = useMemo(() => getSprintWeekBorders(dayjs(day)), [day]);

	const { setUser, projects, statuses, activities } =
		useOutletContext<ReportsContext>();

	const [grouped, setGrouped] = useState<TGroupedTasks>({});
	const [tasks, setTasks] = useState<TaskProps[]>([]);
	const [reportsByTask, setReportsByTask] = useState<
		Record<string, ReportProps[]>
	>({});
	const [allSprintReports, setAllSprintReports] = useState<ReportProps[]>([]);
	const [activeTask, setActiveTask] = useState<TaskProps | null>(null);
	const [view, setView] = useState<"task" | "stats">("stats");

	const [taskFilter, setTaskFilter] = useState<"all" | "overrun">("all");
	const [overrunTaskIds, setOverrunTaskIds] = useState<string[]>([]);

	const filteredTasks = useMemo(() => {
		if (taskFilter === "overrun") {
			return tasks.filter((task) => overrunTaskIds.includes(String(task.id)));
		}

		return tasks;
	}, [tasks, taskFilter, overrunTaskIds]);

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
							[`<=${TaskCodes.sprintDateStart}`]: borders.endOfTheWeek,
							[`>=${TaskCodes.sprintDateStart}`]: borders.startOfTheWeek,
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
	}, [user.id, borders.startOfTheWeek, borders.endOfTheWeek]);

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
									">=begindate": borders.startOfTheWeek,
									"<=begindate": borders.endOfTheWeek,
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
	}, [tasks, user.id, borders.startOfTheWeek, borders.endOfTheWeek]);

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
							">=begindate": borders.startOfTheWeek,
							"<=begindate": borders.endOfTheWeek,
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
	}, [user.id, borders.startOfTheWeek, borders.endOfTheWeek]);

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
			}}
		>
			<div
				style={{
					display: "flex",
				}}
			>
				<div
					style={{
						display: "flex",
						gap: "1rem",
						flex: 1,
						padding: "1rem",
					}}
				>
					<UserCard user={user} />
					<div
						style={{
							padding: "1rem",
							cursor: "pointer",
						}}
						onClick={() => setUser(user.id)}
					>
						<Link to="/reports/calendar">Календарь отчетов</Link>
					</div>
				</div>

				<div
					style={{
						display: "flex",
						gap: "2rem",
						flex: 1,
						padding: "1rem",
						alignItems: "center",
						justifyContent: "center",
					}}
				>
					<button
						style={{
							background: "white",
							color: "#aeacac",
						}}
						onClick={() => {
							setDay((prev) => prev.subtract(7, "day"));
						}}
					>
						пред. спринт
					</button>

					<div>
						{dayjs(borders.startOfTheWeek).format("DD.MM")}-
						{dayjs(borders.endOfTheWeek).format("DD.MM")}
					</div>

					<button
						style={{
							background: "white",
							color: "#aeacac",
						}}
						onClick={() => {
							setDay((prev) => prev.add(7, "day"));
						}}
					>
						след. спринт
					</button>
				</div>
			</div>

			<div
				style={{
					display: "flex",
				}}
			>
				<div
					style={{
						flex: 1,
						padding: "0 1rem",
						height: "calc(100vh * 0.65)",
						overflowY: "auto",
					}}
				>
					<div
						style={{
							marginBottom: "1rem",
							position: "sticky",
							top: 0,
							background: "white",
							padding: "0.5rem 0",
							display: "flex",
							justifyContent: "space-between",
							zIndex: 2,
						}}
					>
						<span>
							Задачи спринта:
							{taskFilter === "overrun" && (
								<button
									style={{
										marginLeft: "12px",
										background: "#f3f4f6",
										color: "#374151",
									}}
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
						setActiveTask={setActiveTask}
						setView={setView}
						statuses={statuses}
					/>
				</div>

				<div
					style={{
						flex: 1,
						padding: "0 1rem",
						overflowY: "auto",
						height: "calc(100vh * 0.65)",
					}}
				>
					{view === "task" && activeTask ? (
						<TaskView
							taskId={activeTask.id}
							setActiveTask={setActiveTask}
							setView={setView}
						/>
					) : (
						<>
							<EmployeeStats
								tasks={tasks}
								taskReportsMap={reportsByTask}
								allSprintReports={allSprintReports}
								activities={activities}
								sprintStart={borders.startOfTheWeek}
								sprintEnd={borders.endOfTheWeek}
								onOpenOverrunTasks={(taskIds) => {
									setOverrunTaskIds(taskIds);
									setTaskFilter("overrun");
								}}
								doneStageId={"DT1072_18:UC_6JNSDG"}
							/>

							{tasks.length !== 0 && (
								<div style={{ marginTop: "1rem" }}>
									<div
										style={{
											display: "flex",
											justifyContent: "space-between",
											marginBottom: "1rem",
										}}
									>
										<div>Список проектов:</div>
										<div>Задач в проекте:</div>
									</div>

									<div
										style={{
											display: "flex",
											flexDirection: "column",
											overflowY: "auto",
											height: "calc(100vh * 0.25)",
											background: "#f9fafb",
											padding: "1rem",
											gap: "10px",
											borderRadius: "24px",
										}}
									>
										{Object.entries(grouped).map(
											([projectId, projectTasks]) => (
												<div
													key={projectId}
													style={{
														display: "flex",
														justifyContent: "space-between",
													}}
												>
													<div>
														{
															projects.find(
																(project) => project.id === projectId,
															)?.name
														}
													</div>
													<div>{projectTasks?.length}</div>
												</div>
											),
										)}
									</div>
								</div>
							)}
						</>
					)}
				</div>
			</div>
		</div>
	);
};
