import type { GroupedReportFields } from "@/shared/types/table";
import type { ReportCodes } from "../constants/const";

export interface ReportProps {
	id: string;
	title: string;
	createdTime: string;
	begindate: string;
	[ReportCodes.project]: number;
	[ReportCodes.taskId]: string;
	[ReportCodes.timeSpent]: string;
	[ReportCodes.title]: string;
	[ReportCodes.activityType]: number;
	[ReportCodes.parentId]: number;
	assignedById: string;
	lastActivityTime: string;
}

export interface MonthDays {
	id: string;
	date: Date | null;
	dayNumber: number | null;
	dayName: string;
	fullDayName: string;
	isToday: boolean;
	isWeekend: boolean;
	isCurrentMonth: boolean;
	isEmpty: boolean;
	totalHours?: number | null;
	reports?: GroupedReportFields[];
}

export interface DayProps {
	id: string;
	date: string | null | Date;
	dayNumber: number | null;
	dayName: string | null;
	fullDayName: string;
	isToday: boolean;
	isWeekend: boolean;
	isCurrentMonth: boolean;
	isEmpty: boolean;
	totalHours?: number | null;
	reports?: GroupedReportFields[] | null;
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

export type ProjectActivityItem = {
	activityId: number;
	activityTitle: string;
	sort: ActivitySort;
	timeSpent: number;
	reports: GroupedReportFields[];
};

export type ProjectActivityCategory = {
	sort: ActivitySort;
	title: string;
	activities: ProjectActivityItem[];
	totalTimeSpent: number;
};

export type ProjectActivitiesGroup = {
	projectId: number;
	projectTitle: string;
	categories: Record<ActivitySort, ProjectActivityCategory>;
	totalTimeSpent: number;
};
