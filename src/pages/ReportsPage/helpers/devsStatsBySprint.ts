import dayjs from "dayjs";
import {
	ActivityType,
	dtoFieldsCodesDailyReports,
} from "@/components/calendar/constants/const";
import { $api } from "@/shared/config";
import { Endpoints, EntityTypeIds } from "@/shared/constants/const";
import type { User } from "@/shared/types/types";
import { getWeekBorders } from "@/shared/utils/statisticUtils/generateWeekBorders";
import type { GroupedFields } from "../types/types";

const getEffectivityPercent = (availableTime: number, timeSpent: number) => {
	if (!availableTime) return 0;

	return Math.round((timeSpent / availableTime) * 100);
};

const getCommentByEffectivity = (effectivity: number) => {
	if (effectivity > 100) return "Перегрузка";
	if (effectivity < 80) return "Недогрузка";
	if (effectivity >= 90) return "Норма";

	return "";
};

const createEmptyActivitiesMap = (): Record<ActivityType, number> => ({
	[ActivityType.development]: 0,
	[ActivityType.analitycsCall]: 0,
	[ActivityType.devsCall]: 0,
	[ActivityType.clientCall]: 0,
	[ActivityType.dash]: 0,
});

const groupSpentTimeByActivity = (
	reports: Record<string, unknown>[],
): Record<ActivityType, number> => {
	const activityMap = createEmptyActivitiesMap();

	for (const report of reports) {
		const activityType = report[dtoFieldsCodesDailyReports.activityType] as
			| ActivityType
			| undefined;

		const timeSpent = Number(report[dtoFieldsCodesDailyReports.timeSpent] ?? 0);

		if (!activityType) continue;
		if (!(activityType in activityMap)) continue;

		activityMap[activityType] += timeSpent;
	}

	return activityMap;
};

const getTotalTimeSpent = (activitiesMap: Record<ActivityType, number>) => {
	return Object.values(activitiesMap).reduce((acc, value) => acc + value, 0);
};

const getReportsByUser = async ({
	userId,
	startOfTheWeek,
	endOfTheWeek,
}: {
	userId: string | number;
	startOfTheWeek: string;
	endOfTheWeek: string;
}) => {
	const response = await $api.get(Endpoints.crmItems, {
		params: {
			entityTypeId: EntityTypeIds.reports,
			select: [
				"id",
				"title",
				"begindate",
				dtoFieldsCodesDailyReports.title,
				dtoFieldsCodesDailyReports.timeSpent,
				dtoFieldsCodesDailyReports.project,
				dtoFieldsCodesDailyReports.taskId,
				dtoFieldsCodesDailyReports.activityType,
				"assignedById",
				"createdTime",
				"lastActivityTime",
				`parentId${EntityTypeIds.tasks}`,
			],
			filter: {
				assignedById: userId,
				">=begindate": startOfTheWeek,
				"<=begindate": endOfTheWeek,
			},
		},
	});

	return response?.data?.result?.items ?? [];
};

export const getUsersTableData = async ({
	users,
	startOfTheWeek,
	endOfTheWeek,
}: {
	users: User[];
	startOfTheWeek: string;
	endOfTheWeek: string;
}): Promise<GroupedFields[]> => {
	const currWeekBorders = getWeekBorders(dayjs());

	const currWeekStart = dayjs(currWeekBorders.startOfTheWeek)
		.subtract(1, "day")
		.format("YYYY-MM-DD");

	const day = dayjs().day();

	const availableTime = dayjs(startOfTheWeek).isBefore(dayjs(currWeekStart))
		? 40
		: (day + 1) * 6;

	const result = await Promise.all(
		users.map(async (user) => {
			const reports = await getReportsByUser({
				userId: user.id,
				startOfTheWeek,
				endOfTheWeek,
			});

			const activitiesMap = groupSpentTimeByActivity(reports);
			const totalTimeSpent = getTotalTimeSpent(activitiesMap);
			const effectivity = getEffectivityPercent(availableTime, totalTimeSpent);

			return {
				id: String(user.id),
				title: user.title,
				availableTime: availableTime,
				...activitiesMap,
				timeSpent: totalTimeSpent,
				effectivity: `${effectivity}%`,
				comment: getCommentByEffectivity(effectivity),
			};
		}),
	);

	return result;
};
