import dayjs from "dayjs";
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
import {
	DayHoursSummary,
	DayHoursWarning,
	describeDayHourDeficits,
} from "./DayHoursWarning";
import {
	getCalendarDayHourDeficits,
	type DayHourDeficit,
} from "./helpers/dayHourDeficits";
import { ReportCodes, ReportStageIds, selectFields } from "./constants/const";
import {
	CALENDAR_DAY_STATE_TITLES,
	getCalendarDayState,
} from "./helpers/calendarDayState";
import { formatWeekTitle, getWeekRange } from "./helpers/calendarPeriod";
import {
	formatCalendarDayTitle,
	formatCalendarFullDate,
	getLocalCalendarDateKey,
} from "./helpers/calendarDateFormat";
import { buildWeekCalendarFromGroupedReports } from "./helpers/generateWeek";
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

type WeekCalendarProps = {
	userId?: string;
	userIds?: string[];
	selectedDate: string;
};

type LoadedWeekCalendarProps = WeekCalendarProps & {
	reports: GroupedReportFields[];
	isLoading?: boolean;
	error?: string | null;
};

const WeekCalendarView = ({
	userId,
	userIds,
	selectedDate,
	reports,
	isLoading,
	error,
}: LoadedWeekCalendarProps) => {
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [activeReports, setActiveReports] = useState<GroupedReportFields[]>([]);
	const [activeDayTitle, setActiveDayTitle] = useState("");
	const [activeDeficits, setActiveDeficits] = useState<DayHourDeficit[]>([]);
	const [activeCategory, setActiveCategory] = useState<ReportCategory>();
	const { activities, users, projects, clientsList } =
		useOutletContext<ReportsContext>();
	const { openTask } = useBitrixSlider();
	const scopeUsers = useMemo(
		() =>
			users.filter((user) =>
				userId ? user.id === userId : userIds?.includes(user.id),
			),
		[users, userIds, userId],
	);
	const internalProjectIds = useMemo(
		() => getInternalProjectIds(projects, clientsList),
		[projects, clientsList],
	);

	const selectedRange = useMemo(
		() => getWeekRange(dayjs(selectedDate)),
		[selectedDate],
	);
	const todayKey = getLocalCalendarDateKey(new Date());
	const weekCalendar = useMemo(() => {
		const now = new Date(`${todayKey}T00:00:00`);
		return buildWeekCalendarFromGroupedReports(reports, selectedRange).map(
			(day) => {
				const groupedReports = day.reports ?? [];
				const { deficits, summaryDeficits } = getCalendarDayHourDeficits({
					date: day.date,
					reports: groupedReports,
					users: scopeUsers,
					now,
				});
				const confirmedReports = groupedReports.filter(
					(report) => report.stageId === ReportStageIds.confirmed,
				);
				const totalHours = confirmedReports.reduce(
					(total, report) => total + parseTimeSpent(report.timeSpent),
					0,
				);
				const dayState = getCalendarDayState({
					date: day.date,
					reports: groupedReports,
					activities,
					now,
					hasHourDeficit: deficits.length > 0,
				});
				return {
					...day,
					reports: groupedReports,
					deficits,
					summaryDeficits,
					confirmedReports,
					totalHours,
					dayState,
					dayTitle: `${formatCalendarDayTitle(day.date)}: ${CALENDAR_DAY_STATE_TITLES[dayState]}${deficits.length ? `. Сотрудников с недобором: ${deficits.length}` : ""}`,
					categorySummary: getReportCategorySummary(
						confirmedReports,
						activities,
						internalProjectIds,
					),
					unconfirmedCount: groupedReports.filter(
						(report) => report.stageId === ReportStageIds.unconfirmed,
					).length,
				};
			},
		);
	}, [reports, selectedRange, scopeUsers, activities, internalProjectIds, todayKey]);

	if (isLoading)
		return (
			<div className={cls.container} role="status">
				Загружаем отчёты…
			</div>
		);
	if (error)
		return (
			<div className={cls.container} role="alert">
				Не удалось загрузить отчёты. Обновите страницу, чтобы повторить попытку.
			</div>
		);

	return (
		<div className={cls.container}>
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
					const {
						reports: groupedReports,
						deficits,
						summaryDeficits,
						confirmedReports,
						totalHours,
						dayState,
						dayTitle,
						categorySummary,
						unconfirmedCount,
					} = day;
					const openDayReports = (category?: ReportCategory) => {
						setActiveDeficits(summaryDeficits);
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
						setActiveDayTitle(formatCalendarFullDate(day.date));
						setIsModalOpen(true);
					};
					return (
						<section
							key={day.id}
							className={cls.dayCard}
							data-today={day.isToday}
							data-state={dayState}
							data-deficit={deficits.length > 0}
							data-weekend={day.isWeekend && dayState !== "blank"}
							title={`${dayTitle ?? ""}${deficits.length ? `. ${describeDayHourDeficits(deficits)}` : ""}`}
							aria-label={dayTitle}
						>
							<button
								type="button"
								className={cls.dayTopline}
								disabled={!groupedReports.length && !summaryDeficits.length}
								onClick={() => openDayReports()}
								aria-label={`Все отчёты за ${day.dayNumber}: ${groupedReports.length}`}
							>
								<span className={cls.dayNumber}>{day.dayNumber}</span>
								{!!totalHours && (
									<span className={cls.dayHours}>
										{formatHours(totalHours)}
									</span>
								)}
							</button>
							<div className={cls.dayName}>{day.dayName}</div>
							{(dayState === "missing" || dayState === "absence") && (
								<div className={cls.dayStatus}>
									{CALENDAR_DAY_STATE_TITLES[dayState]}
								</div>
							)}
							<DayHoursWarning deficits={deficits} isIndividual={!!userId} />
							{!!totalHours && (
								<div className={cls.dayReportMeta}>
									<span>{confirmedReports.length} отчетов</span>
								</div>
							)}
							{!!totalHours && (
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
					<DayHoursSummary deficits={activeDeficits} />
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

const StandaloneWeekCalendar = (props: WeekCalendarProps) => {
	const { selectedDate, userId, userIds } = props;
	const selectedRange = useMemo(
		() => getWeekRange(dayjs(selectedDate)),
		[selectedDate],
	);
	const filters = useMemo(
		() => ({
			params: {
				entityTypeId: EntityTypeIds.reports,
				select: selectFields,
				filter: {
					...(userId
						? { assignedById: userId }
						: userIds?.length
							? { "@assignedById": userIds }
							: { assignedById: "__empty__" }),
					">=begindate": dayjs(selectedRange.startOfTheWeek)
						.startOf("day")
						.toISOString(),
					"<=begindate": dayjs(selectedRange.endOfTheWeek)
						.endOf("day")
						.toISOString(),
					"@stageId": [ReportStageIds.unconfirmed, ReportStageIds.confirmed],
				},
			},
		}),
		[selectedRange, userId, userIds],
	);
	const { data, loading, error, setFilters } = useLoadAllData<ReportProps>({
		initialEndpoint: Endpoints.crmItems,
		initialFilters: filters,
	});
	useEffect(() => {
		setFilters(filters);
	}, [filters, setFilters]);
	const reports = useMemo(() => data.map(mapReportToGroupedFields), [data]);
	return (
		<WeekCalendarView {...props} reports={reports} isLoading={loading} error={error} />
	);
};

const WeekCalendar = (
	props: WeekCalendarProps & Partial<Pick<LoadedWeekCalendarProps, "reports" | "isLoading" | "error">>,
) =>
	props.reports !== undefined ? (
		<WeekCalendarView {...props} reports={props.reports} />
	) : (
		<StandaloneWeekCalendar {...props} />
	);

export default WeekCalendar;
