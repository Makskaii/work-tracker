import dayjs, { Dayjs } from "dayjs";
import { useMemo, useState } from "react";
import { getWorkWeekBorders } from "@/pages/ReportsPage/helpers/devsStatsBySprint";

type BordersMode = "sprint" | "workweek";

const today = dayjs();

const getSprintBorders = (date: Dayjs) => {
	const dayOfWeek = date.day();

	const diffToTuesday = dayOfWeek >= 2 ? dayOfWeek - 2 : dayOfWeek + 5;
	const startOfTheWeek = date.startOf("day").subtract(diffToTuesday, "day");
	const endOfTheWeek = startOfTheWeek.add(6, "day").endOf("day");

	return {
		startOfTheWeek: startOfTheWeek.format("YYYY-MM-DD"),
		endOfTheWeek: endOfTheWeek.format("YYYY-MM-DD"),
	};
};

export const useSprintBorders = (mode: BordersMode = "sprint") => {
	const [day, setDay] = useState<Dayjs>(today);

	const { endOfTheWeek, startOfTheWeek } = useMemo(() => {
		return mode === "sprint"
			? getSprintBorders(dayjs(day))
			: getWorkWeekBorders(dayjs(day));
	}, [day, mode]);

	return {
		endOfTheWeek,
		startOfTheWeek,
		setDay,
		day,
	};
};
