import { ActivityType } from "../constants/const";
import type { GroupedReportFields } from "../types/types";

export const getColorAdnBorder = (report: GroupedReportFields) => {
	switch (report.project) {
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
