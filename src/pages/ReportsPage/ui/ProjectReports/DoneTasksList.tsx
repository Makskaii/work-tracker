import dayjs from "dayjs";
import { useMemo } from "react";
import { dtoFieldsCodesUserReports } from "@/components/calendar/constants/const";
import {
	Endpoints,
	EntityTypeIds,
	TASK_SELECT_FIELDS,
} from "@/shared/constants/const";
import { useLoadAllData } from "@/shared/hooks/useLoadAllTasks";
import type { TaskProps } from "@/shared/types/types";
import { getWeekBorders } from "@/shared/utils/statisticUtils/generateWeekBorders";

export const DoneTasksList = ({ projectId }: { projectId: string }) => {
	const borders = useMemo(() => getWeekBorders(dayjs()), []);

	const { data } = useLoadAllData<TaskProps>({
		initialEndpoint: Endpoints.crmItems,
		initialFilters: {
			params: {
				entityTypeId: EntityTypeIds.tasks,
				select: TASK_SELECT_FIELDS,
				filter: {
					[`>=${dtoFieldsCodesUserReports.sprintDateStart}`]: dayjs(
						borders.startOfTheWeek,
					)
						.subtract(7, "day")
						.format("YYYY-MM-DD"),
					[`<=${dtoFieldsCodesUserReports.sprintDateStart}`]:
						borders.endOfTheWeek,
					stageId: "DT1072_18:UC_6JNSDG",
					[dtoFieldsCodesUserReports.project]: projectId,
				},
			},
		},
	});

	const groupedTasks = useMemo(() => {
		if (!data) return {};

		return data.reduce<Record<string, TaskProps[]>>((acc, task) => {
			const date = dayjs(task.movedTime).format("YYYY-MM-DD");

			if (!acc[date]) acc[date] = [];

			acc[date].push(task);

			return acc;
		}, {});
	}, [data]);

	const sortedDates = useMemo(() => {
		return Object.keys(groupedTasks).sort(
			(a, b) => dayjs(b).valueOf() - dayjs(a).valueOf(),
		);
	}, [groupedTasks]);

	return (
		<div>
			<h2>Сделанные задачи</h2>
			{sortedDates.map((date) => (
				<div key={date}>
					<h3>{dayjs(date).format("DD.MM.YYYY")}</h3>
					<div
						style={{
							border: "1px solid black",
							display: "flex",
							flexDirection: "column",
							gap: "10px",
							borderRadius: "10px",
							padding: "10px",
						}}
					>
						{groupedTasks[date].map((task) => (
							<div
								key={task.id}
								style={{
									borderBottom: "1px solid #ccc",
								}}
							>
								<b>{task.title}</b>

								<div>{task[dtoFieldsCodesUserReports.description]}</div>
							</div>
						))}
					</div>
				</div>
			))}
		</div>
	);
};
