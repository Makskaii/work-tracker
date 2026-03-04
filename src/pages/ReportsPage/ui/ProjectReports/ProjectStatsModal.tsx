import dayjs from "dayjs";
import { useOutletContext } from "react-router";
import { dtoFieldsCodesDailyReports } from "@/components/calendar/constants/const";
import type { ReportProps } from "@/components/calendar/types/types";
import { StatucBadge } from "@/components/statusBadge/StatucBadge";
import { Endpoints, EntityTypeIds } from "@/shared/constants/const";
import { useLoadAllData } from "@/shared/hooks/useLoadAllTasks";
import type { ReportsContext } from "@/shared/types/types";
import { getWeekBorders } from "@/shared/utils/statisticUtils/generateWeekBorders";

export const ProjectsStats = ({
	project,
}: {
	project: {
		ID: string;
		NAME: string;
	};
}) => {
	const { tasks } = useOutletContext<ReportsContext>();
	const borders = getWeekBorders(dayjs());

	const { data } = useLoadAllData<ReportProps>({
		initialEndpoint: Endpoints.crmItems,
		initialFilters: {
			params: {
				entityTypeId: EntityTypeIds.reports,

				select: [
					"id",
					"title",
					"begindate",
					dtoFieldsCodesDailyReports.title,
					dtoFieldsCodesDailyReports.timeSpent,
					dtoFieldsCodesDailyReports.project,
					dtoFieldsCodesDailyReports.taskId,
					"assignedById",
					"createdTime",
					"lastActivityTime",
				],
				filter: {
					[dtoFieldsCodesDailyReports.project]: project.ID,
					">=createdTime": borders.startOfTheWeek,
					"<=createdTime": borders.endOfTheWeek,
				},
			},
		},
	});
	console.log({ data });
	return (
		<div>
			<div>Задач в спринте: {tasks.length}</div>
			<div>
				{tasks.map((task) => (
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
					</div>
				))}
			</div>
			<div>
				Всего времени затрачено:{" "}
				{data.reduce((acc, report) => {
					return (
						acc +
						parseFloat(String(report[dtoFieldsCodesDailyReports.timeSpent]))
					);
				}, 0)}
			</div>
		</div>
	);
};
