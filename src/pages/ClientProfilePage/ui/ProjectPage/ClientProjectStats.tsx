import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router";
import {
	ProjectCodes,
	ReportCodes,
	TaskCodes,
} from "@/components/calendar/constants/const";
import type { ReportProps } from "@/components/calendar/types/types";
import { Spinner } from "@/components/spinner/Spinner";
import { TaskItemExtended } from "@/components/taskItem/TaskItemExtended";
import { UserCard } from "@/components/userCard/UserCard";
import { ProjectActivityChart } from "@/pages/ReportsPage/ui/ProjectReports/ActivityChart";
import { DoneTasksList } from "@/pages/ReportsPage/ui/ProjectReports/DoneTasksList";
import { TASK_STAGE_IDS } from "@/pages/ReportsPage/constants/statuses";
import { $backendApi } from "@/shared/config/axios/axios.config";
import {
	Endpoints,
	EntityTypeIds,
	TASK_SELECT_FIELDS,
} from "@/shared/constants/const";
import { useBitrixSlider } from "@/shared/hooks/useBitrixSlider";
import { useLoadAllData } from "@/shared/hooks/useLoadAllTasks";
import { useLoadCrmItemsByIds } from "@/shared/hooks/useLoadCrmItemsByIds";
import { useSprintBorders } from "@/shared/hooks/useSprintBorders";
import type {
	ClientProjectProps,
	ReportsContext,
	TaskProps,
} from "@/shared/types/types";
import { convertNumberFormat } from "@/shared/utils";

const { VITE_BFF_API_URL } = import.meta.env;

const REPORT_SELECT_FIELDS = [
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
] as const;

const getReportTaskId = (report: ReportProps) => {
	const taskId = report[ReportCodes.parentId] ?? report[ReportCodes.taskId];
	const normalizedTaskId =
		taskId === null || taskId === undefined ? "" : String(taskId).trim();

	return /^\d+$/.test(normalizedTaskId) ? normalizedTaskId : "";
};

const formatHoursValue = (value: number) => {
	return Number(value.toFixed(2)).toString();
};

const getReportsWeeksCount = (reports: ReportProps[]) => {
	const reportWeeks = reports
		.map((report) => dayjs(report.begindate))
		.filter((date) => date.isValid())
		.map((date) => date.startOf("week").format("YYYY-MM-DD"));

	return Math.max(new Set(reportWeeks).size, 1);
};

const getPaidHoursAdjustmentValue = ({
	paidHours,
	reports,
	timeSpent,
}: {
	paidHours: number;
	reports: ReportProps[];
	timeSpent: number;
}) => {
	return (paidHours - timeSpent) / getReportsWeeksCount(reports);
};

