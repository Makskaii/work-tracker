import { isNotAtWorkReport } from "@/components/calendar/helpers/reportCategory";
import type { GroupedReportFields } from "@/shared/types/table";
import type { ActivityListItem } from "../../../types/types";
import type { EmployeeMetrics } from "./types";
import { parseTimeSpent } from "./utils";

export const getEmployeeMetricsFromReports = (
	reports: GroupedReportFields[],
	activities: ActivityListItem[],
): EmployeeMetrics => {
	const hours = new Map<string, number>();
	const notAtWork = new Map<string, number>();
	let totalHours = 0;

	for (const report of reports) {
		const userId = String(report.assignedById);
		const timeSpent = parseTimeSpent(report.timeSpent);

		totalHours += timeSpent;
		hours.set(userId, (hours.get(userId) ?? 0) + timeSpent);

		if (isNotAtWorkReport(report, activities)) {
			notAtWork.set(userId, (notAtWork.get(userId) ?? 0) + timeSpent);
		}
	}

	return {
		hours,
		notAtWork,
		totalHours,
		hasLoaded: true,
	};
};
