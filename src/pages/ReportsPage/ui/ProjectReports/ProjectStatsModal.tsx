import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router";
import { ReportCodes, TaskCodes } from "@/components/calendar/constants/const";
import type { ReportProps } from "@/components/calendar/types/types";
import { Spinner } from "@/components/spinner/Spinner";
import { TaskItemExtended } from "@/components/taskItem/TaskItemExtended";
import { UserCard } from "@/components/userCard/UserCard";
import { $backendApi } from "@/shared/config/axios/axios.config";
import {
	Endpoints,
	EntityTypeIds,
	TASK_SELECT_FIELDS,
} from "@/shared/constants/const";
import { useBitrixSlider } from "@/shared/hooks/useBitrixSlider";
import { useLoadAllData } from "@/shared/hooks/useLoadAllTasks";
import { useSprintBorders } from "@/shared/hooks/useSprintBorders";
import type {
	ClientListItems,
	ReportsContext,
	TaskProps,
} from "@/shared/types/types";
import { convertNumberFormat } from "@/shared/utils";
import { getFixedNumber } from "@/shared/utils/getNumber";
import { getItems } from "../../api/getTasks";
import { ProjectActivityChart } from "./ActivityChart";
import { DoneTasksList } from "./DoneTasksList";

const { VITE_BFF_API_URL } = import.meta.env;

export const ProjectsStats = ({ project }: { project: ClientListItems }) => {
	const { users, statuses, activities } = useOutletContext<ReportsContext>();
	const [tasks, setTasks] = useState<TaskProps[]>([]);

	const [view, setView] = useState<"task" | "stats">("stats");
	const [loading, setLoading] = useState(false);
	const [loadUrl, setLoadUrl] = useState("");

	const { openTask } = useBitrixSlider();

	const { startOfTheWeek, endOfTheWeek, setDay } = useSprintBorders();

	useEffect(() => {
		const fetchTasks = async () => {
			const response = await getItems<TaskProps>({
				typeId: EntityTypeIds.tasks,
				filters: {
					[TaskCodes.client]: project.ID,
					[`<=${TaskCodes.sprintDateStart}`]: endOfTheWeek,
					[`>=${TaskCodes.sprintDateStart}`]: startOfTheWeek,
				},
				select: TASK_SELECT_FIELDS,
			});
			setTasks(response.sort((a, b) => a.stageId.localeCompare(b.stageId)));
		};

		fetchTasks();
	}, [project.ID, startOfTheWeek, endOfTheWeek]);

	const devsIds = useMemo(() => {
		return new Set(tasks.map((task) => task.assignedById));
	}, [tasks]);

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
					[ReportCodes.client]: project.ID,
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
					[ReportCodes.client]: project.ID,
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
					[ReportCodes.client]: project.ID,
					">=begindate": startOfTheWeek,
					"<=begindate": endOfTheWeek,
				},
			},
		});
	}, [endOfTheWeek, project.ID, setFilters, startOfTheWeek]);

	const totalSpentTime = allReports.reduce(
		(acc, report) => acc + convertNumberFormat(report[ReportCodes.timeSpent]),
		0,
	);

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
	console.log({ groupedByTaskReports, data });

	const getReportPdf = async (
		projectId: string,
		startOfThePeriod: string,
		endOfThePeriod: string,
	) => {
		try {
			setLoading(true);
			const response = await $backendApi.post("doc-records/report", {
				id: projectId,
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
						{project.NAME}
					</span>

					<button
						onClick={async () => {
							await getReportPdf(project.ID, startOfTheWeek, endOfTheWeek);
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
							след. спринт
						</button>
					</div>

					<span>Всего времени: {getFixedNumber(totalSpentTime)} ч.</span>
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
						flex: 1.5,
						minWidth: 0,
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
							const timespent = groupedByTaskReports?.[Number(task.id)]?.reduce(
								(acc, report) => {
									return acc + Number(report[ReportCodes.timeSpent]);
								},
								0,
							);
							return (
								<div onClick={() => openTask(task.id)}>
									<TaskItemExtended
										task={task}
										estimateTime={task[TaskCodes.estimateTime]}
										key={task.id}
										timeSpent={timespent ?? 0}
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
								Всего затрачено за спринт:{" "}
								{getFixedNumber(
									data.reduce((acc, report) => {
										return (
											acc + parseFloat(String(report[ReportCodes.timeSpent]))
										);
									}, 0),
								)}
								ч.
							</span>

							<span
								style={{
									whiteSpace: "nowrap",
								}}
							>
								План по часам:{" "}
								{getFixedNumber(
									tasks.reduce((acc, report) => {
										return (
											acc + convertNumberFormat(report[TaskCodes.estimateTime])
										);
									}, 0),
								)}
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

			<DoneTasksList projectId={project.ID} />
		</div>
	);
};
