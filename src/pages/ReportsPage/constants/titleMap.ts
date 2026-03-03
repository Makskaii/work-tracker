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
		path: "employees",
	},
	{
		title: "Новые отчеты",
		path: "new-reports",
	},
];
