import dayjs, { Dayjs } from "dayjs";
import { useMemo, useState } from "react";
import { getWorkWeekBorders } from "@/pages/ReportsPage/helpers/devsStatsBySprint";

const today = dayjs();

export const useSprintBorders = () => {
	const [day, setDay] = useState<Dayjs>(today);

	const { endOfTheWeek, startOfTheWeek } = useMemo(
		() => getWorkWeekBorders(dayjs(day)),
		[day],
	);

	return {
		endOfTheWeek,
		startOfTheWeek,
		setDay,
		day,
	};
};
