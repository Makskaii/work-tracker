import type { ActivityListItem } from "@/pages/ReportsPage/types/types";
import type { GroupedReportFields } from "@/shared/types/table";
import { isNotAtWorkReport } from "./reportCategory";

export type CalendarDayState =
	| "blank"
	| "future"
	| "weekend"
	| "missing"
	| "absence"
	| "reported";

export const CALENDAR_DAY_STATE_TITLES: Record<CalendarDayState, string> = {
	blank: "",
	future: "Будущий день",
	weekend: "Выходной",
	missing: "Нет отчётов",
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
}: {
	date: Date | null;
	reports: readonly Pick<GroupedReportFields, "activity">[];
	activities?: ActivityListItem[];
	now?: Date;
	isPadding?: boolean;
}): CalendarDayState => {
	if (isPadding || !date) return "blank";
	if (startOfLocalDay(date) > startOfLocalDay(now)) return "future";
	if (!reports.length) {
		return date.getDay() === 0 || date.getDay() === 6 ? "weekend" : "missing";
	}
	if (reports.some((report) => isNotAtWorkReport(report, activities))) {
		return "absence";
	}
	return "reported";
};
