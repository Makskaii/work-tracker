/** biome-ignore-all lint/suspicious/noExplicitAny: <s> */
import { useState } from "react";
import { useOutletContext } from "react-router";
import type { ProjectFromList } from "@/pages/ReportsPage/ReportsPage";
import type { ActivityListItem } from "@/pages/ReportsPage/types/types";
import { useBitrixSlider } from "@/shared/hooks/useBitrixSlider";
import type { GroupedReportFields, Header } from "@/shared/types/table";
import type { ReportsContext } from "@/shared/types/types";
import {
	classNames,
	convertToDate,
	convertToMinutesOrHours,
} from "@/shared/utils/utils";
import { Modal } from "../modal";
import { ReportRowActions } from "../Table/universalTable/RowActionBtns";
// import { ReportsActivitySection } from "../Table/reportsTable/TableMonthModal";
import { UniversalTable } from "../Table/universalTable/UniversalTable";
import cls from "./Calendar.module.scss";
import { months, years } from "./constants/const";
import type { MonthDays } from "./types/types";

export const headers: Header<GroupedReportFields>[] = [
	{
		title: "Отчёт",
		key: "id",
		render: (value) => {
			return <div>Отчёт № {value}</div>;
		},
	},
	{
		title: "Описание",
		key: "title",
	},
	{
		title: "Задача",
		key: "parentId",
		render: (value) => {
			return value ? <div>№ {value}</div> : <div>—</div>;
		},
	},
	{
		title: "Проект",
		key: "project",
		convertFn: (value, additionalData) => {
			return (
				additionalData?.projects?.find(
					(project: ProjectFromList) => Number(project.id) === value,
				)?.name || ""
			);
		},
	},
	{
		title: "Активность",
		key: "activity",
		convertFn: (value, additionalData) => {
			return (
				additionalData?.activities?.find(
					(activity: ActivityListItem) => Number(activity.ID) === value,
				)?.NAME || ""
			);
		},
	},
	{
		title: "Время",
		key: "timeSpent",
		convertFn: convertToMinutesOrHours,
	},
	{
		title: "Дата",
		key: "day",
		convertFn: convertToDate,
	},
	{
		title: "Действия",
		key: "id",
		render: (value, additionalData) => {
			const row = additionalData?.row as GroupedReportFields | undefined;

			return (
				<ReportRowActions
					reportId={String(value)}
					taskId={row?.parentId}
					openTask={additionalData?.openTask}
				/>
			);
		},
	},
];

const CalendarMonth = ({
	monthDays,
	handlePrevMonth,
	selectedMonth,
	handleMonthChange,
	selectedYear,
	handleYearChange,
	handleNextMonth,
	getCurrentMonthName,
	handleToday,
}: {
	monthDays: MonthDays[];
	handlePrevMonth: () => void;
	selectedMonth: number;
	selectedYear: number;
	handleMonthChange: (e: any) => void;
	handleYearChange: (e: any) => void;
	handleNextMonth: () => void;
	getCurrentMonthName: () => string;
	handleToday: () => void;
}) => {
	const [open, setOpen] = useState(false);
	const [activeReport, setActiveReports] = useState<GroupedReportFields[]>([]);
	const { projects, activities } = useOutletContext<ReportsContext>();
	const { openTask } = useBitrixSlider();

	// const groupedByActivity = activeReport.reduce(
	// 	(acc, report) => {
	// 		if (report.activity) {
	// 			if (!acc[report.activity]) {
	// 				acc[report.activity] = [];
	// 			}
	// 			acc[report.activity].push(report);
	// 		}

	// 		return acc;
	// 	},
	// 	{} as {
	// 		[key: number]: GroupedReportFields[];
	// 	},
	// );
	return (
		<div className={cls.calendar}>
			<div className={cls["calendar-controls"]}>
				<button onClick={handlePrevMonth} className={cls["nav-button"]}>
					←
				</button>

				<div className={cls["month-year-selector"]}>
					<select
						style={{ color: "black" }}
						name="month"
						value={selectedMonth}
						onChange={handleMonthChange}
						className={cls["month-select"]}
					>
						{months.map((month, index) => (
							<option key={index} value={index}>
								{month}
							</option>
						))}
					</select>

					<select
						style={{ color: "black" }}
						value={selectedYear}
						onChange={handleYearChange}
						className={cls["year-select"]}
					>
						{years.map((year) => (
							<option key={year} value={year}>
								{year}
							</option>
						))}
					</select>
				</div>

				<button onClick={handleNextMonth} className={cls["nav-button"]}>
					→
				</button>

				<button onClick={handleToday} className={cls["today-button"]}>
					Сегодня
				</button>
			</div>

			<h2 className={cls["calendar-title"]}>
				{getCurrentMonthName()} {selectedYear}
			</h2>

			{/* Заголовки дней недели */}
			<div className={cls["weekdays-header"]}>
				{["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day) => (
					<div key={day} className={cls["weekday"]}>
						{day}
					</div>
				))}
			</div>

			<div className={cls["calendar-grid"]}>
				{monthDays.map((day) => (
					<div
						key={day.id}
						className={classNames(cls["calendar-day"], {
							[cls.today]: day.isToday,
							[cls.weekend]: day.isWeekend,
							[cls["other-month"]]: !day.isCurrentMonth,
							[cls.fullday]:
								day.totalHours && day.totalHours === 8 ? true : false,
							[cls.incompleteday]:
								day.totalHours && day.totalHours < 8 ? true : false,

							[cls.overTime]:
								day.totalHours && day.totalHours > 8 ? true : false,
						})}
						onClick={() => {
							day.reports && setActiveReports(day.reports);
							day.reports && setOpen(true);
						}}
					>
						<div className={cls["day-number"]}>{day.dayNumber}</div>
						<div className={cls["day-name"]}>{day.dayName}</div>
						{day.totalHours && (
							<>
								<div
									style={{
										position: "absolute",
										bottom: 0,
										right: 0,
										fontSize: "12px",
										padding: "10px",
									}}
								>
									Отчет
								</div>
								<div
									style={{
										position: "absolute",
										right: 0,
										top: 0,
										fontSize: "12px",
										padding: "10px",
									}}
								>
									{day.totalHours.toFixed(2)} ч.
								</div>
								<div
									className={cls["worked-hours-bg"]}
									style={{
										width: `${((day.totalHours || 0) / 8) * 100}%`,
										maxWidth: "100%",
									}}
								/>
							</>
						)}
					</div>
				))}
			</div>
			<Modal
				isOpen={open}
				onClose={() => setOpen(false)}
				size="covered"
				innerScroll
			>
				{/* {Object.entries(groupedByActivity).map(
					([activityId, reports], index) => {
						return (
							<ReportsActivitySection
								reports={reports}
								key={activityId}
								type={activityId}
								index={index}
							/>
						);
					},
				)} */}
				<UniversalTable<GroupedReportFields>
					activeItems={activeReport.toSorted((a, b) => a.activity - b.activity)}
					headers={headers}
					additionalData={{
						projects,
						activities,
						report: activeReport,
						openTask,
					}}
				/>
			</Modal>
		</div>
	);
};

export default CalendarMonth;
