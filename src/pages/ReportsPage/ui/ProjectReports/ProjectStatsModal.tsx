import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router";
import {
	dtoFieldsCodesDailyReports,
	dtoFieldsCodesUserReports,
} from "@/components/calendar/constants/const";
import type { ReportProps } from "@/components/calendar/types/types";
import { TaskItemExtended } from "@/components/taskItem/TaskItemExtended";
import { UserCard } from "@/components/userCard/UserCard";
import { Endpoints, EntityTypeIds } from "@/shared/constants/const";
import { useLoadAllData } from "@/shared/hooks/useLoadAllTasks";
import type { ReportsContext, TaskProps } from "@/shared/types/types";
import { getWeekArray } from "@/shared/utils";
import { getWeekBorders } from "@/shared/utils/statisticUtils/generateWeekBorders";
import { getSrartEndMonthDate } from "@/shared/utils/utils";
import { getTasks } from "../../api/getTasks";

export const ProjectsStats = ({
	project,
}: {
	project: {
		ID: string;
		NAME: string;
	};
}) => {
	const { month, year, users } = useOutletContext<ReportsContext>();
	const [tasks, setTasks] = useState<TaskProps[]>([]);
	const [groupedByTaskReports, setGroupedReports] =
		useState<Record<number, ReportProps[]>>();

	const [groupedByActivityReports, setGroupedActivityReports] =
		useState<Record<number, ReportProps[]>>();

	const currMonth = month ?? dayjs().month();
	const currYear = year ?? dayjs().year();

	useEffect(() => {
		const fetchTasks = async () => {
			const response = await getTasks({
				[dtoFieldsCodesUserReports.project]: project.ID,
				">=createdTime": getSrartEndMonthDate("start", currMonth, currYear),
				"<=createdTime": getSrartEndMonthDate("end", currMonth, currYear),
			});

			setTasks(response);
		};

		fetchTasks();
	}, [project.ID, currMonth, currYear]);
	const borders = getWeekBorders(dayjs());

	const devsIds = useMemo(() => {
		return new Set(tasks.map((task) => task.assignedById));
	}, [tasks]);

	const { data } = useLoadAllData<ReportProps>({
		initialEndpoint: Endpoints.crmItems,
		initialFilters: {
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
				],
				filter: {
					[dtoFieldsCodesDailyReports.project]: project.ID,
					">=begindate": borders.startOfTheWeek,
					"<=begindate": borders.endOfTheWeek,
				},
			},
		},
	});

	useEffect(() => {
		if (data) {
			const byTaskId = data.reduce(
				(acc, report) => {
					if (!acc[report[dtoFieldsCodesDailyReports.taskId]]) {
						acc[report[dtoFieldsCodesDailyReports.taskId]] = [report];
					} else {
						acc[report[dtoFieldsCodesDailyReports.taskId]] = [
							...acc[report[dtoFieldsCodesDailyReports.taskId]],
							report,
						];
					}

					return acc;
				},
				{} as {
					[key: string]: ReportProps[];
				},
			);
			console.log(byTaskId);
			setGroupedReports(byTaskId);

			const byActivityId = data.reduce(
				(acc, report) => {
					if (!acc[report[dtoFieldsCodesDailyReports.activityType]]) {
						acc[report[dtoFieldsCodesDailyReports.activityType]] = [report];
					} else {
						acc[report[dtoFieldsCodesDailyReports.activityType]] = [
							...acc[report[dtoFieldsCodesDailyReports.activityType]],
							report,
						];
					}

					return acc;
				},
				{} as {
					[key: string]: ReportProps[];
				},
			);

			setGroupedActivityReports(byActivityId);
		}
	}, [data]);
	console.log({ groupedByActivityReports });

	const week = getWeekArray(borders.startOfTheWeek);

	return (
		tasks && (
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					gap: "1rem",
				}}
			>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						borderBottom: "1px solid #ccc",
					}}
				>
					<div
						style={{
							width: "60%",
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
						}}
					>
						<span
							style={{
								fontSize: "1.5rem",
								fontWeight: "bold",
							}}
						>
							{project.NAME}
						</span>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: "1rem",
							}}
						>
							<button
								style={{
									background: "white",
									color: "#aeacac",
								}}
							>
								пред. спринт
							</button>
							<div
								style={{
									display: "flex",
									flexDirection: "column",
									alignItems: "center",
								}}
							>
								<span>Cпринт</span>
								<div>
									{dayjs(borders.startOfTheWeek).format("DD.MM")}-
									{dayjs(borders.endOfTheWeek).format("DD.MM")}
								</div>
							</div>
							<button
								style={{
									background: "white",
									color: "#aeacac",
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
						<span
							style={{
								background: "white",
								color: "#aeacac",
								padding: "1rem",
								border: "1px solid #ccc",
								borderRadius: "5px 0 0 0",
								borderBottom: "none",
								cursor: "pointer",
							}}
						>
							Задачи
						</span>
						<span
							style={{
								padding: "1rem",
								background: "white",
								color: "#aeacac",
								border: "1px solid #ccc",
								borderRadius: "0 5px 0 0",
								borderBottom: "none",
								cursor: "pointer",
							}}
						>
							Сотрудники
						</span>
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
						}}
					>
						<div
							style={{
								marginBottom: "1rem",
							}}
						>
							Задач в спринте: {tasks.length}
						</div>
						<div
							style={{
								display: "flex",
								flexDirection: "column",
								gap: "10px",
								height: "100%",
								maxHeight: "calc(100vh*0.75)",
								overflowY: "auto",
							}}
						>
							{tasks.map((task) => {
								const timespent = groupedByTaskReports?.[
									Number(task.id)
								]?.reduce((acc, report) => {
									return (
										acc + Number(report[dtoFieldsCodesDailyReports.timeSpent])
									);
								}, 0);
								return (
									<TaskItemExtended
										task={task}
										estimateTime={task[dtoFieldsCodesUserReports.estimateTime]}
										key={task.id}
										timeSpent={timespent ?? 0}
									/>
								);
							})}
						</div>
					</div>
					<div
						style={{
							flex: 1,
						}}
					>
						<div>
							<div
								style={{
									display: "flex",
									justifyContent: "space-between",
									padding: "0 10px",
									marginBottom: "10px",
								}}
							>
								<span>
									Всего времени затрачено:{" "}
									{data.reduce((acc, report) => {
										return (
											acc +
											parseFloat(
												String(report[dtoFieldsCodesDailyReports.timeSpent]),
											)
										);
									}, 0)}
									ч.
								</span>

								<span>
									Первичная оценка:{" "}
									{tasks.reduce((acc, report) => {
										return (
											acc +
											parseFloat(
												String(report[dtoFieldsCodesUserReports.estimateTime]),
											)
										);
									}, 0)}
									ч.
								</span>
							</div>
							<div
								style={{
									padding: "0 10px",
								}}
							>
								<div
									style={{
										boxShadow:
											"rgba(0, 0, 0, 0.05) 0px 6px 24px 0px, rgba(0, 0, 0, 0.08) 0px 0px 0px 1px",
										padding: "1rem",
										borderRadius: "12px",
									}}
								>
									<div
										style={{
											marginBottom: "10px",
										}}
									>
										Разработчики:
									</div>
									<div
										style={{
											display: "flex",
											flexDirection: "column",
											gap: "10px",
										}}
									>
										{users.map((user) => {
											if (devsIds.has(Number(user.id)))
												return (
													<div
														style={{
															display: "flex",
														}}
													>
														<UserCard user={user} key={user.id} />
														Задач в проекте:{" "}
														{
															tasks.filter(
																(task) => String(task.assignedById) === user.id,
															).length
														}
													</div>
												);
										})}
									</div>
								</div>
							</div>

							<div
								style={{
									padding: "0 10px",
									marginTop: "1rem",
								}}
							>
								<div
									style={{
										boxShadow:
											"rgba(0, 0, 0, 0.05) 0px 6px 24px 0px, rgba(0, 0, 0, 0.08) 0px 0px 0px 1px",
										padding: "1rem",
										borderRadius: "12px",
									}}
								>
									<span
										style={{
											marginBottom: "10px",
										}}
									>
										Активность в проекте:
									</span>
									<div
										style={{
											borderLeft: "1px solid black",
											borderBottom: "1px solid black",
											display: "flex",
											justifyContent: "space-between",
											minHeight: "300px",
										}}
									>
										{week.map((day) => {
											return (
												<div key={day.day}>
													<div
														style={{
															display: "flex",
															flexDirection: "column",
															alignItems: "center",
														}}
													>
														<div>{day.name}</div>
														<div> {dayjs(day.day).format("DD.MM")}</div>
													</div>
												</div>
											);
										})}
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		)
	);
};
