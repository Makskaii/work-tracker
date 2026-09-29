import dayjs, { type Dayjs } from "dayjs";

export type WeekRange = {
	startOfTheWeek: string;
	endOfTheWeek: string;
};

export const getWeekRange = (date: Dayjs): WeekRange => {
	const daysSinceMonday = (date.day() + 6) % 7;
	const start = date.startOf("day").subtract(daysSinceMonday, "day");

	return {
		startOfTheWeek: start.format("YYYY-MM-DD"),
		endOfTheWeek: start.add(6, "day").format("YYYY-MM-DD"),
	};
};

export const getMonthWeekRanges = (date: Dayjs): WeekRange[] => {
	const monthEnd = date.endOf("month");
	const ranges: WeekRange[] = [];
	let current = dayjs(getWeekRange(date.startOf("month")).startOfTheWeek);

	while (!current.isAfter(monthEnd, "day")) {
		ranges.push(getWeekRange(current));
		current = current.add(7, "day");
	}

	return ranges;
};

const shortMonthFormatter = new Intl.DateTimeFormat("ru-RU", {
	day: "numeric",
	month: "short",
});
const fullMonthFormatter = new Intl.DateTimeFormat("ru-RU", {
	day: "numeric",
	month: "long",
});

const monthName = (date: Dayjs, formatter: Intl.DateTimeFormat) =>
	formatter.formatToParts(date.toDate()).find((part) => part.type === "month")
		?.value ?? "";

export const formatWeekChip = (range: WeekRange): string => {
	const start = dayjs(range.startOfTheWeek);
	const end = dayjs(range.endOfTheWeek);
	const startMonth = monthName(start, shortMonthFormatter);
	const endMonth = monthName(end, shortMonthFormatter);

	if (start.year() !== end.year()) {
		return `${start.date()} ${startMonth} ${start.year()}–${end.date()} ${endMonth} ${end.year()}`;
	}
	if (start.month() !== end.month()) {
		return `${start.date()} ${startMonth}–${end.date()} ${endMonth}`;
	}
	return `${start.date()}–${end.date()} ${endMonth}`;
};

export const formatWeekTitle = (range: WeekRange): string => {
	const start = dayjs(range.startOfTheWeek);
	const end = dayjs(range.endOfTheWeek);
	const startMonth = monthName(start, fullMonthFormatter);
	const endMonth = monthName(end, fullMonthFormatter);

	if (start.year() !== end.year()) {
		return `${start.date()} ${startMonth} ${start.year()} – ${end.date()} ${endMonth} ${end.year()}`;
	}
	if (start.month() !== end.month()) {
		return `${start.date()} ${startMonth} – ${end.date()} ${endMonth} ${end.year()}`;
	}
	return `${start.date()}–${end.date()} ${endMonth} ${end.year()}`;
};
