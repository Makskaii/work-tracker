import dayjs from "dayjs";
import type { ChangeEvent } from "react";
import { months, years } from "@/components/calendar/constants/const";
import {
	formatWeekChip,
	getMonthWeekRanges,
	getWeekRange,
} from "@/components/calendar/helpers/calendarPeriod";
import type { ViewCalendar } from "../model/types";
import cls from "../ReportsCalendar.module.scss";

type PeriodControlsProps = {
	view: ViewCalendar;
	selectedMonth: number;
	selectedYear: number;
	selectedDate: string;
	onMonthChange: (event: ChangeEvent<HTMLSelectElement>) => void;
	onYearChange: (event: ChangeEvent<HTMLSelectElement>) => void;
	onPrevPeriod: () => void;
	onNextPeriod: () => void;
	onToday: () => void;
	onWeekChange: (date: string) => void;
};

export const PeriodControls = ({
	view,
	selectedMonth,
	selectedYear,
	selectedDate,
	onMonthChange,
	onYearChange,
	onPrevPeriod,
	onNextPeriod,
	onToday,
	onWeekChange,
}: PeriodControlsProps) => {
	const selectedRange = getWeekRange(dayjs(selectedDate));
	const ranges = getMonthWeekRanges(
		dayjs(new Date(selectedYear, selectedMonth, 1)),
	);
	const availableYears = Array.from(new Set([...years, selectedYear])).sort(
		(a, b) => a - b,
	);
	return (
		<>
			<div className={cls.periodControls} aria-label="Выбор периода">
				<button
					type="button"
					className={cls.iconButton}
					onClick={onPrevPeriod}
					aria-label={
						view === "week" ? "Предыдущая неделя" : "Предыдущий месяц"
					}
				>
					‹
				</button>
				<div className={cls.dateSelects}>
					<select
						aria-label="Месяц периода"
						value={selectedMonth}
						onChange={onMonthChange}
					>
						{months.map((month, index) => (
							<option key={month} value={index}>
								{month}
							</option>
						))}
					</select>
					<select
						aria-label="Год периода"
						value={selectedYear}
						onChange={onYearChange}
					>
						{availableYears.map((year) => (
							<option key={year} value={year}>
								{year}
							</option>
						))}
					</select>
				</div>
				<button
					type="button"
					className={cls.iconButton}
					onClick={onNextPeriod}
					aria-label={view === "week" ? "Следующая неделя" : "Следующий месяц"}
				>
					›
				</button>
				<button type="button" className={cls.todayButton} onClick={onToday}>
					Сегодня
				</button>
			</div>
			{view === "week" && (
				<div className={cls.weekChips} aria-label="Недели выбранного месяца">
					<span>Неделя</span>
					{ranges.map((range) => {
						const active =
							range.startOfTheWeek === selectedRange.startOfTheWeek;
						return (
							<button
								type="button"
								key={range.startOfTheWeek}
								className={active ? cls.weekChipActive : ""}
								aria-pressed={active}
								onClick={() => onWeekChange(range.startOfTheWeek)}
							>
								{formatWeekChip(range)}
							</button>
						);
					})}
				</div>
			)}
		</>
	);
};
