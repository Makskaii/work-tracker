import dayjs, { Dayjs } from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router";
import {
	dtoFieldsCodesDailyReports,
	dtoFieldsCodesUserReports,
} from "@/components/calendar/constants/const";
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
import { getWeekBorders } from "@/shared/utils/statisticUtils/generateWeekBorders";
import { UserCard } from "../../userCard/UserCard";
import { EmployeeStats } from "./EmployeeStats";
import { TasksList } from "./TasksList";

const today = dayjs();

export const StatsModal = ({ user }: { user: User }) => {
	const [day, setDay] = useState<Dayjs>(today);
	const borders = useMemo(() => getWeekBorders(dayjs(day)), [day]);
	const { setUser, projects } = useOutletContext<ReportsContext>();
	const [grouped, setGrouped] = useState<TGroupedTasks>({});
	const [tasks, setTasks] = useState<TaskProps[]>([]);
	const [reports, setReports] = useState<{
		[key: string]: ReportProps[];
	}>({});
	const [activeTask, setActiveTask] = useState<TaskProps | null>(null);

	const [view, setView] = useState<"task" | "stats">("stats");

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
							[`<=${dtoFieldsCodesUserReports.sprintDateStart}`]:
								borders.endOfTheWeek,
							[`>=${dtoFieldsCodesUserReports.sprintDateStart}`]:
								borders.startOfTheWeek,
							assignedById: user.id,
						},
					},
				});

				setTasks(
					response.data.result.items.toSorted((a, b) =>
						a.stageId.localeCompare(b.stageId),
					),
				);
				setGrouped(groupTasksByProject(response.data.result.items));
			} catch {
				console.log("Ошибка при получении списка сотрудников");
			}
		};

		if (user.id) {
			getTasks();
		}
	}, [user.id, borders]);

	useEffect(() => {
		const getReportsByTask = async () => {
			try {
				const reportsByTask = await Promise.all(
					tasks.map((task) =>
						$api.get(Endpoints.crmItems, {
							params: {
								entityTypeId: EntityTypeIds.reports,
								select: [
									"id",
									"title",
									"begindate",
									dtoFieldsCodesDailyReports.title,
									dtoFieldsCodesDailyReports.timeSpent,
									dtoFieldsCodesDailyReports.project,
									dtoFieldsCodesDailyReports.taskId,
									dtoFieldsCodesDailyReports.activityType,
									"assignedById",
									"createdTime",
									"lastActivityTime",
									`parentId${EntityTypeIds.tasks}`,
								],
								filter: {
									[dtoFieldsCodesDailyReports.parentId]: task.id,
									assignedById: user.id,
									">=begindate": borders.startOfTheWeek,
									"<=begindate": borders.endOfTheWeek,
								},
							},
						}),
					),
				);

				reportsByTask.map((item) => {
					const items = item.data.result.items;

					if (items.length !== 0)
						setReports((prev) => ({
							...prev,
							[items[0]?.[dtoFieldsCodesDailyReports.taskId]]: items,
							[items[0]?.[dtoFieldsCodesDailyReports.parentId]]: items,
						}));
				});
			} catch (error) {
				console.log(error);
			}
		};

		if (user) getReportsByTask();
	}, [tasks, user, borders.endOfTheWeek, borders.startOfTheWeek]);

	const totlaTimeSpent = tasks.reduce((acc, task) => {
		const timespent = reports?.[task.id]?.reduce((acc, report) => {
			return acc + Number(report[dtoFieldsCodesDailyReports.timeSpent]);
		}, 0);

		if (timespent) {
			acc += timespent;
			return acc;
		}

		return acc;
	}, 0);

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
						<Link to="/reports/employees"> Календарь отчетов</Link>
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
						}}
					>
						<span> Задачи спринта:</span>
						<span>Времени затрачено/Оценка</span>
					</div>
					<TasksList
						tasks={tasks}
						reports={reports}
						setActiveTask={setActiveTask}
						setView={setView}
					/>
				</div>
				<div
					style={{
						flex: 1,
						padding: "0 1rem",
					}}
				>
					{view === "task" && activeTask ? (
						<TaskView
							taskId={activeTask?.id}
							setActiveTask={setActiveTask}
							setView={setView}
						/>
					) : (
						<>
							<EmployeeStats tasks={tasks} total={totlaTimeSpent} />
							{tasks.length !== 0 && (
								<div>
									<div
										style={{
											display: "flex",
											justifyContent: "space-between",
											marginBottom: "1rem",
										}}
									>
										<div> Список проектов:</div>
										<div> Задач в проекте:</div>
									</div>

									<div
										style={{
											display: "flex",
											flexDirection: "column",
											overflowY: "auto",
											height: "calc(100vh * 0.4)",
											background: "#f9fafb",
											padding: "1rem",
											gap: "10px",
											borderRadius: "24px",
										}}
									>
										{Object.entries(grouped).map(([projectId, tasks]) => (
											<div
												key={projectId}
												style={{
													display: "flex",
													justifyContent: "space-between",
												}}
											>
												<div>
													{
														projects.find((project) => project.ID === projectId)
															?.NAME
													}
												</div>
												<div> {tasks?.length}</div>
											</div>
										))}
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
