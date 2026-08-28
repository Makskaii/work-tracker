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
			background: "rgba(95, 143, 216, 0.16)",
			borderLeft: "4px solid #5f8fd8",
		};
	}

	switch (activityType) {
		case ActivityType.development:
			return {
				background: "rgba(57, 214, 238, 0.16)",
				borderLeft: "4px solid #39d6ee",
			};
		case ActivityType.clientCall:
			return {
				background: "rgba(130, 227, 250, 0.16)",
				borderLeft: "4px solid #82e3fa",
			};
		case ActivityType.analitycsCall:
			return {
				background: "rgba(32, 49, 73, 0.72)",
				borderLeft: "4px solid #5f8fd8",
			};
		case ActivityType.dash:
			return {
				background: "rgba(15, 28, 44, 0.82)",
				borderLeft: "4px solid #39d6ee",
			};
		default: {
			return {
				background: "rgba(57, 214, 238, 0.16)",
				borderLeft: "4px solid #39d6ee",
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
