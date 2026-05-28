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

export const EXTRA_NAV_ITEMS: NavLeaf[] = [
	{ label: "Загрузки по сотрудникам", to: "/reports/workload" },
	{ label: "Список клиентов", to: "/reports/clients" },
	{ label: "Client's Desk", to: "/client-profile" },
	{ label: "Client Accounts", to: "/create-client-form" },
	{ label: "Sprint Planner", to: "/sprint-planner" },
];

export const NAV_ITEMS: NavItem[] = [
	{
		key: "departments-reports",
		label: "Отчёты отделов",
		to: "/reports/sales",
		type: "link",
	},
	{
		key: "client-app",
		label: "Приложение для клиентов",
		to: "/client-profile",
		type: "link",
	},
	{
		key: "reports-sections",
		label: "РАЗДЕЛЫ ОТЧЕТОВ",
		type: "mega",
		sections: [
			{
				title: "Календарь сотрудников",
				items: [
					{ label: "Календарь", to: "/reports/calendar" },
					{ label: "Проектный менеджмент", to: "/reports/developers" },
				],
			},
			{
				title: "Отчеты",
				items: [
					{ label: "Отчет рентабельности", to: "/reports/projects" },
					{ label: "Отчет аналитики", to: "/reports/commertial-analytics" },
					{ label: "Отчет разработки", to: "/reports/project-statuses" },
					{ label: "Отчет продаж", to: "/reports/sales" },
				],
			},
		],
	},
];
