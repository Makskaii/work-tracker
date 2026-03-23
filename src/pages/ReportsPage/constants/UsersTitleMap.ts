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
		path: "developers",
	},
	{
		title: "Календарь",
		path: "calendar",
	},
	{
		title: "Продажи",
		path: "sales",
	},
	{
		title: "Клиенты(новый список)",
		path: "clients",
	},
];
