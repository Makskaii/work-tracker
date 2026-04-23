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
	displayDay: Dayjs;
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

const getBordersByPeriod = (
	date: Dayjs,
	period: Period,
	weekMode: WeekMode,
): DateBorders => {
	if (period === "week") {
		const range =
			weekMode === "sprint" ? getSprintBorders(date) : getWorkWeekBorders(date);

		return {
			start: range.startDate.format("YYYY-MM-DD"),
			end: range.endDate.format("YYYY-MM-DD"),
			startDate: range.startDate,
			endDate: range.endDate,
			displayDay: range.startDate.startOf("day"),
		};
	}

	if (period === "month") {
		const startDate = date.startOf("month");
		const endDate = date.endOf("month");

		return {
			start: startDate.format("YYYY-MM-DD"),
			end: endDate.format("YYYY-MM-DD"),
			startDate,
			endDate,
			displayDay: startDate,
		};
	}

	if (period === "quarter") {
		const startDate = date.startOf("quarter");
		const endDate = date.endOf("quarter");

		return {
			start: startDate.format("YYYY-MM-DD"),
			end: endDate.format("YYYY-MM-DD"),
			startDate,
			endDate,
			displayDay: startDate,
		};
	}

	const startDate = date.startOf("year");
	const endDate = date.endOf("year");

	return {
		start: startDate.format("YYYY-MM-DD"),
		end: endDate.format("YYYY-MM-DD"),
		startDate,
		endDate,
		displayDay: startDate,
	};
};

export const usePeriodBorders = (
	initialPeriod: Period = "week",
	initialWeekMode: WeekMode = "sprint",
) => {
	const [period, setPeriod] = useState<Period>(initialPeriod);
	const [weekMode, setWeekMode] = useState<WeekMode>(initialWeekMode);

	// Храним именно опорную дату, а не startOf(period)
	const [day, setDay] = useState<Dayjs>(() => dayjs().startOf("day"));

	const borders = useMemo<DateBorders>(() => {
		return getBordersByPeriod(day, period, weekMode);
	}, [day, period, weekMode]);

	const setNormalizedDay = useCallback(
		(value: Dayjs | ((prev: Dayjs) => Dayjs)) => {
			setDay((prev) => {
				const nextDay = typeof value === "function" ? value(prev) : value;
				return nextDay.startOf("day");
			});
		},
		[],
	);

	const goPrev = useCallback(() => {
		setDay((prev) => {
			if (period === "week") return prev.subtract(1, "week");
			if (period === "month") return prev.subtract(1, "month");
			if (period === "quarter") return prev.subtract(1, "quarter");
			return prev.subtract(1, "year");
		});
	}, [period]);

	const goNext = useCallback(() => {
		setDay((prev) => {
			if (period === "week") return prev.add(1, "week");
			if (period === "month") return prev.add(1, "month");
			if (period === "quarter") return prev.add(1, "quarter");
			return prev.add(1, "year");
		});
	}, [period]);

	return {
		day,
		setDay: setNormalizedDay,
		period,
		setPeriod,
		weekMode,
		setWeekMode,
		displayDay: borders.displayDay,
		start: borders.start,
		end: borders.end,
		startDate: borders.startDate,
		endDate: borders.endDate,
		goPrev,
		goNext,
	};
};
