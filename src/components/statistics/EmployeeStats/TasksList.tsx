import { ReportCodes, TaskCodes } from "@/components/calendar/constants/const";
import type { ReportProps } from "@/components/calendar/types/types";
import { TaskItem } from "@/components/taskItem/TaskItemSimple";
import type { Status, TaskProps } from "../../../shared/types/types";
import cls from "./StatsModal.module.scss";

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

export const TasksList = ({
	tasks,
	reports,
	statuses,
	activeTaskId,
	onTaskSelect,
}: {
	tasks: TaskProps[];
	reports: {
		[key: string]: ReportProps[];
	};
	statuses: Status[];
	activeTaskId: string;
	onTaskSelect: (taskId: string) => void;
}) => {
	if (!tasks.length) {
		return <div className={cls.tasksEmptyState}>Нет задач для отображения</div>;
	}

	return (
		<div className={cls.tasksList}>
			{tasks.map((task) => {
				const taskReports = reports?.[String(task.id)] ?? [];

				const timespent = taskReports.reduce((acc, report) => {
					return acc + getNumberValue(report[ReportCodes.timeSpent]);
				}, 0);

				const isActive = String(task.id) === activeTaskId;

				return (
					<div key={task.id} className={cls.taskWithReports}>
						<button
							type="button"
							className={`${cls.taskButton} ${
								isActive ? cls.taskButtonActive : ""
							}`}
							onClick={() => onTaskSelect(String(task.id))}
						>
							<TaskItem
								task={task}
								estimateTime={task[TaskCodes.estimateTime]}
								timeSpent={timespent}
								statuses={statuses}
							/>
						</button>

						{isActive && (
							<div className={cls.taskReports}>
								{taskReports.length > 0 ? (
									taskReports.map((report) => (
										<div key={report.id} className={cls.taskReportItem}>
											<div className={cls.taskReportHeader}>
												<span className={cls.taskReportTitle}>
													{String(
														report[ReportCodes.title] ??
															report.title ??
															"Отчет",
													)}
												</span>
												<span className={cls.taskReportHours}>
													{getNumberValue(report[ReportCodes.timeSpent])} ч
												</span>
											</div>

											<div className={cls.taskReportMeta}>
												{String(report.begindate ?? "")}
											</div>
										</div>
									))
								) : (
									<div className={cls.taskReportsEmpty}>
										Нет отчетов по задаче
									</div>
								)}
							</div>
						)}
					</div>
				);
			})}
		</div>
	);
};
