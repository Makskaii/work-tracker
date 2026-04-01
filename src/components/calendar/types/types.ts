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
	[ReportCodes.client]: number;
	assignedById: number;
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
