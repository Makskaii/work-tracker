import type { ActivityListItem } from "@/pages/ReportsPage/types/types";
import { ActivityType, ReportCodes } from "../constants/const";
import type { ReportProps } from "../types/types";

const isNotAtWorkActivity = (
	activityType: number,
	activities: ActivityListItem[] = [],
) => {
	if (activityType === ActivityType.notAtWork) {
		return true;
	}

	const activity = activities.find((item) => Number(item.ID) === activityType);
	const searchableText = `${activity?.NAME ?? ""} ${activity?.CODE ?? ""}`
		.toLowerCase()
		.replace(/[_-]/g, " ");

	return searchableText.includes("not at work");
};

export const getColorAndBorderByActivity = (
	activityType: number,
	activities?: ActivityListItem[],
) => {
	if (isNotAtWorkActivity(activityType, activities)) {
		return {
			background: "rgba(148, 163, 184, 0.2)",
			borderLeft: "4px solid #94a3b8",
		};
	}

	switch (activityType) {
		case ActivityType.development:
			return {
				background: "rgba(76, 175, 80, 0.2)",
				borderLeft: "4px solid #4caf50",
			};
		case ActivityType.clientCall:
			return {
				background: "#E6E6FA",
				borderLeft: "4px solid #2414af",
			};
		case ActivityType.analitycsCall:
			return {
				background: "#eeab6d",
				borderLeft: "4px solid #f3e300",
			};
		case ActivityType.dash:
			return {
				background: "#E6E6FA",
				borderLeft: "4px solid #d397d3",
			};
		default: {
			return {
				background: "rgba(76, 175, 80, 0.2)",
				borderLeft: "4px solid #4caf50",
			};
		}
	}
};

export const getColorAdnBorder = (
	report: ReportProps,
	activities?: ActivityListItem[],
) => {
	return getColorAndBorderByActivity(
		report[ReportCodes.activityType],
		activities,
	);
};
