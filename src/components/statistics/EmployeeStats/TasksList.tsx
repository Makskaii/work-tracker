import { useEffect, useState } from "react";
import {
	dtoFieldsCodesDailyReports,
	dtoFieldsCodesUserReports,
} from "@/components/calendar/constants/const";
import type { ReportProps } from "@/components/calendar/types/types";
import { TaskItem } from "@/components/taskItem/TaskItemSimple";
import { $api } from "@/shared/config";
import { Endpoints, EntityTypeIds } from "@/shared/constants/const";
import type { TaskProps } from "../../../shared/types/types";

export const TasksList = ({
	tasks,
	userId,
	borders,
}: {
	tasks: TaskProps[];
	userId: string;
	borders: {
		startOfTheWeek: string;
		endOfTheWeek: string;
	};
}) => {
	const [reports, setReports] = useState<{
		[key: string]: ReportProps[];
	}>({});

	useEffect(() => {
		const getReportsByTask = async () => {
			try {
				const reportsByTask = await Promise.all(
					tasks.map((task) =>
						$api.get(Endpoints.crmItems, {
							params: {
								entityTypeId: EntityTypeIds.reports,
								filter: {
									[dtoFieldsCodesDailyReports.taskId]: task.id,
									assignedById: userId,
									">=begindate": borders.startOfTheWeek,
									"<=begindate": borders.endOfTheWeek,
								},
							},
						}),
					),
				);

				reportsByTask.map((item) => {
					const items = item.data.result.items;

					if (items.length !== 0)
						setReports((prev) => ({
							...prev,
							[items[0]?.[dtoFieldsCodesDailyReports.taskId]]: items,
						}));
				});
			} catch (error) {
				console.log(error);
			}
		};

		if (userId) getReportsByTask();
	}, [tasks, userId, borders.endOfTheWeek, borders.startOfTheWeek]);

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
