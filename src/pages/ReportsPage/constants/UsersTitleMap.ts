import { ActivityType } from "@/components/calendar/constants/const";
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
		title: "Разработка",
		key: ActivityType.development,
	},
	{
		title: "Внутренний созвон с аналитиком",
		key: ActivityType.analitycsCall,
	},
	{
		title: "Внутренний созвон с разработчиком",
		key: ActivityType.devsCall,
	},
	{
		title: "Созвон с клиентом",
		key: ActivityType.clientCall,
	},
	{
		title: "Другое: \n Планёрки  \n План факт",
		key: ActivityType.dash,
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
