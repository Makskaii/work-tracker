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
