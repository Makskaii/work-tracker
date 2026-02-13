/** biome-ignore-all lint/suspicious/noExplicitAny: <s> */

import { useEffect, useState } from "react";
import { useOutletContext } from "react-router";
import type { ContextType } from "../../pages/ReportsPage";
import { $api } from "../../shared/config";
import { Endpoints } from "../../shared/constants/const";
import type { AnyObject } from "../../shared/types/types";
import { CalendarMonth, WeekCalendar } from ".";
import { dtoFieldsCodesDailyReports, months } from "./constants/const";
import {
	generateMonthDays,
	getWeek,
	type ReportProps,
} from "./helpers/generateMonthDays";

export const Calendar = ({ view }: { view: "month" | "week" }) => {
	const { user } = useOutletContext<ContextType>();
	const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
	const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
	const [reports, setReports] = useState<ReportProps[]>([]);

	useEffect(() => {
		const getReports = async () => {
			try {
				const res = await $api.get(Endpoints.reports, {
					params: {
						entityTypeId: 1060,
						select: [
							"id",
							"title",
							dtoFieldsCodesDailyReports.day,
							dtoFieldsCodesDailyReports.title,
							dtoFieldsCodesDailyReports.timeSpent,
							dtoFieldsCodesDailyReports.taskId,
							dtoFieldsCodesDailyReports.responsible,
							dtoFieldsCodesDailyReports.activityType,
							"assignedById",
							"createdTime",
							"lastActivityTime",
						],
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
							assignedById: user === "" ? null : user,
						},
					},
				});

				setReports(
					res.data.result.items.map((report: AnyObject) => ({
						id: report.id,
						title: report[dtoFieldsCodesDailyReports.title],
						timeSpent: report[dtoFieldsCodesDailyReports.timeSpent],
						taskId: report[dtoFieldsCodesDailyReports.taskId],
						day: report[dtoFieldsCodesDailyReports.day],
						responsible: report[dtoFieldsCodesDailyReports.responsible],
						activityType: report[dtoFieldsCodesDailyReports.activityType],
					})),
				);
			} catch {
				console.log("Ошибка при получении списка задач");
			}
		};

		user && getReports();
	}, [selectedMonth, selectedYear, user]);

	const monthDays = generateMonthDays({ selectedYear, selectedMonth, reports });

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
