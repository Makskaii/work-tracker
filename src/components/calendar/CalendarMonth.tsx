/** biome-ignore-all lint/suspicious/noExplicitAny: <s> */
import { useState } from "react";
import { useOutletContext } from "react-router";
import type { ProjectFromList } from "@/pages/ReportsPage/ReportsPage";
import type { ActivityListItem } from "@/pages/ReportsPage/types/types";
import { ClientsCodes } from "@/shared/constants/const";
import { useBitrixSlider } from "@/shared/hooks/useBitrixSlider";
import type { GroupedReportFields, Header } from "@/shared/types/table";
import type {
	ClientProjectProps,
	ClientsWithPropjects,
	ReportsContext,
} from "@/shared/types/types";
import {
	classNames,
	convertToDate,
	convertToMinutesOrHours,
} from "@/shared/utils/utils";
import { Modal } from "../modal";
import { ReportRowActions } from "../Table/universalTable/RowActionBtns";
import { UniversalTable } from "../Table/universalTable/UniversalTable";
import cls from "./Calendar.module.scss";
import { ActivityType, months, ProjectCodes, years } from "./constants/const";
import {
	getPaymentSummary,
	PAYMENT_CLASS_BY_KIND,
	PAYMENT_KIND_BY_SORT,
	PAYMENT_SORT_TITLES,
	type PaymentSort,
} from "./helpers/paymentType";
import type { MonthDays } from "./types/types";

const getProjectCompanyId = (project: ClientProjectProps) => {
	return Number(project[ProjectCodes.company] ?? 0);
};

const isNotAtWorkDay = (day: MonthDays) => {
	return (
		!!day.confirmedReports?.length &&
		day.confirmedReports.every(
			(report) => report.activity === ActivityType.notAtWork,
		)
	);
};

const formatHours = (value: number) => `${Number(value.toFixed(1))} ч`;

const getVisiblePaymentSorts = (summary: Record<PaymentSort, number>) => {
	const paidSorts = ([0, 1, 2] as PaymentSort[]).filter(
		(sort) => summary[sort] > 0,
	);

	return paidSorts.length ? paidSorts : ([0, 1, 2] as PaymentSort[]);
};

const getPrimaryPaymentClass = (
	reports: GroupedReportFields[] = [],
	activities: ActivityListItem[],
) => {
	const summary = getPaymentSummary(reports, activities);
	const primary = ([0, 1, 2] as PaymentSort[]).toSorted(
		(a, b) => summary[b] - summary[a],
	)[0];

	if (!summary[primary]) return null;

	return PAYMENT_CLASS_BY_KIND[PAYMENT_KIND_BY_SORT[primary]];
};

const getActivitySummary = (
	reports: GroupedReportFields[],
	activities: ActivityListItem[],
) => {
	const activityMap = new Map<number, { title: string; hours: number }>();

	for (const report of reports) {
		const activityId = Number(report.activity);
		const title =
			activities.find((activity) => Number(activity.ID) === activityId)?.NAME ??
			`Активность #${activityId}`;
		const current = activityMap.get(activityId) ?? { title, hours: 0 };

		current.hours += Number(report.timeSpent) || 0;
		activityMap.set(activityId, current);
	}

	return Array.from(activityMap.values()).sort((a, b) => b.hours - a.hours);
};

