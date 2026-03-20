import type { Header } from "@/shared/types/table";
import type { Activity } from "../ReportsPage";
import type { GroupedFields } from "../types/types";

export const getHeadersForDevs = (
	activities: Activity[],
): Header<GroupedFields>[] => {
	const activityHeaders: Header<GroupedFields>[] = activities.map(
		(activity) => ({
			title: activity.VALUE,
			key: String(activity.ID),
		}),
	);

	activityHeaders.forEach((item) => {
		if (item.title === "Разработка") {
			item.render = (value, additionalData) => (
				<span
					style={{
						color: Number(value) < additionalData?.day * 6 ? "red" : "",
					}}
				>
					{value}
				</span>
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
				<span
					style={{
						color: Number(value) < additionalData?.day * 8 ? "red" : "",
					}}
				>
					{value}
				</span>
			),
		},

		{
			title: "Комментарий",
			key: "comment",
		},
	];
};
