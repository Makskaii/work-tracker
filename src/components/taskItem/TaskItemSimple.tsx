import type { Status, TaskProps } from "@/shared/types/types";
import { calcTimeDifference } from "@/shared/utils/calcTimeDifference";
import { StatucBadge } from "../statusBadge/StatucBadge";
import cls from "./TaskItemSimple.module.scss";

export const TaskItem = ({
	task,
	estimateTime,
	timeSpent,
	statuses,
	withTime = true,
}: {
	task: TaskProps;
	timeSpent: number;
	estimateTime: string;
	statuses: Status[];
	withTime?: boolean;
}) => {
	return (
		<div key={task.id} className={cls.taskItem}>
			<div className={cls.taskInfo}>
				<span className={cls.taskTitle}>{task.title}</span>
				<div className={cls.taskDate}>
					Обновлено {calcTimeDifference(task.lastActivityTime)}
				</div>
			</div>
			<div className={cls.taskMeta}>
				<StatucBadge statuses={statuses} status={task.stageId} />
				{withTime && (
					<span>
						{timeSpent ?? 0}/{estimateTime} ч
					</span>
				)}
			</div>
		</div>
	);
};
