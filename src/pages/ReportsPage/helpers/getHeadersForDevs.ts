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

	return [
		{
			title: "Cотрудник",
			key: "title",
		},
		{
			title: "План часов",
			key: "availableTime",
		},
		...activityHeaders,
		{
			title: "Факт часов",
			key: "timeSpent",
		},
		{
			title: "Загрузка",
			key: "effectivity",
		},
		{
			title: "Комментарий",
			key: "comment",
		},
	];
};
