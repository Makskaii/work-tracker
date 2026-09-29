import dayjs, { type Dayjs } from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router";
import { parseTimeSpent } from "@/pages/ReportsPage/ui/UserReports/model/utils";
import { CompactReportRow } from "@/pages/ReportsPage/ui/UserReports/ui/CompactReportRow";
import { Endpoints, EntityTypeIds } from "@/shared/constants/const";
import { useBitrixSlider } from "@/shared/hooks/useBitrixSlider";
import { useLoadAllData } from "@/shared/hooks/useLoadAllTasks";
import type { GroupedReportFields } from "@/shared/types/table";
import type { ReportsContext } from "@/shared/types/types";
import { Modal } from "../modal";
import { months, ReportCodes, ReportStageIds } from "./constants/const";
import { buildWeekCalendarFromReports } from "./helpers/generateWeek";
import {
	getInternalProjectIds,
	getReportCategory,
	getReportCategorySummary,
	REPORT_CATEGORIES,
	REPORT_CATEGORY_TITLES,
	type ReportCategory,
} from "./helpers/reportCategory";
import type { ReportProps } from "./types/types";
import cls from "./WeekCalendar.module.scss";

type WeekRange = {
	startOfTheWeek: string;
	endOfTheWeek: string;
};

const getWeekRange = (date: Dayjs): WeekRange => {
	const day = date.day();
	const diffToMonday = day === 0 ? 6 : day - 1;
	const start = date.startOf("day").subtract(diffToMonday, "day");

	return {
		startOfTheWeek: start.format("YYYY-MM-DD"),
		endOfTheWeek: start.add(6, "day").endOf("day").format("YYYY-MM-DD"),
	};
};

const getMonthWeekRanges = (date: Dayjs) => {
	const monthStart = date.startOf("month");
	const firstMonday =
		monthStart.day() === 1
			? monthStart
			: monthStart.add(
					monthStart.day() === 0 ? 1 : 8 - monthStart.day(),
					"day",
				);
	const ranges: WeekRange[] = [];
	let current = firstMonday;

	while (current.month() === monthStart.month()) {
		ranges.push(getWeekRange(current));
		current = current.add(7, "day");
	}

	return ranges;
};

const formatWeekChip = (range: WeekRange) => {
	const start = dayjs(range.startOfTheWeek);
	const end = dayjs(range.endOfTheWeek);

	return `${start.format("D")}–${end.format("D")} ${months[end.month()].toLowerCase()}`;
};

const formatWeekTitle = (range: WeekRange) => {
	const start = dayjs(range.startOfTheWeek);
	const end = dayjs(range.endOfTheWeek);

	return `${start.format("D")}–${end.format("D")} ${months[end.month()]} ${end.year()}`;
};

const formatHours = (value: number) => `${Number(value.toFixed(1))} ч`;

const getVisibleCategories = (summary: Record<ReportCategory, number>) =>
	REPORT_CATEGORIES.filter((category) => summary[category] > 0);

const mapReportToGroupedFields = (
	report: ReportProps,
): GroupedReportFields => ({
	id: report.id,
	title: report[ReportCodes.title],
	timeSpent: report[ReportCodes.timeSpent],
	taskId: report[ReportCodes.taskId],
	parentId: report[ReportCodes.parentId],
	day: report.begindate,
	project: Number(report[ReportCodes.project] ?? 0),
	parentproject: Number(
		report[ReportCodes.parentproject] ?? report[ReportCodes.project] ?? 0,
	),
	activity: report[ReportCodes.activityType],
	assignedById: String(report.assignedById),
	client: Number(report[ReportCodes.client] ?? 0),
	company: Number(
		report[ReportCodes.company] ?? report[ReportCodes.client] ?? 0,
	),
	stageId: report.stageId,
	taskType: report[ReportCodes.taskType] ?? null,
});

