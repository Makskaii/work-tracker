import type { dtoFieldsCodesDailyReports } from "../constants/const";

export interface ReportProps {
	id: string;
	title: string;
	createdTime: string;
	begindate: string;
	[dtoFieldsCodesDailyReports.project]: number;
	[dtoFieldsCodesDailyReports.taskId]: string;
	[dtoFieldsCodesDailyReports.timeSpent]: string;
	[dtoFieldsCodesDailyReports.title]: string;
	[dtoFieldsCodesDailyReports.activityType]: number;
	[dtoFieldsCodesDailyReports.parentId]: number;
	assignedById: string;
	lastActivityTime: string;
}

export interface GroupedReportFields {
	id: string;
	title: string;
	timeSpent: string;

	taskId: string;
	day: string;
	project: number;
	assignedById: string;
	activity?: number;
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
