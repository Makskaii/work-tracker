/** biome-ignore-all lint/suspicious/noExplicitAny: <s> */

import { useEffect, useState } from "react";
import { Endpoints, EntityTypeIds } from "@/shared/constants/const";
import { useLoadAllData } from "@/shared/hooks/useLoadAllTasks";
import type { GroupedReportFields } from "@/shared/types/table";
import { CalendarMonth, WeekCalendar } from ".";
import { months, ReportCodes, selectFields } from "./constants/const";
import { generateMonthDays } from "./helpers/generateMonthDays";
import type { ReportProps } from "./types/types";

const getReportRelationId = (
	newValue: string | number | null | undefined,
	legacyValue: string | number | null | undefined,
) => {
	return Number(newValue ?? legacyValue ?? 0);
};

const mapReportToGroupedFields = (report: ReportProps): GroupedReportFields => {
	const companyId = getReportRelationId(
		report[ReportCodes.company],
		report[ReportCodes.client],
	);
	const parentProjectId = getReportRelationId(
		report[ReportCodes.parentproject],
		report[ReportCodes.project],
	);

	return {
		id: report.id,
		title: report[ReportCodes.title],
		timeSpent: report[ReportCodes.timeSpent],
		taskId: report[ReportCodes.taskId],
		parentId: report[ReportCodes.parentId],
		day: report.begindate,
		project: parentProjectId,
		parentproject: parentProjectId,
		activity: report[ReportCodes.activityType],
		assignedById: String(report.assignedById),
		client: companyId,
		company: companyId,
	};
};

export const Calendar = ({
	view,
	userId,
	setGroupByActivity,
}: {
	view: "month" | "week";
	userId: string;
	setGroupByActivity: (value: GroupedReportFields[]) => void;
}) => {
	const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
	const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

	const [reports, setReports] = useState<GroupedReportFields[]>([]);

	const { data, setFilters } = useLoadAllData<ReportProps>({
		initialEndpoint: Endpoints.crmItems,
		initialFilters: {
			params: {
				entityTypeId: EntityTypeIds.reports,

				select: selectFields,

				filter: {
					">=begindate": new Date(selectedYear, selectedMonth, 1).toISOString(),
					"<=begindate": new Date(
						selectedYear,
						selectedMonth + 1,
						1,
					).toISOString(),
					assignedById: userId,
					stageId: "DT1060_15:PREPARATION",
				},
			},
		},
	});

	useEffect(() => {
		if (userId)
			setFilters({
				params: {
					entityTypeId: EntityTypeIds.reports,

					select: selectFields,

					filter: {
						">=begindate": new Date(
							selectedYear,
							selectedMonth,
							1,
						).toISOString(),
						"<=begindate": new Date(
							selectedYear,
							selectedMonth + 1,
							1,
						).toISOString(),
						assignedById: userId,
						stageId: "DT1060_15:PREPARATION",
					},
				},
			});
	}, [userId, selectedMonth, selectedYear, setFilters]);

	useEffect(() => {
		if (data) {
			const normalizedReports = data.map(mapReportToGroupedFields);

			setReports(normalizedReports);
			setGroupByActivity(normalizedReports);
		}
	}, [data, setGroupByActivity]);

	const monthDays = generateMonthDays({
		selectedYear,
		selectedMonth,
		reports,
	});

	const handleMonthChange = (e: any) => {
		setSelectedMonth(parseInt(e.target.value));
	};

	const handleYearChange = (e: any) => {
		setSelectedYear(parseInt(e.target.value));
	};

	const handlePrevMonth = () => {
		if (selectedMonth === 0) {
			setSelectedMonth(11);
			setSelectedYear(selectedYear - 1);
		} else {
			setSelectedMonth(selectedMonth - 1);
		}
	};

	const handleNextMonth = () => {
		if (selectedMonth === 11) {
			setSelectedMonth(0);
			setSelectedYear(selectedYear + 1);
		} else {
			setSelectedMonth(selectedMonth + 1);
		}
	};

	const handleToday = () => {
		const today = new Date();
		setSelectedMonth(today.getMonth());
		setSelectedYear(today.getFullYear());
	};

	const getCurrentMonthName = () => {
		return months[selectedMonth];
	};

	return (
		<>
			{view === "month" ? (
				<CalendarMonth
					getCurrentMonthName={getCurrentMonthName}
					handleMonthChange={handleMonthChange}
					handleYearChange={handleYearChange}
					handlePrevMonth={handlePrevMonth}
					handleNextMonth={handleNextMonth}
					handleToday={handleToday}
					monthDays={monthDays}
					selectedMonth={selectedMonth}
					selectedYear={selectedYear}
				/>
			) : (
				<>
					<WeekCalendar />
				</>
			)}
		</>
	);
};
