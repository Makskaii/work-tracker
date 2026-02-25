import dayjs from "dayjs";
import { useOutletContext } from "react-router";
import { dtoFieldsCodesDailyReports } from "@/components/calendar/constants/const";
import type { ReportProps } from "@/components/calendar/types/types";
import { Endpoints, EntityTypeIds } from "@/shared/constants/const";
import { useLoadAllData } from "@/shared/hooks/useLoadAllTasks";
import type { ReportsContext } from "@/shared/types/types";
import { getWeekBorders } from "@/shared/utils/statisticUtils/generateWeekBorders";

export const ProjectsStats = ({
	project,
}: {
	project: {
		ID: string;
		VALUE: string;
	};
}) => {
	const { tasks } = useOutletContext<ReportsContext>();
	const borders = getWeekBorders(dayjs());

	const { data } = useLoadAllData<ReportProps>({
		initialEndpoint: Endpoints.reports,
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

	return (
		<div>
			<div>Задач в спринте: {tasks.length}</div>
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
