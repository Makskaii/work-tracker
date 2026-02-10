/** biome-ignore-all lint/suspicious/noExplicitAny: <explanation> */
import { useEffect, useState } from "react";
import { useOutletContext } from "react-router";
import type { ContextType } from "../../pages/ReportsPage";
import { $api } from "../../shared/config";
import { Endpoints } from "../../shared/constants/const";
import type { AnyObject } from "../../shared/types/types";
import { classNames, convertToDate } from "../../shared/utils/utils";
import Modal from "../modal/Modal";
import cls from "./Calendar.module.scss";

const dtoFieldsCodes = {
	title: "ufCrm11_1770627903531",
	timeSpent: "ufCrm11_1770627880479",
	taskId: "ufCrm11_1770393502397",
	day: "createdTime",
	responsible: "ufCrm11_1770627880479",
};

interface Report {
	id: string;
	title: string;
	day: string;
	taskId: string;
	timeSpent: number;
	responsible: string;
}

const groupReportsByDate = (
	reports: Report[],
): {
	[key: string]: {
		reports: Report[];
		total: number;
	};
} => {
	return reports.reduce(
		(
			groups: {
				[key: string]: {
					reports: Report[];
					total: number;
				};
			},
			report,
		) => {
			const dateStr = report.day?.split("T")[0];

			if (!groups[dateStr]) {
				groups[dateStr] = {
					reports: [],
					total: 0,
				};
			}

			groups[dateStr].reports.push(report);
			groups[dateStr].total += Number(report.timeSpent);

			return groups;
		},
		{},
	);
};

export const Calendar = () => {
	const { user } = useOutletContext<ContextType>();
	const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
	const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
	const [reports, setReports] = useState<Report[]>([]);
	const [open, setOpen] = useState(false);
	const [activeReport, setActiveReports] = useState<Report[]>([]);

	useEffect(() => {
		const getReports = async () => {
			try {
				const res = await $api.get(Endpoints.reports, {
					params: {
						entityTypeId: 1060,
						select: [
							"id",
							"title",
							dtoFieldsCodes.day,
							dtoFieldsCodes.title,
							dtoFieldsCodes.timeSpent,
							dtoFieldsCodes.taskId,
							dtoFieldsCodes.responsible,
							"assignedById",
							"createdTime",
							"lastActivityTime",
						],
						filter: {
							">=createdTime": new Date(
								selectedYear,
								selectedMonth,
								1,
							).toISOString(),
							"<=createdTime": new Date(
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
						title: report[dtoFieldsCodes.title],
						timeSpent: report[dtoFieldsCodes.timeSpent],
						taskId: report[dtoFieldsCodes.taskId],
						day: report[dtoFieldsCodes.day],
						responsible: report[dtoFieldsCodes.responsible],
					})),
				);
			} catch {
				console.log("Ошибка при получении списка задач");
			}
		};

		user && getReports();
	}, [selectedMonth, selectedYear, user]);

	const months = [
		"Январь",
		"Февраль",
		"Март",
		"Апрель",
		"Май",
		"Июнь",
		"Июль",
		"Август",
		"Сентябрь",
		"Октябрь",
		"Ноябрь",
		"Декабрь",
	];

	const years = Array.from({ length: 10 }, (_, i) => 2020 + i);

	const getDaysInMonth = (year: number, month: number) => {
		return new Date(year, month + 1, 0).getDate();
	};

	const getDayName = (date: Date) => {
		return date.toLocaleDateString("ru-RU", { weekday: "short" });
	};

	const generateMonthDays = () => {
		const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
		const firstDayOfMonth = new Date(selectedYear, selectedMonth, 1);

		let firstDayWeekday = firstDayOfMonth.getDay();

		firstDayWeekday = firstDayWeekday === 0 ? 6 : firstDayWeekday - 1;

		const daysArray = [];

		for (let i = 0; i < firstDayWeekday; i++) {
			daysArray.push({
				id: `empty-start-${i}`,
				date: null,
				dayNumber: null,
				dayName: "",
				fullDayName: "",
				isToday: false,
				isWeekend: false,
				isCurrentMonth: false,
				isEmpty: true,
			});
		}
		for (let day = 1; day <= daysInMonth; day++) {
			const date = new Date(selectedYear, selectedMonth, day);
			const dayOfWeek = date.getDay();

			const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
			const isToday = date.toDateString() === new Date().toDateString();

			const groupedReports = groupReportsByDate(reports);

			const dateKey = date.toLocaleDateString("en-CA");

			daysArray.push({
				id: `${selectedYear}-${selectedMonth}-${day}`,
				date: date,
				dayNumber: day,
				dayName: getDayName(date),
				fullDayName: date.toLocaleDateString("ru-RU", { weekday: "long" }),
				isToday: isToday,
				isWeekend: isWeekend,
				isCurrentMonth: true,
				isEmpty: false,
				totalHours: groupedReports[dateKey]?.total || null,
				reports: groupedReports[dateKey]?.reports || null,
			});
		}

		const totalCells = Math.ceil(daysArray.length / 7) * 7;
		while (daysArray.length < totalCells) {
			daysArray.push({
				id: `empty-end-${daysArray.length}`,
				date: null,
				dayNumber: null,
				dayName: "",
				fullDayName: "",
				isToday: false,
				isWeekend: false,
				isCurrentMonth: false,
				isEmpty: true,
			});
		}

		return daysArray;
	};

	const monthDays = generateMonthDays();

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
						})}
						onClick={() => {
							day.reports && setActiveReports(day.reports);
							day.reports && setOpen(true);
						}}
					>
						<div className={cls["day-number"]}>{day.dayNumber}</div>
						<div className={cls["day-name"]}>{day.dayName}</div>
						{day.totalHours && (
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
						)}
						<div
							className={cls["worked-hours-bg"]}
							style={{
								width: `${((day.totalHours || 0) / 8) * 100}%`,
								maxWidth: "100%",
							}}
						/>
					</div>
				))}
			</div>
			<Modal innerScroll isOpen={open} onClose={() => setOpen(false)}>
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
												<td>
													{rep.convertFn
														? rep.convertFn(item[rep.key] as number)
														: String(item[rep.key])}
												</td>
											))}
										</tr>
									);
								})}
								<tr>
									<td title={"sdsdsd"}></td>
									<td title={"sdsdsd"}></td>
									<td title={"sdsdsd"}>
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

const convertToMinutesOrHours = (number: number) => {
	if (number < 1) {
		return `${number * 60} мин.`;
	}
	return `${number} ч.`;
};

const headers: {
	key: keyof Report;
	title: string;
	convertFn?: (value: number) => string;
}[] = [
	{
		title: "Описание",
		key: "title",
	},
	{
		title: "Задача",
		key: "taskId",
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
];
