/** biome-ignore-all lint/suspicious/noExplicitAny: <s> */

import { useEffect, useState } from "react";
import { Endpoints, EntityTypeIds } from "@/shared/constants/const";
import { useLoadAllData } from "@/shared/hooks/useLoadAllTasks";
import { CalendarMonth, WeekCalendar } from ".";
import { dtoFieldsCodesDailyReports, months } from "./constants/const";
import { generateMonthDays, getWeek } from "./helpers/generateMonthDays";
import type { GroupedReportFields, ReportProps } from "./types/types";

export const Calendar = ({
	view,
	userId,
}: {
	view: "month" | "week";
	userId: string;
}) => {
	const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
	const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
	const [reports, setReports] = useState<GroupedReportFields[]>([]);

	const { data, setFilters } = useLoadAllData<ReportProps>({
		initialEndpoint: Endpoints.crmItems,
		initialFilters: {
			params: {
				entityTypeId: EntityTypeIds.reports,

				// select: selectFields,

				filter: {
					">=begindate": new Date(selectedYear, selectedMonth, 1).toISOString(),
					"<=begindate": new Date(
						selectedYear,
						selectedMonth + 1,
						1,
					).toISOString(),
					assignedById: userId,
				},
			},
		},
	});

	useEffect(() => {
		if (userId)
			setFilters({
				params: {
					entityTypeId: EntityTypeIds.reports,

					// select: selectFields,

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
					},
				},
			});
	}, [userId, selectedMonth, selectedYear, setFilters]);

	useEffect(() => {
		if (data)
			setReports(
				data.map((report) => ({
					id: report.id,
					title: report[dtoFieldsCodesDailyReports.title],
					timeSpent: report[dtoFieldsCodesDailyReports.timeSpent],
					taskId: report[dtoFieldsCodesDailyReports.taskId],
					day: report.begindate,
					project: report[dtoFieldsCodesDailyReports.project],
					assignedById: report.assignedById,
				})),
			);
	}, [data]);

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

	const getWeekDays = () => {
		const weekDays = getWeek();

		const weekArr = monthDays
			.filter((day) => !day.isEmpty)
			.slice(
				new Date(weekDays.startOfTheWeek).getDate() - 1,
				new Date(weekDays.endOfTheWeek).getDate(),
			);

		return weekArr;
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
					<WeekCalendar week={getWeekDays()} />
				</>
			)}
		</>
	);
};
