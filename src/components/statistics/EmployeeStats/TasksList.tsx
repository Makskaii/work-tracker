import type { Dispatch, SetStateAction } from "react";
import {
	dtoFieldsCodesDailyReports,
	dtoFieldsCodesUserReports,
} from "@/components/calendar/constants/const";
import type { ReportProps } from "@/components/calendar/types/types";
import { TaskItem } from "@/components/taskItem/TaskItemSimple";
import { useB24Frame } from "@/shared/config/bitrixProvider/bitrixContext";
import { EntityTypeIds } from "@/shared/constants/const";
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
	const b24 = useB24Frame();

	const handleOpenTask = async (task: TaskProps) => {
		if (!b24) {
			setView("task");
			setActiveTask(task);
			return;
		}

		const url = b24.slider.getUrl(
			`/crm/type/${EntityTypeIds.tasks}/details/${task.id}/`,
		);
		const result = await b24.slider.openPath(url, 950);

		if (!result.isOpenAtNewWindow && result.isClose) {
			// при необходимости обнови данные
			console.log("error");
		}
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
					<div key={task.id} onClick={() => handleOpenTask(task)}>
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
