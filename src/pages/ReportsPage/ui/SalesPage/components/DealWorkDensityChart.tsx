import { useMemo, useState } from "react";
import { ReportCodes } from "@/components/calendar/constants/const";
import type { ReportProps } from "@/components/calendar/types/types";
import { DEPARTMENT_IDS } from "@/shared/constants/const";
import type { User } from "@/shared/types/types";
import { toNumber } from "../model/profitabilityUtils";
import type { ProfitabilityProject } from "../model/types";
import styles from "./DealWorkDensityChart.module.scss";

type DepartmentKey = "all" | "analytics" | "development" | "testing";

type WorkDepartment = Exclude<DepartmentKey, "all">;

type WeekBucket = {
	index: number;
	start: Date;
	end: Date;
	hours: Record<WorkDepartment, number>;
	total: number;
};

const DEPARTMENTS: Array<{
	key: WorkDepartment;
	label: string;
	color: string;
}> = [
	{
		key: "analytics",
		label: "Бизнес аналитики",
		color: "#6fa8ff",
	},
	{
		key: "development",
		label: "Разработка",
		color: "#ff6b6b",
	},
	{
		key: "testing",
		label: "Тестирование",
		color: "#48d98c",
	},
];

const FILTERS: Array<{
	key: DepartmentKey;
	label: string;
}> = [
	{
		key: "all",
		label: "Все отделы",
	},
	...DEPARTMENTS,
];

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const WEEK_WIDTH = 76;
const AXIS_TICKS_COUNT = 5;

const startOfDay = (date: Date) =>
	new Date(date.getFullYear(), date.getMonth(), date.getDate());

const startOfWeek = (date: Date) => {
	const day = date.getDay() || 7;
	const result = startOfDay(date);
	result.setDate(result.getDate() - day + 1);
	return result;
};

const addDays = (date: Date, days: number) =>
	new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

const formatDate = (date: Date) =>
	new Intl.DateTimeFormat("ru-RU", {
		day: "2-digit",
		month: "2-digit",
	}).format(date);

const formatHoursShort = (value: number) => `${Number(value.toFixed(1))} ч`;

const roundAxisMax = (value: number) => {
	if (value <= 0) return 0;

	const magnitude = 10 ** Math.floor(Math.log10(value));
	const normalized = value / magnitude;
	const rounded = normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;

	return rounded * magnitude;
};

const buildAxisTicks = (maxValue: number) => {
	if (maxValue <= 0) {
		return [0];
	}

	return Array.from({ length: AXIS_TICKS_COUNT }, (_, index) => {
		const step = maxValue / (AXIS_TICKS_COUNT - 1);

		return Math.round(maxValue - step * index);
	});
};

const getReportDate = (report: ReportProps) => {
	const date = new Date(report.begindate);
	return Number.isNaN(date.getTime()) ? null : startOfDay(date);
};

const getUserDepartment = (
	report: ReportProps,
	users: User[],
): WorkDepartment => {
	const user = users.find((item) => String(item.id) === String(report.assignedById));
	const position = String(user?.position ?? "").toLowerCase();
	const title = String(user?.title ?? "").toLowerCase();
	const searchable = `${position} ${title}`;

	if (
		user?.department === DEPARTMENT_IDS.ANALYTICS ||
		searchable.includes("аналит")
	) {
		return "analytics";
	}

	if (
		searchable.includes("qa") ||
		searchable.includes("test") ||
		searchable.includes("тест")
	) {
		return "testing";
	}

	return "development";
};

const getWeeksBetween = (firstDate: Date, lastDate: Date): WeekBucket[] => {
	const firstWeekStart = startOfWeek(firstDate);
	const lastWeekStart = startOfWeek(lastDate);
	const weeksCount =
		Math.floor((lastWeekStart.getTime() - firstWeekStart.getTime()) / WEEK_MS) + 1;

	return Array.from({ length: weeksCount }, (_, index) => {
		const start = addDays(firstWeekStart, index * 7);

		return {
			index,
			start,
			end: addDays(start, 6),
			hours: {
				analytics: 0,
				development: 0,
				testing: 0,
			},
			total: 0,
		};
	});
};

const buildWorkDensity = (projects: ProfitabilityProject[], users: User[]) => {
	const reports = projects.flatMap((project) => project.reports);
	const datedReports = reports
		.map((report) => ({
			report,
			date: getReportDate(report),
		}))
		.filter((item): item is { report: ReportProps; date: Date } =>
			Boolean(item.date),
		)
		.toSorted((a, b) => a.date.getTime() - b.date.getTime());

	if (!datedReports.length) {
		return {
			weeks: [],
			firstDate: null,
			lastDate: null,
		};
	}

	const firstDate = datedReports[0].date;
	const lastDate = datedReports[datedReports.length - 1].date;
	const weeks = getWeeksBetween(firstDate, lastDate);
	const firstWeekStart = weeks[0].start;

	datedReports.forEach(({ report, date }) => {
		const weekIndex = Math.floor(
			(startOfWeek(date).getTime() - firstWeekStart.getTime()) / WEEK_MS,
		);
		const week = weeks[weekIndex];

		if (!week) {
			return;
		}

		const department = getUserDepartment(report, users);
		const hours = toNumber(report[ReportCodes.timeSpent]);

		week.hours[department] += hours;
		week.total += hours;
	});

	return {
		weeks,
		firstDate,
		lastDate,
	};
};

const getWeekHours = (week: WeekBucket, activeFilter: DepartmentKey) =>
	activeFilter === "all" ? week.total : week.hours[activeFilter];

