import dayjs, { Dayjs } from "dayjs";
import quarterOfYear from "dayjs/plugin/quarterOfYear";
import { useCallback, useMemo, useState } from "react";

dayjs.extend(quarterOfYear);

export type Period = "week" | "month" | "quarter" | "year";
export type WeekMode = "sprint" | "workweek";

type DateBorders = {
	start: string;
	end: string;
	startDate: Dayjs;
	endDate: Dayjs;
};

const getSprintBorders = (date: Dayjs) => {
	const dayOfWeek = date.day();

	const diffToTuesday = dayOfWeek >= 2 ? dayOfWeek - 2 : dayOfWeek + 5;
	const startDate = date.startOf("day").subtract(diffToTuesday, "day");
	const endDate = startDate.add(6, "day").endOf("day");

	return { startDate, endDate };
};

const getWorkWeekBorders = (date: Dayjs) => {
	const dayOfWeek = date.day();

	const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
	const startDate = date.startOf("day").subtract(diffToMonday, "day");
	const endDate = startDate.add(4, "day").endOf("day");

	return { startDate, endDate };
};

const normalizeDayByPeriod = (
	date: Dayjs,
	period: Period,
	weekMode: WeekMode,
): Dayjs => {
	if (period === "week") {
		const range =
			weekMode === "sprint" ? getSprintBorders(date) : getWorkWeekBorders(date);

		return range.startDate.startOf("day");
	}

	if (period === "month") {
		return date.startOf("month");
	}

	if (period === "quarter") {
		return date.startOf("quarter");
	}

	return date.startOf("year");
};

export const usePeriodBorders = (
	initialPeriod: Period = "week",
	initialWeekMode: WeekMode = "sprint",
) => {
	const [period, setPeriodState] = useState<Period>(initialPeriod);
	const [weekMode, setWeekModeState] = useState<WeekMode>(initialWeekMode);
	const [day, setDayState] = useState<Dayjs>(() =>
		normalizeDayByPeriod(dayjs(), initialPeriod, initialWeekMode),
	);

	const setPeriod = useCallback(
		(nextPeriod: Period) => {
			setPeriodState(nextPeriod);
			setDayState((prev) => normalizeDayByPeriod(prev, nextPeriod, weekMode));
		},
		[weekMode],
	);

	const setWeekMode = useCallback(
		(nextWeekMode: WeekMode) => {
			setWeekModeState(nextWeekMode);
			setDayState((prev) => normalizeDayByPeriod(prev, period, nextWeekMode));
		},
		[period],
	);

	const setDay = useCallback(
		(value: Dayjs | ((prev: Dayjs) => Dayjs)) => {
			setDayState((prev) => {
				const nextDay = typeof value === "function" ? value(prev) : value;
				return normalizeDayByPeriod(nextDay, period, weekMode);
			});
		},
		[period, weekMode],
	);

	const borders = useMemo<DateBorders>(() => {
		if (period === "week") {
			const range =
				weekMode === "sprint" ? getSprintBorders(day) : getWorkWeekBorders(day);

			return {
				start: range.startDate.format("YYYY-MM-DD"),
				end: range.endDate.format("YYYY-MM-DD"),
				startDate: range.startDate,
				endDate: range.endDate,
			};
		}

		if (period === "month") {
			const startDate = day.startOf("month");
			const endDate = day.endOf("month");

			return {
				start: startDate.format("YYYY-MM-DD"),
				end: endDate.format("YYYY-MM-DD"),
				startDate,
				endDate,
			};
		}

		if (period === "quarter") {
			const startDate = day.startOf("quarter");
			const endDate = day.endOf("quarter");

			return {
				start: startDate.format("YYYY-MM-DD"),
				end: endDate.format("YYYY-MM-DD"),
				startDate,
				endDate,
			};
		}

		const startDate = day.startOf("year");
		const endDate = day.endOf("year");

		return {
			start: startDate.format("YYYY-MM-DD"),
			end: endDate.format("YYYY-MM-DD"),
			startDate,
			endDate,
		};
	}, [day, period, weekMode]);

	return {
		day,
		setDay,
		period,
		setPeriod,
		weekMode,
		setWeekMode,
		...borders,
	};
};
