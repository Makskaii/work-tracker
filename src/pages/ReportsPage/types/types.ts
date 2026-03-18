import { ActivityType } from "@/components/calendar/constants/const";

export type GroupedFields = {
	id: string;
	title: string;
	timeSpent: number;
	availableTime: number;
	effectivity: string;
	comment: string;
} & Record<ActivityType, number>;

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
	ppoSuccess = "ufCrm_1773845648828",
	kpSuccess = "ufCrm_1773845725088",
}