export const DealWorkDensityChart = ({
	projects,
	users,
}: {
	projects: ProfitabilityProject[];
	users: User[];
}) => {
	const [activeFilter, setActiveFilter] = useState<DepartmentKey>("all");
	const density = useMemo(
		() => buildWorkDensity(projects, users),
		[projects, users],
	);
	const maxHours = Math.max(
		...density.weeks.map((week) => getWeekHours(week, activeFilter)),
		0,
	);
	const axisMax = roundAxisMax(maxHours);
	const axisTicks = buildAxisTicks(axisMax);
	const chartWidth = Math.max(density.weeks.length * WEEK_WIDTH, 520);
	const totalHours = density.weeks.reduce((acc, week) => acc + week.total, 0);
	const averageHours = density.weeks.length ? totalHours / density.weeks.length : 0;
	const peakWeek = density.weeks.reduce<WeekBucket | null>(
		(acc, week) => (!acc || week.total > acc.total ? week : acc),
		null,
	);
	const departmentTotals = DEPARTMENTS.map((department) => ({
		...department,
		hours: density.weeks.reduce(
			(acc, week) => acc + week.hours[department.key],
			0,
		),
	}));

	return (
		<section className={styles.chartCard}>
			<div className={styles.chartHeader}>
				<div>
					<h3 className={styles.chartTitle}>Плотность работ по сделке</h3>
					<p className={styles.chartSubtitle}>
						Сумма часов по ежедневным отчётам, сгруппированная по неделям
					</p>
				</div>
				<div className={styles.filters}>
					{FILTERS.map((filter) => (
						<button
							key={filter.key}
							type="button"
							className={`${styles.filterButton} ${
								activeFilter === filter.key ? styles.filterButtonActive : ""
							}`}
							onClick={() => setActiveFilter(filter.key)}
						>
							{filter.label}
						</button>
					))}
				</div>
			</div>

			<div className={styles.metricsGrid}>
				<div className={styles.metric}>
					<span>Всего часов</span>
					<strong>{formatHoursShort(totalHours)}</strong>
				</div>
				<div className={styles.metric}>
					<span>Среднее в неделю</span>
					<strong>{formatHoursShort(averageHours)}</strong>
				</div>
				<div className={styles.metric}>
					<span>Пиковая неделя</span>
					<strong>
						{peakWeek
							? `W${peakWeek.index + 1} · ${formatHoursShort(peakWeek.total)}`
							: "—"}
					</strong>
				</div>
				<div className={styles.metric}>
					<span>Недель в работе</span>
					<strong>{density.weeks.length} нед.</strong>
				</div>
			</div>

			<div className={styles.legendPanel}>
				<div className={styles.legend}>
					{DEPARTMENTS.map((department) => (
						<span key={department.key} className={styles.legendItem}>
							<span
								className={styles.legendDot}
								style={{ background: department.color }}
							/>
							{department.label}
						</span>
					))}
				</div>
				<div className={styles.departmentTotals}>
					{departmentTotals.map((department) => (
						<span key={department.key}>
							{department.label}: {formatHoursShort(department.hours)}
						</span>
					))}
				</div>
			</div>

			{density.weeks.length ? (
				<div className={styles.chartScroll}>
					<div className={styles.chart} style={{ minWidth: chartWidth }}>
						<div className={styles.chartFrame}>
							<div className={styles.yAxis}>
								{axisTicks.map((tick, index) => (
									<span key={`${tick}-${index}`}>{tick}</span>
								))}
							</div>
							<div className={styles.bars}>
								{density.weeks.map((week) => {
									const weekHours = getWeekHours(week, activeFilter);
									const barHeight = axisMax ? (weekHours / axisMax) * 100 : 0;

									return (
										<div key={week.start.toISOString()} className={styles.barColumn}>
											<span className={styles.valueLabel}>
												{weekHours > 0 ? formatHoursShort(weekHours) : "0"}
											</span>
											<div
												className={`${styles.bar} ${
													weekHours === 0 ? styles.barEmpty : ""
												}`}
												title={`${formatDate(week.start)} - ${formatDate(
													week.end,
												)}: ${formatHoursShort(weekHours)}`}
												style={{
													height: `${Math.max(barHeight, weekHours ? 4 : 0)}%`,
												}}
											>
												{activeFilter === "all" ? (
													DEPARTMENTS.map((department) => {
														const segmentHours = week.hours[department.key];
														const segmentHeight = week.total
															? (segmentHours / week.total) * 100
															: 0;

														return segmentHours > 0 ? (
															<span
																key={department.key}
																className={styles.barSegment}
																style={{
																	height: `${segmentHeight}%`,
																	background: department.color,
																}}
															/>
														) : null;
													})
												) : (
													<span
														className={styles.barSegment}
														style={{
															height: "100%",
															background:
																DEPARTMENTS.find(
																	(department) =>
																		department.key === activeFilter,
																)?.color ?? "#6fa8ff",
														}}
													/>
												)}
											</div>
										</div>
									);
								})}
							</div>
						</div>
						<div className={styles.labels}>
							<span className={styles.axisSpacer} />
							{density.weeks.map((week) => {
								const isFirst = week.index === 0;
								const isLast = week.index === density.weeks.length - 1;

								return (
									<div key={week.start.toISOString()} className={styles.weekLabel}>
										W{week.index + 1}
										{isFirst && density.firstDate ? (
											<span className={styles.weekDate}>
												{formatDate(density.firstDate)}
											</span>
										) : null}
										{isLast && !isFirst && density.lastDate ? (
											<span className={styles.weekDate}>
												{formatDate(density.lastDate)}
											</span>
										) : null}
									</div>
								);
							})}
						</div>
					</div>
				</div>
			) : (
				<div className={styles.emptyState}>
					Нет ежедневных отчётов для построения плотности работ
				</div>
			)}
		</section>
	);
};
