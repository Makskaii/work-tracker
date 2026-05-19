import type { GroupedReportFields } from "@/shared/types/table";
import type { ReportCodes, ReportStageId } from "../constants/const";

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
	[ReportCodes.company]?: number;
	[ReportCodes.parentproject]?: number;
	assignedById: number;
	lastActivityTime: string;
	stageId: ReportStageId;
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
	reports?: GroupedReportFields[] | null;
	confirmedReports?: GroupedReportFields[] | null;
	unconfirmedReports?: GroupedReportFields[] | null;
	unconfirmedHours?: number | null;
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
	confirmedReports?: GroupedReportFields[] | null;
	unconfirmedReports?: GroupedReportFields[] | null;
	unconfirmedHours?: number | null;
}
