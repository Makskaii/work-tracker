export interface GroupedFields {
	id: string;
	title: string;
	availableTime: number;
	timeSpent: number;
	effectivity: string;
	comment: string;
	[key: string]: string | number;
}

export interface ProjectTableRow {
	id: string;
	title: string;
	status: string;
	planHours: number;
	spentHours: number;
	deviation: number;
	risk: string;
	purchasedHours?: string; // TODO поменять на number, когда будет добавлено поле. сейчас нужно для прочерка
}

export type SalesFields = {
	id: string;
	callCount: number;
	bidCount: number;
	ppoCount: number;
	kpCount: number;
	activeDeals: number;
	totalSales: number;
	salesCount: number;
};

export type SalesTableFields = {
	id: string;
	title: string;
	plan: number | string;
	fact: number | string;
	deviation: number | string;
};

export const enum SalesCodes {
	ppoSuccess = "ufCrm_1773845725088",
	kpSuccess = "ufCrm_1773845648828",
	kpday = "ufCrm_1774011083796",
	ppoDay = "ufCrm_1774011061113",
}

export type ActivitySort = 0 | 1 | 2;

export type ActivityListItem = {
	ID: string;
	IBLOCK_ID: string;
	NAME: string;
	IBLOCK_SECTION_ID: string | null;
	CREATED_BY: string;
	BP_PUBLISHED: string;
	CODE: string | null;
	SORT: string;
};

export type GroupedClientReport = {
	id: string;
	title: string;
	begindate: string;
	timeSpent: number;
	rawTimeSpent: string;
	taskId: string;
	parentId: number;
};

export type GroupedActivityItem = {
	activityId: number;
	activityTitle: string;
	sort: ActivitySort;
	timeSpent: number;
	reports: GroupedClientReport[];
};

export type GroupedSortCategory = {
	sort: ActivitySort;
	title: string;
	timeSpent: number;
	activities: GroupedActivityItem[];
};

export type GroupedProjectItem = {
	projectId: number;
	projectTitle: string;
	timeSpent: number;
	categories: Record<ActivitySort, GroupedSortCategory>;
};

export type GroupedClientItem = {
	clientId: number;
	clientTitle: string;
	timeSpent: number;
	projects: GroupedProjectItem[];
};
