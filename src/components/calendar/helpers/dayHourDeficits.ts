import { parseTimeSpent } from "@/pages/ReportsPage/ui/UserReports/model/utils";
import type { GroupedReportFields } from "@/shared/types/table";
import type { User } from "@/shared/types/types";
import { ReportStageIds } from "../constants/const";

export type DayHourDeficit = {
	userId: string;
	title: string;
	hours: number;
	missingHours: number;
};

const DAILY_HOURS = 8;
const roundHours = (hours: number) => Math.round(hours * 1_000_000) / 1_000_000;
const startOfLocalDay = (date: Date) =>
	new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

export const getDayHourDeficits = ({
	date,
	reports,
	users,
	now = new Date(),
	isPadding = false,
	includeToday = false,
}: {
	date: Date | null;
	reports: readonly Pick<
		GroupedReportFields,
		"assignedById" | "timeSpent" | "stageId"
	>[];
	users: readonly Pick<User, "id" | "title" | "isActive">[];
	now?: Date;
	isPadding?: boolean;
	includeToday?: boolean;
}): DayHourDeficit[] => {
	if (
		isPadding ||
		!date ||
		!(includeToday
			? startOfLocalDay(date) <= startOfLocalDay(now)
			: startOfLocalDay(date) < startOfLocalDay(now)) ||
		date.getDay() === 0 ||
		date.getDay() === 6
	) {
		return [];
	}

	const scopedUsers = new Map(users.map((user) => [String(user.id), user]));
	const authors = new Set<string>();
	const hoursByUser = new Map<string, number>();
	for (const report of reports) {
		const userId = String(report.assignedById);
		if (!scopedUsers.has(userId)) continue;
		authors.add(userId);
		if (report.stageId !== ReportStageIds.confirmed) continue;

		const hours = parseTimeSpent(report.timeSpent);
		if (!Number.isFinite(hours) || hours < 0) continue;
		hoursByUser.set(userId, (hoursByUser.get(userId) ?? 0) + hours);
	}

	const deficits: DayHourDeficit[] = [];
	for (const [userId, user] of scopedUsers) {
		// Without employment dates, a former employee is expected only on days
		// for which they actually recorded a report, including an unconfirmed one.
		if (user.isActive === false && !authors.has(userId)) continue;
		const hours = roundHours(hoursByUser.get(userId) ?? 0);
		if (hours >= DAILY_HOURS) continue;
		deficits.push({
			userId,
			title: user.title,
			hours,
			missingHours: roundHours(DAILY_HOURS - hours),
		});
	}
	return deficits;
};

// The card excludes today, while the opened summary includes it. Past days
// share the same calculation so each day's reports are scanned only once.
export const getCalendarDayHourDeficits = (
	options: Omit<Parameters<typeof getDayHourDeficits>[0], "includeToday">,
) => {
	const now = options.now ?? new Date();
	const summaryDeficits = getDayHourDeficits({
		...options,
		now,
		includeToday: true,
	});
	return {
		summaryDeficits,
		deficits:
			options.date && startOfLocalDay(options.date) < startOfLocalDay(now)
				? summaryDeficits
				: [],
	};
};
