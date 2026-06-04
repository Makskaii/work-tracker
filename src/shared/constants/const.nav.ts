export type NavLeaf = {
	label: string;
	to: string;
	key?: string;
	icon?: string;
	disabled?: boolean;
};

export type NavSectionItem = {
	type: "section";
	title: string;
};

export type NavItem =
	| {
			type: "link";
			key: string;
			label: string;
			to: string;
			icon?: string;
			disabled?: boolean;
	  }
	| {
			type: "dropdown";
			key: string;
			label: string;
			icon?: string;
			items: NavLeaf[];
			disabled?: boolean;
	  }
	| NavSectionItem;

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
		label: "Отчеты отделов",
		type: "link",
		to: "/reports/calendar",
		icon: "■",
	},
	{
		key: "clients-desk",
		label: "Приложение для клиентов",
		to: "/client-profile",
		type: "link",
		icon: "♟",
	},
	{
		type: "section",
		title: "Разделы отчетов",
	},
	{
		key: "employee-calendar",
		label: "Календарь сотрудников",
		type: "dropdown",
		icon: "◴",
		items: [
			{
				key: "calendar",
				label: "Календарь",
				to: "/reports/calendar",
				icon: "K",
			},
			{
				key: "project-management",
				label: "Проектный менеджмент",
				to: "/reports/developers",
				icon: "PM",
			},
		],
	},
	{
		key: "profitability-report",
		label: "Список оплат",
		to: "/reports/profitability",
		type: "link",
		icon: "₽",
	},
	{
		key: "analytics-report",
		label: "Отчет аналитики",
		to: "/reports/commertial-analytics",
		type: "link",
		icon: "A",
	},
	{
		key: "development-report",
		label: "Отчет разработки",
		to: "/reports/development",
		type: "link",
		icon: "D",
	},
	{
		key: "sales-report",
		label: "Отчет продаж",
		to: "/reports/sales",
		type: "link",
		icon: "S",
	},
	{
		type: "section",
		title: "доп. списки",
	},
	{
		key: "workload",
		label: "Загрузки по сотрудникам",
		to: "/reports/workload",
		type: "link",
		icon: "З",
	},
	{
		key: "client accounts",
		label: "Клиентские аккаунты",
		to: "/create-client-form",
		type: "link",
	},
	{
		key: "clients-list",
		label: "Список клиентов",
		to: "/reports/clients",
		type: "link",
		icon: "K",
	},
];
