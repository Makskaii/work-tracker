export interface ReportProps {
	id: string;
	title: string;
	day: string;
	taskId: string;
	timeSpent: number;
	responsible: string;
	activityType?: number;
}

const getDaysInMonth = (year: number, month: number) => {
	return new Date(year, month + 1, 0).getDate();
};

const getDayName = (date: Date) => {
	return date.toLocaleDateString("ru-RU", { weekday: "short" });
};

const groupReportsByDate = (
	reports: ReportProps[],
): {
	[key: string]: {
		reports: ReportProps[];
		total: number;
	};
} => {
	return reports.reduce(
		(
			groups: {
				[key: string]: {
					reports: ReportProps[];
					total: number;
				};
			},
			report,
		) => {
			const dateStr = report.day?.split("T")[0];

			if (!groups[dateStr]) {
				groups[dateStr] = {
					reports: [],
					total: 0,
				};
			}

			groups[dateStr].reports.push(report);
			groups[dateStr].total += Number(report.timeSpent);

			return groups;
		},
		{},
	);
};

export const generateMonthDays = ({
	selectedYear,
	selectedMonth,
	reports,
}: {
	selectedYear: number;
	selectedMonth: number;
	reports: ReportProps[];
}) => {
	const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
	const firstDayOfMonth = new Date(selectedYear, selectedMonth, 1);

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
		const isToday = date.toDateString() === new Date().toDateString();

		const groupedReports = groupReportsByDate(reports);

		const dateKey = date.toLocaleDateString("en-CA");

		daysArray.push({
			id: `${selectedYear}-${selectedMonth}-${day}`,
			date: date,
			dayNumber: day,
			dayName: getDayName(date),
			fullDayName: date.toLocaleDateString("ru-RU", { weekday: "long" }),
			isToday: isToday,
			isWeekend: isWeekend,
			isCurrentMonth: true,
			isEmpty: false,
			totalHours: groupedReports[dateKey]?.total || null,
			reports: groupedReports[dateKey]?.reports || null,
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
