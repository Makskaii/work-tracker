export type NavLeaf = {
	label: string;
	to: string;
	disabled?: boolean;
};

export type NavGroup = {
	title: string;
	items: NavLeaf[];
};

export type NavSection = {
	title: string;
	items?: NavLeaf[];
	groups?: NavGroup[];
	disabled?: boolean;
};

export type NavItem =
	| {
		key: string;
		label: string;
		type: "link";
		to: string;
		disabled?: boolean;
	}
	| {
		key: string;
		label: string;
		type: "mega";
		sections: NavSection[];
		disabled?: boolean;
	};

export const APP_TITLE = "Workdesk";

export const NAV_ITEMS: NavItem[] = [
	{
		key: "departments-reports",
		label: "Departments' Reports",
		type: "mega",
		sections: [
			{
				title: "Коммерческое направление",
				items: [
					{
						label: "Отчеты отдела продаж",
						to: "/reports/sales",
					},
					{
						label: "Отчеты отдела бизнес-аналитики",
						to: "/reports/commertial-analytics",
					},
				],
			},
			{
				title: "Производственное направление",
				groups: [
					{
						title: "Отчеты отдела разработки",
						items: [
							{
								label: "Загрузка по сотрудникам",
								to: "/reports/workload",
							},
							{
								label: "Сотрудники",
								to: "/reports/developers",
							},
						],
					},
					{
						title: "Отчеты отдела проджект-менеджмента",
						items: [
							{
								label: "Статус проектов",
								to: "/reports/project-statuses",
							},
							{
								label: "Проекты",
								to: "/reports/projects",
							},
							{
								label: "Клиенты(Новый список)",
								to: "/reports/clients",
							},
						],
					},
				],
			},
			{
				title: "Отчет по активности",
				items: [{ label: "Общий отчет", to: "/reports/calendar" }],
			},
		],
	},
	{
		key: "clients-desk",
		label: "Client's Desk",
		to: "/client-profile",
		type: "link",
	},
	{
		key: "client accounts",
		label: "Client Accounts",
		to: "/create-client-form",
		type: "link",
	},
	{
		key: "sprint-planner",
		label: "Sprint Planner",
		to: "/sprint-planner",
		type: "link",
		disabled: false,
	},
];
