import type { ChangeEvent } from "react";
import { months, years } from "@/components/calendar/constants/const";
import cls from "../ReportsCalendar.module.scss";

type PeriodControlsProps = {
	selectedMonth: number;
	selectedYear: number;
	showToday?: boolean;
	onMonthChange: (event: ChangeEvent<HTMLSelectElement>) => void;
	onYearChange: (event: ChangeEvent<HTMLSelectElement>) => void;
	onPrevMonth: () => void;
	onNextMonth: () => void;
	onToday: () => void;
};

export const PeriodControls = ({
	selectedMonth,
	selectedYear,
	showToday = true,
	onMonthChange,
	onYearChange,
	onPrevMonth,
	onNextMonth,
	onToday,
}: PeriodControlsProps) => (
	<div className={cls.periodControls}>
		<button type="button" className={cls.iconButton} onClick={onPrevMonth}>
			‹
		</button>
		<select value={selectedMonth} onChange={onMonthChange}>
			{months.map((month, index) => (
				<option key={month} value={index}>
					{month}
				</option>
			))}
		</select>
		<select value={selectedYear} onChange={onYearChange}>
			{years.map((year) => (
				<option key={year} value={year}>
					{year}
				</option>
			))}
		</select>
		<button type="button" className={cls.iconButton} onClick={onNextMonth}>
			›
		</button>
		{showToday && (
			<button type="button" className={cls.todayButton} onClick={onToday}>
				Сегодня
			</button>
		)}
	</div>
);