export const headers: Header<GroupedReportFields>[] = [
	{
		title: "Описание",
		key: "title",
	},
	{
		title: "Клиент",
		key: "client",
		convertFn: (value, additionalData) => {
			const clients = (additionalData?.clients ?? []) as ClientsWithPropjects[];
			const directClient = clients.find(
				(client) => Number(client.ID) === value,
			);

			if (directClient) {
				return directClient.NAME;
			}

			const clientByProjectCompany = clients.find((client) =>
				client.projects?.some(
					(project) => getProjectCompanyId(project) === value,
				),
			);

			return clientByProjectCompany?.NAME || `Компания #${value}`;
		},
	},
	{
		title: "Проект",
		key: "project",
		convertFn: (value, additionalData) => {
			const clients = (additionalData?.clients ?? []) as ClientsWithPropjects[];
			const clientProject = clients
				.flatMap((client) => client.projects ?? [])
				.find(
					(project) =>
						Number(project.id) === value || Number(project.projectId) === value,
				);

			if (clientProject?.title) {
				return clientProject.title;
			}

			const listProject = (additionalData?.projects ?? []).find(
				(project: ProjectFromList) =>
					Number(project[ClientsCodes.client]) === value ||
					Number(project.id) === value,
			);

			return listProject?.title || listProject?.name || `Проект #${value}`;
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
	isLoading,
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
	isLoading?: boolean;
}) => {
	const [open, setOpen] = useState(false);
	const [activeReport, setActiveReports] = useState<GroupedReportFields[]>([]);
	const [activeDayTitle, setActiveDayTitle] = useState("");
	const { projects, activities, clientsList } =
		useOutletContext<ReportsContext>();
	const { openTask } = useBitrixSlider();

	const activePaymentSummary = getPaymentSummary(activeReport, activities);
	const activeActivitySummary = getActivitySummary(activeReport, activities);
	const visibleModalPaymentSorts = getVisiblePaymentSorts(activePaymentSummary);

	return (
		<div className={cls.calendar}>
			<div className={cls["calendar-controls"]}>
				<button onClick={handlePrevMonth} className={cls["nav-button"]}>
					‹
				</button>

				<div className={cls["month-year-selector"]}>
					<select
						name="month"
						value={selectedMonth}
						onChange={handleMonthChange}
						className={cls["month-select"]}
					>
						{months.map((month, index) => (
							<option key={month} value={index}>
								{month}
							</option>
						))}
					</select>

					<select
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
					›
				</button>

				<button onClick={handleToday} className={cls["today-button"]}>
					Сегодня
				</button>
			</div>

			<h2 className={cls["calendar-title"]}>
				{getCurrentMonthName()} {selectedYear}
			</h2>

			<div className={cls["weekdays-header"]}>
				{["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day) => (
					<div key={day} className={cls.weekday}>
						{day}
					</div>
				))}
			</div>

			{isLoading ? (
				<CalendarMonthSkeleton />
			) : (
				<div className={cls["calendar-grid"]}>
					{monthDays.map((day) => {
						const confirmedReports = day.confirmedReports ?? [];
						const paymentSummary = getPaymentSummary(
							confirmedReports,
							activities,
						);
						const primaryPaymentClass = getPrimaryPaymentClass(
							confirmedReports,
							activities,
						);
						const hasReports = Boolean(day.reports?.length);

						return (
							<div
								key={day.id}
								className={classNames(cls["calendar-day"], {
									[cls.today]: day.isToday,
									[cls.weekend]: day.isWeekend,
									[cls["other-month"]]: !day.isCurrentMonth,
									[cls.empty]: day.isEmpty,
									[cls.fullday]: day.totalHours === 8,
									[cls.incompleteday]:
										Boolean(day.totalHours) && Number(day.totalHours) < 8,
									[cls.overTime]:
										Boolean(day.totalHours) && Number(day.totalHours) > 8,
									[cls.hasUnconfirmedReports]: !!day.unconfirmedReports?.length,
									[cls.notAtWorkDay]: isNotAtWorkDay(day),
									[cls.clientPaid]: primaryPaymentClass === "clientPaid",
									[cls.companyPaid]: primaryPaymentClass === "companyPaid",
									[cls.unpaid]: primaryPaymentClass === "unpaid",
								})}
								onClick={() => {
									if (!hasReports) return;

									setActiveReports(day.reports ?? []);
									setActiveDayTitle(
										day.date
											? day.date.toLocaleDateString("ru-RU", {
													day: "numeric",
													month: "long",
													year: "numeric",
												})
											: "",
									);
									setOpen(true);
								}}
							>
								<div className={cls.dayTopline}>
									<div className={cls["day-number"]}>{day.dayNumber}</div>
									{day.totalHours && (
										<div className={cls.dayHours}>
											{formatHours(day.totalHours)}
										</div>
									)}
								</div>
								<div className={cls["day-name"]}>{day.dayName}</div>
								{day.totalHours && (
									<div className={cls.dayReportMeta}>
										<span>{formatHours(day.totalHours)}</span>
										<span>{confirmedReports.length} отчетов</span>
									</div>
								)}
								{day.totalHours && (
									<div className={cls.paymentBadges}>
										{getVisiblePaymentSorts(paymentSummary).map((sort) => {
											const hours = paymentSummary[sort];
											const kind = PAYMENT_KIND_BY_SORT[sort];

											return (
												<span
													key={sort}
													className={classNames(cls.paymentBadge, {
														[cls.clientPaid]: kind === "client",
														[cls.companyPaid]: kind === "company",
														[cls.unpaid]: kind === "unpaid",
													})}
													title={PAYMENT_SORT_TITLES[sort]}
												>
													{Number(hours.toFixed(1))}
												</span>
											);
										})}
									</div>
								)}
								{!!day.unconfirmedReports?.length && (
									<div className={cls.unconfirmedBadge}>
										проблемы: {day.unconfirmedReports.length}
									</div>
								)}
							</div>
						);
					})}
				</div>
			)}
			<Modal
				isOpen={open}
				onClose={() => setOpen(false)}
				size="full"
				innerScroll
			>
				<div className={cls.dayModalHeader}>
					<div>
						<div className={cls.dayModalEyebrow}>Сводка за день</div>
						<h3 className={cls.dayModalTitle}>{activeDayTitle}</h3>
					</div>
					<div className={cls.dayModalWidgets}>
						{visibleModalPaymentSorts.map((sort) => {
							const kind = PAYMENT_KIND_BY_SORT[sort];

							return (
								<div
									key={sort}
									className={classNames(cls.dayModalWidget, {
										[cls.clientPaid]: kind === "client",
										[cls.companyPaid]: kind === "company",
										[cls.unpaid]: kind === "unpaid",
									})}
								>
									<span>{PAYMENT_SORT_TITLES[sort]}</span>
									<strong>{formatHours(activePaymentSummary[sort])}</strong>
								</div>
							);
						})}
					</div>
				</div>
				{!!activeActivitySummary.length && (
					<div className={cls.activitySummary}>
						{activeActivitySummary.map((activity) => (
							<span key={activity.title} className={cls.activitySummaryItem}>
								{activity.title}: <strong>{formatHours(activity.hours)}</strong>
							</span>
						))}
					</div>
				)}
				<UniversalTable<GroupedReportFields>
					activeItems={activeReport.toSorted((a, b) => a.client - b.client)}
					headers={headers}
					additionalData={{
						projects,
						activities,
						report: activeReport,
						clients: clientsList,
						openTask,
					}}
					totalRow={
						<div className={cls.dayModalTotal}>
							Часов за день:{" "}
							{activeReport
								.reduce(
									(acc, report) => acc + (Number(report.timeSpent) || 0),
									0,
								)
								.toFixed(2)}
						</div>
					}
				/>
			</Modal>
		</div>
	);
};

const CalendarMonthSkeleton = () => {
	return (
		<div className={cls.skeletonGrid} aria-hidden="true">
			{Array.from({ length: 35 }, (_, index) => (
				<div key={index} className={cls.skeletonDay}>
					<div className={cls.skeletonTopline}>
						<span />
						<span />
					</div>
					<div className={cls.skeletonLine} />
					<div className={cls.skeletonLineShort} />
					<div className={cls.skeletonBadges}>
						<span />
						<span />
						<span />
					</div>
				</div>
			))}
		</div>
	);
};

export default CalendarMonth;
