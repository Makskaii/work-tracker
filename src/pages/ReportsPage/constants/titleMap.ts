import type { Header } from "@/shared/types/table";
import type { GroupedFields } from "../types/types";

export const dataArray = (
	tasksLength: number,
	inProgressCount: number,
	noEstimeTimeCount: number,
) => {
	return [
		{
			title: "Всего задач на сотруднике",
			value: tasksLength,
		},
		{
			title: "В работе",
			value: inProgressCount,
		},
		{
			title: "Задач без оценки времени",
			value: noEstimeTimeCount,
		},
	];
};

export const Navigation = [
	{
		title: "Проекты",
		path: "projects",
	},
	{
		title: "Сотрудники",
		path: "new-reports",
	},
	{
		title: "Календарь",
		path: "employees",
	},
];

export const headersForDevs: Header<GroupedFields>[] = [
	{
		title: "Cотрудник",
		key: "title",
	},
	{
		title: "План часов",
		key: "availableTime",
	},
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
