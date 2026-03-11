import dayjs from "dayjs";
import type { ReportProps } from "../types/types";

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

const getDayName = (date: Date) => {
	return date.toLocaleDateString("ru-RU", { weekday: "short" });
};

export const buildWeekCalendarFromReports = <TReport extends ReportProps>(
	reports: TReport[],
	borders: Borders,
	timeSpentField: keyof ReportProps,
): CalendarDay<TReport>[] => {
	const start = dayjs(borders.startOfTheWeek);
	const end = dayjs(borders.endOfTheWeek);

	const groupedReports = reports.reduce<
		Record<string, { total: number; reports: TReport[] }>
	>((acc, report) => {
		const dateKey = dayjs(report.begindate).format("YYYY-MM-DD");
		const hours = Number(report[timeSpentField] ?? 0);

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
	let current = start;

	while (current.isBefore(end) || current.isSame(end, "day")) {
		const date = current.toDate();
		const dateKey = current.format("YYYY-MM-DD");

		days.push({
			id: dateKey,
			date,
			dayNumber: current.date(),
			dayName: getDayName(date),
			fullDayName: date.toLocaleDateString("ru-RU", { weekday: "long" }),
			isToday: current.isSame(dayjs(), "day"),
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
