import { useEffect, useState } from "react";
import {
	dtoFieldsCodesDailyReports,
	dtoFieldsCodesUserReports,
} from "@/components/calendar/constants/const";
import type { ReportProps } from "@/components/calendar/types/types";
import { $api } from "@/shared/config";
import { Endpoints, EntityTypeIds } from "@/shared/constants/const";
import type { TaskProps } from "../../../shared/types/types";
import { StatucBadge } from "../../statusBadge/StatucBadge";

export const TasksList = ({
	tasks,
	userId,
}: {
	tasks: TaskProps[];
	userId: string;
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
	}, [tasks, userId]);

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
					<div
						key={task.id}
						style={{
							display: "flex",
							border: "1px solid #ccc",
							padding: "10px",
							borderRadius: "12px",
							justifyContent: "space-between",
						}}
					>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								maxWidth: "80%",
							}}
						>
							<StatucBadge status={task.stageId} />
							<span
								style={{
									overflow: "hidden",
									textOverflow: "ellipsis",
									whiteSpace: "nowrap",
									maxWidth: "100%",
								}}
							>
								{task.title}
							</span>
						</div>
						<span>
							{timespent ?? 0}/{task[dtoFieldsCodesUserReports.estimateTime]} ч
						</span>
					</div>
				);
			})}
		</div>
	);
};
