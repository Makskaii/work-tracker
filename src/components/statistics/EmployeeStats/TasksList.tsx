import type { Dispatch, SetStateAction } from "react";
import { ReportCodes, TaskCodes } from "@/components/calendar/constants/const";
import type { ReportProps } from "@/components/calendar/types/types";
import { TaskItem } from "@/components/taskItem/TaskItemSimple";
import { EntityTypeIds } from "@/shared/constants/const";
import { useBitrixSlider } from "@/shared/hooks/useBitrixSlider";
import type { Status, TaskProps } from "../../../shared/types/types";

export const TasksList = ({
	tasks,
	reports,
	setActiveTask,
	setView,
	statuses,
}: {
	tasks: TaskProps[];
	reports: {
		[key: string]: ReportProps[];
	};
	setActiveTask: Dispatch<SetStateAction<TaskProps | null>>;
	setView: Dispatch<SetStateAction<"task" | "stats">>;
	statuses: Status[];
}) => {
	const { openTask } = useBitrixSlider();

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "10px",
			}}
		>
			{tasks.map((task) => {
				const timespent = reports?.[task.id]?.reduce((acc, report) => {
					return acc + Number(report[ReportCodes.timeSpent]);
				}, 0);

				return (
					<div
						key={task.id}
						onClick={() => {
							setView("task");
							setActiveTask(task);
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
