import type { Dispatch, SetStateAction } from "react";
import {
	dtoFieldsCodesDailyReports,
	dtoFieldsCodesUserReports,
} from "@/components/calendar/constants/const";
import type { ReportProps } from "@/components/calendar/types/types";
import { TaskItem } from "@/components/taskItem/TaskItemSimple";
import { EntityTypeIds } from "@/shared/constants/const";
import { openBitrixSlider } from "@/shared/utils/bitrixSlider";
import type { TaskProps } from "../../../shared/types/types";

export const TasksList = ({
	tasks,
	reports,
	setActiveTask,
	setView,
}: {
	tasks: TaskProps[];
	reports: {
		[key: string]: ReportProps[];
	};
	setActiveTask: Dispatch<SetStateAction<TaskProps | null>>;
	setView: Dispatch<SetStateAction<"task" | "stats">>;
}) => {
	const openTask = (task: TaskProps) => {
		if (window.BX24?.openPath) {
			openBitrixSlider(`/crm/type/${EntityTypeIds.tasks}/details/${task.id}/`);
			return;
		}

		setView("task");
		setActiveTask(task);
	};

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
					return acc + Number(report[dtoFieldsCodesDailyReports.timeSpent]);
				}, 0);

				return (
					<div onClick={() => openTask(task)}>
						<TaskItem
							task={task}
							estimateTime={task[dtoFieldsCodesUserReports.estimateTime]}
							timeSpent={timespent}
							key={task.id}
						/>
					</div>
				);
			})}
		</div>
	);
};
