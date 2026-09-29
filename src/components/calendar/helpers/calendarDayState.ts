import type { ActivityListItem } from "@/pages/ReportsPage/types/types";
import type { GroupedReportFields } from "@/shared/types/table";
import { isNotAtWorkReport } from "./reportCategory";

export type CalendarDayState =
	| "blank"
	| "future"
	| "weekend"
	| "empty"
	| "missing"
	| "incomplete"
	| "absence"
	| "reported";

export const CALENDAR_DAY_STATE_TITLES: Record<CalendarDayState, string> = {
	blank: "",
	future: "Будущий день",
	weekend: "Выходной",
	empty: "Нет отчётов",
	missing: "Нет отчётов",
	incomplete: "Меньше 8 часов",
	absence: "Not at work",
	reported: "Есть отчёты",
};

const startOfLocalDay = (date: Date) =>
	new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

export const getCalendarDayState = ({
	date,
	reports,
	activities = [],
	now = new Date(),
	isPadding = false,
	hasHourDeficit,
}: {
	date: Date | null;
	reports: readonly Pick<GroupedReportFields, "activity">[];
	activities?: ActivityListItem[];
	now?: Date;
	isPadding?: boolean;
	hasHourDeficit?: boolean;
}): CalendarDayState => {
	if (isPadding || !date) return "blank";
	if (startOfLocalDay(date) > startOfLocalDay(now)) return "future";
	if (!reports.length) {
		if (date.getDay() === 0 || date.getDay() === 6) return "weekend";
		if (
			startOfLocalDay(date) === startOfLocalDay(now) ||
			hasHourDeficit === false
		)
			return "empty";
		return "missing";
	}
	if (reports.some((report) => isNotAtWorkReport(report, activities))) {
		return "absence";
	}
	return hasHourDeficit ? "incomplete" : "reported";
};
