export type NavLeaf = {
	label: string;
	to: string;
	key?: string;
	icon?: string;
	disabled?: boolean;
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
	  };

export type NavigationGroup = {
	title: string;
	items: NavItem[];
};

export const APP_TITLE = "Workdesk";

export const EXTRA_NAV_ITEMS: NavLeaf[] = [
	{ label: "Загрузки по сотрудникам", to: "/reports/workload" },
	{ label: "Список клиентов", to: "/reports/clients" },
	{ label: "Client's Desk", to: "/client-profile" },
	{ label: "Client Accounts", to: "/create-client-form" },
	{ label: "Sprint Planner", to: "/sprint-planner" },
];

export const NAVIGATION_GROUPS: NavigationGroup[] = [
	{
		title: "Разделы отчётов",
		items: [
			{
				key: "departments-reports",
				label: "Календарь",
				to: "/reports/calendar",
				type: "link",
				icon: "■",
			},
			{
				key: "profitability-report",
				label: "Отчёт по проектам",
				to: "/reports/profitability",
				type: "link",
				icon: "₽",
			},
			{
				key: "sales-report",
				label: "Отчёт по продажам",
				to: "/reports/sales",
				type: "link",
				icon: "S",
			},
			{
				key: "analytics-report",
				label: "Отчёт аналитики",
				to: "/reports/commertial-analytics",
				type: "link",
				icon: "A",
			},
			{
				key: "development-report",
				label: "Отчёт разработки",
				to: "/reports/development",
				type: "link",
				icon: "D",
			},
		],
	},
	{
		title: "Приложение для клиентов",
		items: [
			{
				key: "clients-desk",
				label: "Приложение для клиентов",
				to: "/client-profile",
				type: "link",
				icon: "♟",
			},
			{
				key: "client accounts",
				label: "Клиентские аккаунты",
				to: "/create-client-form",
				type: "link",
			},
			{
				key: "client-hours-packages",
				label: "Пакеты часов клиентов",
				to: "/client-hours-packages",
				type: "link",
				icon: "ч",
			},
		],
	},
	{
		title: "Доп. списки",
		items: [
			{
				key: "project-management",
				label: "Проектный менеджмент",
				to: "/reports/developers",
				type: "link",
				icon: "PM",
			},
			{
				key: "workload",
				label: "Загрузки по сотрудникам",
				to: "/reports/workload",
				type: "link",
				icon: "З",
			},
			{
				key: "clients-list",
				label: "Список клиентов",
				to: "/reports/clients",
				type: "link",
				icon: "K",
			},
		],
	},
];
