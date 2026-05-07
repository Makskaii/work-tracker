import { ReportCodes, TaskCodes } from "@/components/calendar/constants/const";
import type { ReportProps } from "@/components/calendar/types/types";
import { TaskItem } from "@/components/taskItem/TaskItemSimple";
import { EntityTypeIds } from "@/shared/constants/const";
import { useBitrixSlider } from "@/shared/hooks/useBitrixSlider";
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
}: {
	tasks: TaskProps[];
	reports: {
		[key: string]: ReportProps[];
	};
	statuses: Status[];
}) => {
	const { openTask } = useBitrixSlider();

	if (!tasks.length) {
		return <div className={cls.tasksEmptyState}>Нет задач для отображения</div>;
	}

	return (
		<div className={cls.tasksList}>
			{tasks.map((task) => {
				const timespent = reports?.[task.id]?.reduce((acc, report) => {
					return acc + getNumberValue(report[ReportCodes.timeSpent]);
				}, 0);

				return (
					<div
						key={task.id}
						onClick={() => {
							openTask(task.id, EntityTypeIds.tasks);
						}}
					>
						<TaskItem
							task={task}
							estimateTime={task[TaskCodes.estimateTime]}
							timeSpent={timespent}
							key={task.id}
							statuses={statuses}
						/>
					</div>
				);
			})}
		</div>
	);
};
