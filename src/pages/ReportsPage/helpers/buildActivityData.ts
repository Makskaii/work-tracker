import dayjs from "dayjs";
import { ReportCodes } from "@/components/calendar/constants/const";
import type { ReportProps } from "@/components/calendar/types/types";
import type {
	ActivityListItem,
	ActivitySegment,
	ChartReportItem,
	DayColumn,
} from "../types/types";

const getWeekDays = (startOfWeek: string) => {
	return Array.from({ length: 7 }).map((_, index) => {
		const date = dayjs(startOfWeek).add(index, "day");
		return {
			date: date.format("YYYY-MM-DD"),
			dayName: date.format("dd"),
			label: date.format("DD.MM"),
		};
	});
};

export const buildActivityChartData = ({
	reports,
	activities,
	startOfWeek,
}: {
	reports: ReportProps[];
	activities: ActivityListItem[];
	startOfWeek: string;
}): DayColumn[] => {
	const weekDays = getWeekDays(startOfWeek);

	const activityMap = new Map(
		activities.map((activity) => [
			String(activity.ID),
			{
				id: String(activity.ID),
				name: activity.NAME,
				sort: String(activity.SORT),
			},
		]),
	);

	return weekDays.map((dayItem) => {
		const reportsOfDay = reports.filter((report) => {
			const reportDate = dayjs(report.begindate).format("YYYY-MM-DD");
			return reportDate === dayItem.date;
		});

		const normalizedReports: ChartReportItem[] = reportsOfDay.map((report) => {
			const activityId = String(report[ReportCodes.activityType] ?? "");
			const activity = activityMap.get(activityId);

			return {
				id: String(report.id),
				title: String(
					report[ReportCodes.title] ?? report.title ?? "Без названия",
				),
				date: String(report.begindate),
				hours: Number(report[ReportCodes.timeSpent] ?? 0),
				activityId,
				activityName: activity?.name ?? "Без активности",
				activitySort: activity?.sort ?? "2",
				assignedById: String(report.assignedById ?? ""),
				taskId: report[ReportCodes.taskId],
				raw: report,
			};
		});

		const grouped = normalizedReports.reduce<Record<string, ChartReportItem[]>>(
			(acc, report) => {
				const key = report.activityId || "unknown";

				if (!acc[key]) {
					acc[key] = [];
				}

				acc[key].push(report);
				return acc;
			},
			{},
		);

		const totalHours = normalizedReports.reduce(
			(acc, report) => acc + report.hours,
			0,
		);

		const segments: ActivitySegment[] = Object.values(grouped)
			.map((reportsGroup) => {
				const first = reportsGroup[0];
				const hours = reportsGroup.reduce((acc, item) => acc + item.hours, 0);

				return {
					activityId: first.activityId,
					activityName: first.activityName,
					activitySort: first.activitySort,
					totalHours: hours,
					percent: totalHours ? (hours / totalHours) * 100 : 0,
					reports: reportsGroup.sort((a, b) => b.hours - a.hours),
				};
			})
			.sort((a, b) => b.totalHours - a.totalHours);

		return {
			date: dayItem.date,
			dayName: dayItem.dayName,
			totalHours,
			segments,
		};
	});
};