const WeekCalendar = ({
	userId,
	userIds,
	onWeekRangeChange,
}: {
	userId?: string;
	userIds?: string[];
	onWeekRangeChange?: (range: WeekRange) => void;
}) => {
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [activeReports, setActiveReports] = useState<GroupedReportFields[]>([]);
	const [activeDayTitle, setActiveDayTitle] = useState("");
	const [activeCategory, setActiveCategory] = useState<ReportCategory>();
	const [selectedDay, setSelectedDay] = useState(() => dayjs());
	const { activities, users, projects, clientsList } =
		useOutletContext<ReportsContext>();
	const { openTask } = useBitrixSlider();
	const internalProjectIds = useMemo(
		() => getInternalProjectIds(projects, clientsList),
		[projects, clientsList],
	);

	const selectedRange = useMemo(() => getWeekRange(selectedDay), [selectedDay]);
	const selectedFilterRange = useMemo(
		() => ({
			start: dayjs(selectedRange.startOfTheWeek).startOf("day").toISOString(),
			end: dayjs(selectedRange.endOfTheWeek).endOf("day").toISOString(),
		}),
		[selectedRange],
	);
	const monthWeekRanges = useMemo(
		() => getMonthWeekRanges(selectedDay),
		[selectedDay],
	);
	const scopeFilter = useMemo(() => {
		if (userId) {
			return { assignedById: userId };
		}

		if (userIds?.length) {
			return { "@assignedById": userIds };
		}

		return { assignedById: "__empty__" };
	}, [userId, userIds]);

	const { data, setFilters } = useLoadAllData<ReportProps>({
		initialEndpoint: Endpoints.crmItems,
		initialFilters: {
			params: {
				entityTypeId: EntityTypeIds.reports,
				select: [
					"id",
					"title",
					"begindate",
					ReportCodes.title,
					ReportCodes.timeSpent,
					ReportCodes.project,
					ReportCodes.client,
					ReportCodes.company,
					ReportCodes.parentproject,
					ReportCodes.taskId,
					ReportCodes.taskType,
					ReportCodes.activityType,
					"assignedById",
					"stageId",
					"createdTime",
					"lastActivityTime",
					`parentId${EntityTypeIds.tasks}`,
				],
				filter: {
					...scopeFilter,
					">=begindate": selectedFilterRange.start,
					"<=begindate": selectedFilterRange.end,
					"@stageId": [ReportStageIds.unconfirmed, ReportStageIds.confirmed],
				},
			},
		},
	});

	useEffect(() => {
		onWeekRangeChange?.(selectedRange);
		setFilters({
			params: {
				entityTypeId: EntityTypeIds.reports,
				select: [
					"id",
					"title",
					"begindate",
					ReportCodes.title,
					ReportCodes.timeSpent,
					ReportCodes.project,
					ReportCodes.client,
					ReportCodes.company,
					ReportCodes.parentproject,
					ReportCodes.taskId,
					ReportCodes.taskType,
					ReportCodes.activityType,
					"assignedById",
					"stageId",
					"createdTime",
					"lastActivityTime",
					`parentId${EntityTypeIds.tasks}`,
				],
				filter: {
					...scopeFilter,
					">=begindate": selectedFilterRange.start,
					"<=begindate": selectedFilterRange.end,
					"@stageId": [ReportStageIds.unconfirmed, ReportStageIds.confirmed],
				},
			},
		});
	}, [
		onWeekRangeChange,
		scopeFilter,
		selectedFilterRange,
		selectedRange,
		setFilters,
	]);

	const weekCalendar = useMemo(() => {
		return buildWeekCalendarFromReports(
			data,
			selectedRange,
			ReportCodes.timeSpent,
		);
	}, [data, selectedRange]);

	return (
		<div className={cls.container}>
			<div className={cls.toolbar}>
				<div className={cls.weekTools}>
					<div className={cls.viewTabs}>
						<span>Месяц</span>
						<strong>Неделя</strong>
					</div>
					<div className={cls.weekChips}>
						<span>Неделя:</span>
						{monthWeekRanges.map((range) => {
							const isActive =
								range.startOfTheWeek === selectedRange.startOfTheWeek;

							return (
								<button
									type="button"
									key={range.startOfTheWeek}
									className={isActive ? cls.weekChipActive : ""}
									onClick={() => setSelectedDay(dayjs(range.startOfTheWeek))}
								>
									{formatWeekChip(range)}
								</button>
							);
						})}
					</div>
				</div>

				<div className={cls.periodControls}>
					<button
						type="button"
						className={cls.iconButton}
						onClick={() => setSelectedDay((prev) => prev.subtract(7, "day"))}
					>
						‹
					</button>
					<button
						type="button"
						className={cls.iconButton}
						onClick={() => setSelectedDay((prev) => prev.add(7, "day"))}
					>
						›
					</button>
					<button
						type="button"
						className={cls.todayButton}
						onClick={() => setSelectedDay(dayjs())}
					>
						Сегодня
					</button>
				</div>
			</div>

			<h2 className={cls.weekTitle}>{formatWeekTitle(selectedRange)}</h2>

			<div className={cls.categoryLegend} aria-label="Категории отчётов">
				{REPORT_CATEGORIES.map((category) => (
					<span key={category} className={cls[category]}>
						<i aria-hidden="true" />
						{REPORT_CATEGORY_TITLES[category]}
					</span>
				))}
			</div>

			<div className={cls.weekGridHeader}>
				{weekCalendar.map((day) => (
					<div key={day.id} data-weekend={day.isWeekend}>
						{day.dayName}
					</div>
				))}
			</div>

			<div className={cls.weekGrid}>
				{weekCalendar.map((day) => {
					const reports = day.reports ?? [];
					const groupedReports = reports.map(mapReportToGroupedFields);
					const categorySummary = getReportCategorySummary(
						groupedReports,
						activities,
						internalProjectIds,
					);
					const openDayReports = (category?: ReportCategory) => {
						setActiveReports(
							category
								? groupedReports.filter(
										(report) =>
											getReportCategory(
												report,
												activities,
												internalProjectIds,
											) === category,
									)
								: groupedReports,
						);
						setActiveCategory(category);
						setActiveDayTitle(
							day.date.toLocaleDateString("ru-RU", {
								day: "numeric",
								month: "long",
								year: "numeric",
							}),
						);
						setIsModalOpen(true);
					};
					const unconfirmedCount = reports.filter(
						(report) => report.stageId === ReportStageIds.unconfirmed,
					).length;

					return (
						<section
							key={day.id}
							className={cls.dayCard}
							data-today={day.isToday}
							data-weekend={day.isWeekend}
							data-empty={!reports.length}
						>
							<button
								type="button"
								className={cls.dayTopline}
								disabled={!reports.length}
								onClick={() => openDayReports()}
								aria-label={`Все отчёты за ${day.dayNumber}: ${reports.length}`}
							>
								<span className={cls.dayNumber}>{day.dayNumber}</span>
								{!!day.totalHours && (
									<span className={cls.dayHours}>
										{formatHours(day.totalHours)}
									</span>
								)}
							</button>
							<div className={cls.dayName}>{day.dayName}</div>
							{!!day.totalHours && (
								<div className={cls.dayReportMeta}>
									<span>{reports.length} отчетов</span>
								</div>
							)}
							{!!day.totalHours && (
								<div className={cls.categoryBadges}>
									{getVisibleCategories(categorySummary).map((category) => (
										<button
											type="button"
											key={category}
											className={`${cls.categoryBadge} ${cls[category]}`}
											title={`${REPORT_CATEGORY_TITLES[category]}: ${formatHours(categorySummary[category])}`}
											onClick={() => openDayReports(category)}
										>
											{Number(categorySummary[category].toFixed(1))}
										</button>
									))}
								</div>
							)}
							{!!unconfirmedCount && (
								<div className={cls.unconfirmedBadge}>
									проблемы: {unconfirmedCount}
								</div>
							)}
						</section>
					);
				})}
			</div>

			<Modal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				innerScroll
			>
				<div className={cls.modalContent}>
					<div className={cls.modalHeading}>
						<h3>{activeDayTitle}</h3>
						{activeCategory && (
							<span className={`${cls.categoryBadge} ${cls[activeCategory]}`}>
								{REPORT_CATEGORY_TITLES[activeCategory]}
							</span>
						)}
					</div>
					{activeReports.map((report) => (
						<CompactReportRow
							key={report.id}
							report={report}
							users={users}
							activities={activities}
							onOpenReport={(id) => {
								void openTask(id, EntityTypeIds.reports);
							}}
						/>
					))}
					<div className={cls.modalTotal}>
						Всего:{" "}
						{formatHours(
							activeReports.reduce(
								(sum, report) => sum + parseTimeSpent(report.timeSpent),
								0,
							),
						)}
					</div>
				</div>
			</Modal>
		</div>
	);
};

export default WeekCalendar;
