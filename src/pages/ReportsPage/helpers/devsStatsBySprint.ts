import dayjs, { Dayjs } from "dayjs";
import { ReportCodes } from "@/components/calendar/constants/const";
import type { ActivityListItem } from "@/components/calendar/types/types";
import { $api } from "@/shared/config";
import { Endpoints, EntityTypeIds } from "@/shared/constants/const";
import type { User } from "@/shared/types/types";
import type { GroupedFields } from "../types/types";

const getEffectivityPercent = (availableTime: number, timeSpent: number) => {
	if (!availableTime) return 0;

	return Math.round((timeSpent / availableTime) * 100);
};

export const getWorkWeekBorders = (date: Dayjs) => {
	const day = date.day();

	const diffToMonday = day === 0 ? 6 : day - 1;

	const startOfWeek = date.startOf("day").subtract(diffToMonday, "day");
	const endOfWeek = startOfWeek.add(4, "day").endOf("day");

	return {
		startOfWeek: startOfWeek.format("YYYY-MM-DD"),
		endOfWeek: endOfWeek.format("YYYY-MM-DD"),
	};
};

const getCommentByEffectivity = (effectivity: number) => {
	if (effectivity > 100) return "Перегрузка";
	if (effectivity >= 90) return "Норма";

	return "Недогрузка";
};

const createEmptyActivitiesMap = (
	activities: ActivityListItem[],
): Record<string, number> => {
	return activities.reduce<Record<string, number>>((acc, activity) => {
		acc[String(activity.ID)] = 0;
		return acc;
	}, {});
};

const groupSpentTimeByActivity = (
	reports: Record<string, unknown>[],
	activities: ActivityListItem[],
): Record<string, number> => {
	const activityMap = createEmptyActivitiesMap(activities);

	for (const report of reports) {
		const activityType = String(report[ReportCodes.activityType] ?? "");

		const timeSpent = Number(report[ReportCodes.timeSpent] ?? 0);

		if (!activityType) continue;
		if (!(activityType in activityMap)) continue;

		activityMap[activityType] += timeSpent;
	}

	return activityMap;
};

const getTotalTimeSpent = (activitiesMap: Record<string, number>) => {
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
				ReportCodes.title,
				ReportCodes.timeSpent,
				ReportCodes.project,
				ReportCodes.taskId,
				ReportCodes.activityType,
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
	activities,
	startOfTheWeek,
	endOfTheWeek,
}: {
	users: User[];
	activities: ActivityListItem[];
	startOfTheWeek: string;
	endOfTheWeek: string;
}): Promise<GroupedFields[]> => {
	const currWeekBorders = getWorkWeekBorders(dayjs());

	const day = dayjs().day();

	const availableTime = dayjs(startOfTheWeek).isBefore(
		dayjs(currWeekBorders.startOfWeek),
	)
		? 40
		: day * 8;

	const result = await Promise.all(
		users.map(async (user) => {
			const reports = await getReportsByUser({
				userId: user.id,
				startOfTheWeek,
				endOfTheWeek,
			});

			const activitiesMap = groupSpentTimeByActivity(reports, activities);
			const totalTimeSpent = getTotalTimeSpent(activitiesMap);
			const effectivity = getEffectivityPercent(availableTime, totalTimeSpent);

			return {
				id: String(user.id),
				title: user.title,
				availableTime,
				...activitiesMap,
				timeSpent: totalTimeSpent,
				effectivity: `${effectivity}%`,
				comment: getCommentByEffectivity(effectivity),
			};
		}),
	);

	return result;
};
