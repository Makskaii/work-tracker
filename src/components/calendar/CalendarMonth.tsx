/** biome-ignore-all lint/suspicious/noExplicitAny: <s> */
import { useState } from "react";
import { useOutletContext } from "react-router";
import type { ReportsContext } from "@/shared/types/types";
import { classNames } from "@/shared/utils/utils";
import { Modal } from "../modal";
import cls from "./Calendar.module.scss";
import { headers, months, years } from "./constants/const";
import type { GroupedReportFields, MonthDays } from "./types/types";

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
	const { projects } = useOutletContext<ReportsContext>();

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
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						padding: "1rem",
					}}
				>
					<div className={cls.container}>
						<table>
							<thead>
								<tr>
									{headers.map((rep) => (
										<th key={rep.title}>{rep.title}</th>
									))}
								</tr>
							</thead>
							<tbody>
								{activeReport.map((item) => {
									return (
										<tr key={item.id}>
											{headers.map((rep) => (
												<td key={rep.key}>
													{rep.convertFn
														? rep.convertFn(item[rep.key] as number, projects)
														: String(item[rep.key])}
												</td>
											))}
										</tr>
									);
								})}
								<tr>
									<td></td>
									<td></td>
									<td>
										всего часов:{" "}
										{activeReport.reduce(
											(acc, item) => acc + Number(item.timeSpent),
											0,
										)}
									</td>
								</tr>
							</tbody>
						</table>
					</div>
				</div>
			</Modal>
		</div>
	);
};

export default CalendarMonth;
