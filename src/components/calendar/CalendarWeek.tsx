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
	getDayHourDeficits,
	type DayHourDeficit,
} from "./helpers/dayHourDeficits";
import { ReportCodes, ReportStageIds } from "./constants/const";
import {
	CALENDAR_DAY_STATE_TITLES,
	getCalendarDayState,
} from "./helpers/calendarDayState";
import { formatWeekTitle, getWeekRange } from "./helpers/calendarPeriod";
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
	selectedDate,
}: {
	userId?: string;
	userIds?: string[];
	selectedDate: string;
}) => {
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
	const selectedFilterRange = useMemo(
		() => ({
			start: dayjs(selectedRange.startOfTheWeek).startOf("day").toISOString(),
			end: dayjs(selectedRange.endOfTheWeek).endOf("day").toISOString(),
		}),
		[selectedRange],
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

	const { data, loading, error, setFilters } = useLoadAllData<ReportProps>({
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
	}, [scopeFilter, selectedFilterRange, setFilters]);

	const weekCalendar = useMemo(() => {
		return buildWeekCalendarFromReports(
			data,
			selectedRange,
			ReportCodes.timeSpent,
		);
	}, [data, selectedRange]);

	if (loading)
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
					const reports = day.reports ?? [];
					const groupedReports = reports.map(mapReportToGroupedFields);
					const deficits = getDayHourDeficits({
						date: day.date,
						reports: groupedReports,
						users: scopeUsers,
					});
					const summaryDeficits = getDayHourDeficits({
						date: day.date,
						reports: groupedReports,
						users: scopeUsers,
						includeToday: true,
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
						hasHourDeficit: deficits.length > 0,
					});
					const dayTitle = `${day.date.toLocaleDateString("ru-RU", { day: "numeric", month: "long", weekday: "long" })}: ${CALENDAR_DAY_STATE_TITLES[dayState]}${deficits.length ? `. Сотрудников с недобором: ${deficits.length}` : ""}`;
					const categorySummary = getReportCategorySummary(
						confirmedReports,
						activities,
						internalProjectIds,
					);
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
							data-state={dayState}
							data-deficit={deficits.length > 0}
							data-weekend={day.isWeekend && dayState !== "blank"}
							title={`${dayTitle ?? ""}${deficits.length ? `. ${describeDayHourDeficits(deficits)}` : ""}`}
							aria-label={dayTitle}
						>
							<button
								type="button"
								className={cls.dayTopline}
								disabled={!reports.length && !summaryDeficits.length}
								onClick={() => openDayReports()}
								aria-label={`Все отчёты за ${day.dayNumber}: ${reports.length}`}
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

export default WeekCalendar;
