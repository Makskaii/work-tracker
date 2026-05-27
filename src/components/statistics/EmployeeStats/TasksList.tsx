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
				const taskId = String(task.id);
				const taskReports = reports?.[taskId] ?? [];

				const timespent = taskReports.reduce((acc, report) => {
					return acc + getNumberValue(report[ReportCodes.timeSpent]);
				}, 0);

				const isActive = taskId === activeTaskId;

				return (
					<button
						key={taskId}
						type="button"
						className={`${cls.taskButton} ${
							isActive ? cls.taskButtonActive : ""
						}`}
						onClick={() => onTaskSelect(taskId)}
					>
						<TaskItem
							task={task}
							estimateTime={task[TaskCodes.estimateTime]}
							timeSpent={timespent}
							statuses={statuses}
						/>
					</button>
				);
			})}
		</div>
	);
};
