import {
	dtoFieldsCodesDailyReports,
	dtoFieldsCodesUserReports,
} from "@/components/calendar/constants/const";
import type { ReportProps } from "@/components/calendar/types/types";
import { TaskItem } from "@/components/taskItem/TaskItemSimple";

import type { TaskProps } from "../../../shared/types/types";

export const TasksList = ({
	tasks,
	reports,
}: {
	tasks: TaskProps[];
	reports: {
		[key: string]: ReportProps[];
	};
}) => {
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
					<TaskItem
						task={task}
						estimateTime={task[dtoFieldsCodesUserReports.estimateTime]}
						timeSpent={timespent}
						key={task.id}
					/>
				);
			})}
		</div>
	);
};
