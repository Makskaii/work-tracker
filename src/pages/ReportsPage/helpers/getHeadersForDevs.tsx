import { TableCell } from "@/components/Table/universalTable/TableCellDecoration";
import type { Header } from "@/shared/types/table";
import type { ActivityListItem, GroupedFields } from "../types/types";

export const getHeadersForDevs = (
	activities: ActivityListItem[],
): Header<GroupedFields>[] => {
	const activityHeaders: Header<GroupedFields>[] = activities.map(
		(activity) => ({
			title: activity.NAME,
			key: String(activity.ID),
		}),
	);

	activityHeaders.forEach((item) => {
		if (item.title === "Разработка") {
			item.render = (value, additionalData) => (
				<TableCell
					value={value}
					styles={{
						color: Number(value) < additionalData?.day * 6 ? "red" : "",
					}}
				/>
			);
		}
	});

	return [
		{
			title: "Cотрудник",
			key: "title",
		},

		{
			title: "План часов  \n (разработка)",
			key: "availableTime",
		},
		{
			title: "Загрузка \n (разработка)",
			key: "effectivity",
		},
		...activityHeaders,
		{
			title: "Факт часов",
			key: "timeSpent",
			render: (value, additionalData) => (
				<TableCell
					value={value}
					styles={{
						color: Number(value) < additionalData?.day * 8 ? "red" : "",
					}}
				/>
			),
		},

		{
			title: "Комментарий",
			key: "comment",
		},
	];
};
