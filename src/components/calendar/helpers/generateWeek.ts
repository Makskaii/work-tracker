import dayjs from "dayjs";
import type { GroupedReportFields } from "@/shared/types/table";
import type { ReportProps } from "../types/types";
import { formatLongWeekday, formatShortWeekday } from "./calendarDateFormat";

type Borders = {
	startOfTheWeek: string;
	endOfTheWeek: string;
};

type CalendarDay<TReport> = {
	id: string;
	date: Date;
	dayNumber: number;
	dayName: string;
	fullDayName: string;
	isToday: boolean;
	isWeekend: boolean;
	isCurrentMonth: boolean;
	isEmpty: boolean;
	totalHours: number | null;
	reports: TReport[] | null;
};

const buildWeekCalendar = <TReport,>(
	reports: TReport[],
	borders: Borders,
	getReportDate: (report: TReport) => string,
	getReportHours: (report: TReport) => number,
): CalendarDay<TReport>[] => {
	const start = dayjs(borders.startOfTheWeek);
	const end = dayjs(borders.endOfTheWeek);

	const groupedReports = reports.reduce<
		Record<string, { total: number; reports: TReport[] }>
	>((acc, report) => {
		const dateKey = dayjs(getReportDate(report)).format("YYYY-MM-DD");
		const hours = getReportHours(report);

		if (!acc[dateKey]) {
			acc[dateKey] = {
				total: 0,
				reports: [],
			};
		}

		acc[dateKey].total += hours;
		acc[dateKey].reports.push(report);

		return acc;
	}, {});

	const days: CalendarDay<TReport>[] = [];
	const today = dayjs();
	let current = start;

	while (current.isBefore(end) || current.isSame(end, "day")) {
		const date = current.toDate();
		const dateKey = current.format("YYYY-MM-DD");

		days.push({
			id: dateKey,
			date,
			dayNumber: current.date(),
			dayName: formatShortWeekday(date),
			fullDayName: formatLongWeekday(date),
			isToday: current.isSame(today, "day"),
			isWeekend: [0, 6].includes(current.day()),
			isCurrentMonth: current.month() === start.month(),
			isEmpty: !groupedReports[dateKey],
			totalHours: groupedReports[dateKey]?.total ?? null,
			reports: groupedReports[dateKey]?.reports ?? null,
		});

		current = current.add(1, "day");
	}

	return days;
};

export const buildWeekCalendarFromReports = <TReport extends ReportProps>(
	reports: TReport[],
	borders: Borders,
	timeSpentField: keyof ReportProps,
): CalendarDay<TReport>[] =>
	buildWeekCalendar(
		reports,
		borders,
		(report) => report.begindate,
		(report) => Number(report[timeSpentField] ?? 0),
	);

export const buildWeekCalendarFromGroupedReports = (
	reports: GroupedReportFields[],
	borders: Borders,
): CalendarDay<GroupedReportFields>[] =>
	buildWeekCalendar(
		reports,
		borders,
		(report) => report.day,
		(report) => Number(report.timeSpent ?? 0),
	);
