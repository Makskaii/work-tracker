import dayjs, { type Dayjs } from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router";
import { Endpoints, EntityTypeIds } from "@/shared/constants/const";
import { useLoadAllData } from "@/shared/hooks/useLoadAllTasks";
import type { GroupedReportFields } from "@/shared/types/table";
import type { ReportsContext } from "@/shared/types/types";
import { convertToMinutesOrHours } from "@/shared/utils/utils";
import { Modal } from "../modal";
import {
	ActivityTitle,
	months,
	ReportCodes,
	ReportStageIds,
} from "./constants/const";
import { buildWeekCalendarFromReports } from "./helpers/generateWeek";
import { getColorAdnBorder } from "./helpers/getReportItemColors";
import {
	getPaymentSummary,
	PAYMENT_KIND_BY_SORT,
	PAYMENT_SORT_TITLES,
	type PaymentSort,
} from "./helpers/paymentType";
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

const getVisiblePaymentSorts = (summary: Record<PaymentSort, number>) => {
	const paidSorts = ([0, 1, 2] as PaymentSort[]).filter(
		(sort) => summary[sort] > 0,
	);

	return paidSorts.length ? paidSorts : ([0, 1, 2] as PaymentSort[]);
};

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
	const [activeReport, setActiveReport] = useState<ReportProps>();
	const [selectedDay, setSelectedDay] = useState(() => dayjs());
	const { activities } = useOutletContext<ReportsContext>();

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
					const paymentSummary = getPaymentSummary(groupedReports, activities);
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
							<div className={cls.dayTopline}>
								<div className={cls.dayNumber}>{day.dayNumber}</div>
								{day.totalHours && (
									<div className={cls.dayHours}>
										{formatHours(day.totalHours)}
									</div>
								)}
							</div>
							<div className={cls.dayName}>{day.dayName}</div>
							{day.totalHours && (
								<div className={cls.dayReportMeta}>
									<span>{formatHours(day.totalHours)}</span>
									<span>{reports.length} отчетов</span>
								</div>
							)}
							{!!day.totalHours && (
								<div className={cls.paymentBadges}>
									{getVisiblePaymentSorts(paymentSummary).map((sort) => {
										const hours = paymentSummary[sort];
										const kind = PAYMENT_KIND_BY_SORT[sort];

										return (
											<button
												type="button"
												key={sort}
												className={`${cls.paymentBadge} ${cls[kind]}`}
												title={PAYMENT_SORT_TITLES[sort]}
												onClick={() => {
													const firstReport = reports.find((report) => {
														const reportSummary = getPaymentSummary(
															[mapReportToGroupedFields(report)],
															activities,
														);

														return reportSummary[sort] > 0;
													});

													if (firstReport) {
														setIsModalOpen(true);
														setActiveReport(firstReport);
													}
												}}
											>
												{Number(hours.toFixed(1))}
											</button>
										);
									})}
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
				{activeReport && (
					<div className={cls.modalContent}>
						<div
							className={cls.modalActivity}
							style={getColorAdnBorder(activeReport, activities)}
						>
							{ActivityTitle[activeReport?.[ReportCodes.activityType]]}
							<strong>
								{convertToMinutesOrHours(+activeReport[ReportCodes.timeSpent])}
							</strong>
						</div>
						<div className={cls.modalTitle}>
							{activeReport?.[ReportCodes.title]}
						</div>
					</div>
				)}
			</Modal>
		</div>
	);
};

export default WeekCalendar;
