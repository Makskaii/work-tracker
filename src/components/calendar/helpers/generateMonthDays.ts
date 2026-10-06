import type { GroupedReportFields } from "@/shared/types/table";
import { ReportStageIds } from "../constants/const";
import {
	formatLongWeekday,
	formatShortWeekday,
	getLocalCalendarDateKey,
} from "./calendarDateFormat";

const getDaysInMonth = (year: number, month: number) => {
	return new Date(year, month + 1, 0).getDate();
};

export const groupReportsByDate = (
	reports: GroupedReportFields[],
): {
	[key: string]: {
		reports: GroupedReportFields[];
		confirmedReports: GroupedReportFields[];
		unconfirmedReports: GroupedReportFields[];
		confirmedTotal: number;
		unconfirmedTotal: number;
	};
} => {
	return reports.reduce(
		(
			groups: {
				[key: string]: {
					reports: GroupedReportFields[];
					confirmedReports: GroupedReportFields[];
					unconfirmedReports: GroupedReportFields[];
					confirmedTotal: number;
					unconfirmedTotal: number;
				};
			},
			report,
		) => {
			const dateStr = report.day?.split("T")[0];

			if (!groups[dateStr]) {
				groups[dateStr] = {
					reports: [],
					confirmedReports: [],
					unconfirmedReports: [],
					confirmedTotal: 0,
					unconfirmedTotal: 0,
				};
			}

			const timeSpent = Number(report.timeSpent);

			groups[dateStr].reports.push(report);

			if (report.stageId === ReportStageIds.unconfirmed) {
				groups[dateStr].unconfirmedReports.push(report);
				groups[dateStr].unconfirmedTotal += timeSpent;
			} else {
				groups[dateStr].confirmedReports.push(report);
				groups[dateStr].confirmedTotal += timeSpent;
			}

			return groups;
		},
		{},
	);
};

export const generateMonthDays = ({
	selectedYear,
	selectedMonth,
	reports,
	todayKey = getLocalCalendarDateKey(new Date()),
}: {
	selectedYear: number;
	selectedMonth: number;
	reports: GroupedReportFields[];
	todayKey?: string;
}) => {
	const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
	const firstDayOfMonth = new Date(selectedYear, selectedMonth, 1);
	const groupedReports = groupReportsByDate(reports);

	let firstDayWeekday = firstDayOfMonth.getDay();

	firstDayWeekday = firstDayWeekday === 0 ? 6 : firstDayWeekday - 1;

	const daysArray = [];

	for (let i = 0; i < firstDayWeekday; i++) {
		daysArray.push({
			id: `empty-start-${i}`,
			date: null,
			dayNumber: null,
			dayName: "",
			fullDayName: "",
			isToday: false,
			isWeekend: false,
			isCurrentMonth: false,
			isEmpty: true,
		});
	}
	for (let day = 1; day <= daysInMonth; day++) {
		const date = new Date(selectedYear, selectedMonth, day);
		const dayOfWeek = date.getDay();

		const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
		const dateKey = getLocalCalendarDateKey(date);
		const isToday = dateKey === todayKey;

		daysArray.push({
			id: `${selectedYear}-${selectedMonth}-${day}`,
			date: date,
			dayNumber: day,
			dayName: formatShortWeekday(date),
			fullDayName: formatLongWeekday(date),
			isToday: isToday,
			isWeekend: isWeekend,
			isCurrentMonth: true,
			isEmpty: false,
			totalHours: groupedReports[dateKey]?.confirmedTotal || null,
			unconfirmedHours: groupedReports[dateKey]?.unconfirmedTotal || null,
			reports: groupedReports[dateKey]?.reports || null,
			confirmedReports: groupedReports[dateKey]?.confirmedReports || null,
			unconfirmedReports: groupedReports[dateKey]?.unconfirmedReports || null,
		});
	}

	const totalCells = Math.ceil(daysArray.length / 7) * 7;
	while (daysArray.length < totalCells) {
		daysArray.push({
			id: `empty-end-${daysArray.length}`,
			date: null,
			dayNumber: null,
			dayName: "",
			fullDayName: "",
			isToday: false,
			isWeekend: false,
			isCurrentMonth: false,
			isEmpty: true,
		});
	}

	return daysArray;
};

export const getWeek = () => {
	const day = new Date().getDay();

	const startOfTheWeek = new Date(
		new Date().setDate(new Date().getDate() - day + 1),
	);
	const endOfTheWeek = new Date(
		new Date().setDate(new Date().getDate() - day + 7),
	);

	return {
		startOfTheWeek: startOfTheWeek.toISOString(),
		endOfTheWeek: endOfTheWeek.toISOString(),
	};
};