export const ClientProjectsStats = ({
	project,
}: {
	project: ClientProjectProps;
}) => {
	const { users, statuses, activities } = useOutletContext<ReportsContext>();
	const [view, setView] = useState<"task" | "stats">("stats");
	const [loading, setLoading] = useState(false);
	const [loadUrl, setLoadUrl] = useState("");

	const { openTask } = useBitrixSlider();

	const { startOfTheWeek, endOfTheWeek, setDay } = useSprintBorders("workweek");
	const projectId = String(project.projectId ?? project.id);
	const companyId = String(project[ProjectCodes.company] ?? "").trim();
	const projectReportFilter = useMemo(
		() => ({
			[ReportCodes.parentproject]: projectId,
			...(companyId ? { [ReportCodes.company]: companyId } : {}),
		}),
		[projectId, companyId],
	);

	const { data, setFilters } = useLoadAllData<ReportProps>({
		initialEndpoint: Endpoints.crmItems,
		initialFilters: {
			params: {
				entityTypeId: EntityTypeIds.reports,
				select: REPORT_SELECT_FIELDS,
				filter: {
					...projectReportFilter,
					">=begindate": startOfTheWeek,
					"<=begindate": endOfTheWeek,
					stageId: "DT1060_15:PREPARATION",
				},
			},
		},
	});

	const reportTaskIds = useMemo(() => {
		return Array.from(new Set(data.map(getReportTaskId).filter(Boolean)));
	}, [data]);

	const { data: loadedTasks } = useLoadCrmItemsByIds<TaskProps>({
		entityTypeId: EntityTypeIds.tasks,
		ids: reportTaskIds,
		select: TASK_SELECT_FIELDS,
	});

	const { data: allReports } = useLoadAllData<ReportProps>({
		initialEndpoint: Endpoints.crmItems,
		initialFilters: {
			params: {
				entityTypeId: EntityTypeIds.reports,
				select: REPORT_SELECT_FIELDS,
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
				select: REPORT_SELECT_FIELDS,
				filter: {
					...projectReportFilter,
					">=begindate": startOfTheWeek,
					"<=begindate": endOfTheWeek,
					stageId: "DT1060_15:PREPARATION",
				},
			},
		});
	}, [endOfTheWeek, projectReportFilter, setFilters, startOfTheWeek]);

	const tasks = useMemo(() => {
		return loadedTasks.toSorted((a, b) => a.stageId.localeCompare(b.stageId));
	}, [loadedTasks]);

	const devsIds = useMemo(() => {
		return new Set(tasks.map((task) => task.assignedById));
	}, [tasks]);

	const totalSpentTime = allReports.reduce(
		(acc, report) => acc + convertNumberFormat(report[ReportCodes.timeSpent]),
		0,
	);

	const groupedByTaskReports = useMemo(() => {
		return data.reduce(
			(acc, report) => {
				const taskId = getReportTaskId(report);

				if (!taskId) return acc;

				if (!acc[taskId]) {
					acc[taskId] = [report];
				} else {
					acc[taskId].push(report);
				}

				return acc;
			},
			{} as Record<string, ReportProps[]>,
		);
	}, [data]);

	const groupedAllReportsByTask = useMemo(() => {
		return allReports.reduce(
			(acc, report) => {
				const taskId = getReportTaskId(report);

				if (!taskId) return acc;

				acc[taskId] = [...(acc[taskId] ?? []), report];

				return acc;
			},
			{} as Record<string, ReportProps[]>,
		);
	}, [allReports]);

	const taskPaidHoursAdjustments = useMemo(() => {
		return tasks.reduce(
			(acc, task) => {
				const allTaskReports = groupedAllReportsByTask[String(task.id)] ?? [];
				const totalTimeSpent = allTaskReports.reduce((sum, report) => {
					return sum + convertNumberFormat(report[ReportCodes.timeSpent]);
				}, 0);
				const paidHours = convertNumberFormat(task[TaskCodes.hours] ?? 0);

				if (paidHours > 0 && allTaskReports.length > 0) {
					acc[String(task.id)] = getPaidHoursAdjustmentValue({
						paidHours,
						reports: allTaskReports,
						timeSpent: totalTimeSpent,
					});
				}

				return acc;
			},
			{} as Record<string, number>,
		);
	}, [groupedAllReportsByTask, tasks]);

	const totalPaidHoursAdjustment = tasks.reduce((acc, task) => {
		if (task.stageId !== TASK_STAGE_IDS.DONE) return acc;

		const paidHours = convertNumberFormat(task[TaskCodes.hours] ?? 0);

		if (paidHours <= 0) return acc;

		return acc + (taskPaidHoursAdjustments[String(task.id)] ?? 0);
	}, 0);
	const totalSpentTimeWithPaidHours =
		totalSpentTime + totalPaidHoursAdjustment;
	const sprintSpentTimeWithPaidHours =
		data.reduce((acc, report) => {
			return acc + convertNumberFormat(report[ReportCodes.timeSpent]);
		}, 0) + totalPaidHoursAdjustment;

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
		} catch (error) {
			console.log(error);
		} finally {
			setLoading(false);
		}
	};

	return tasks && view === "stats" ? (
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
						width: "100%",
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						padding: "0 1rem",
					}}
				>
					<span
						style={{
							fontSize: "1.5rem",
							fontWeight: "bold",
						}}
					>
						{project.title}
					</span>

					<button
						onClick={async () => {
							await getReportPdf(projectId, startOfTheWeek, endOfTheWeek);
							setView("task");
						}}
						style={{
							background: "green",
							display: "flex",
							gap: "1rem",
						}}
					>
						Отчет за 2 недели
						{loading && (
							<Spinner
								onlySpin
								additionalStyles={{
									width: "20px",
									height: "20px",
								}}
							/>
						)}
					</button>

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
							onClick={() => {
								setDay((prev) => prev.subtract(7, "day"));
							}}
						>
							пред. неделя
						</button>
						<div
							style={{
								display: "flex",
								flexDirection: "column",
								alignItems: "center",
							}}
						>
							<span>Неделя</span>
							<div>
								{dayjs(startOfTheWeek).format("DD.MM")}-
								{dayjs(endOfTheWeek).format("DD.MM")}
							</div>
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
							след. неделя
						</button>
					</div>

					<span>Всего времени: {totalSpentTimeWithPaidHours.toFixed(2)} ч.</span>
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
			{tasks.length !== 0 ? (
				<div
					style={{
						display: "flex",
					}}
				>
					<div
						style={{
							flex: 1.5,
							minWidth: 0,
						}}
					>
						<div
							style={{
								marginBottom: "1rem",
							}}
						>
							Задач за неделю: {tasks.length}
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
								const taskReports = groupedByTaskReports?.[String(task.id)] ?? [];
								const timespent = taskReports.reduce((acc, report) => {
									return acc + Number(report[ReportCodes.timeSpent]);
								}, 0);
								const paidHours = convertNumberFormat(task[TaskCodes.hours] ?? 0);
								const paidHoursAdjustment =
									paidHours > 0
										? {
												value: formatHoursValue(
													taskPaidHoursAdjustments[String(task.id)] ?? 0,
												),
												total: formatHoursValue(paidHours),
											}
										: undefined;

								return (
									<div onClick={() => openTask(task.id)}>
										<TaskItemExtended
											task={task}
											estimateTime={task[TaskCodes.estimateTime]}
											key={task.id}
											timeSpent={timespent}
											paidHoursAdjustment={paidHoursAdjustment}
											statuses={statuses}
											users={users}
										/>
									</div>
								);
							})}
						</div>
					</div>
					<div
						style={{
							flex: 1,
							minWidth: 0,
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
								<span
									style={{
										whiteSpace: "nowrap",
									}}
								>
									Всего затрачено за неделю:{" "}
									{sprintSpentTimeWithPaidHours.toFixed(2)}
									ч.
								</span>

								<span
									style={{
										whiteSpace: "nowrap",
									}}
								>
									План по часам:{" "}
									{tasks.reduce((acc, report) => {
										return (
											acc + convertNumberFormat(report[TaskCodes.estimateTime])
										);
									}, 0).toFixed(2)}
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
											display: "block",
											marginBottom: "10px",
										}}
									>
										Активность в проекте:
									</span>

									<ProjectActivityChart
										reports={data}
										activities={activities}
										users={users}
										startOfWeek={startOfTheWeek}
									/>
								</div>
							</div>
						</div>
					</div>
				</div>
			) : (
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						height: "75vh",
					}}
				>
					Нет задач на этой неделе
				</div>
			)}
		</div>
	) : (
		<div
			style={{
				position: "relative",
			}}
		>
			<div
				style={{
					width: "100%",
					position: "sticky",
					top: 0,
					display: "flex",
					justifyContent: "space-between",
				}}
			>
				<button
					onClick={() => {
						loadUrl !== "" && window.open(loadUrl, "_blank");
					}}
				>
					Скачать отчет
				</button>
				<button
					onClick={() => {
						setLoadUrl("");
						setView("stats");
					}}
				>
					Назад
				</button>
			</div>

			<DoneTasksList projectId={projectId} companyId={companyId} />
		</div>
	);
};
