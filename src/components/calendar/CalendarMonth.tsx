/** biome-ignore-all lint/suspicious/noExplicitAny: <s> */
import { useMemo, useState } from "react";
import { useOutletContext } from "react-router";
import type { ProjectFromList } from "@/pages/ReportsPage/ReportsPage";
import type { ActivityListItem } from "@/pages/ReportsPage/types/types";
import { parseTimeSpent } from "@/pages/ReportsPage/ui/UserReports/model/utils";
import { CompactReportRow } from "@/pages/ReportsPage/ui/UserReports/ui/CompactReportRow";
import { ClientsCodes, EntityTypeIds } from "@/shared/constants/const";
import { useBitrixSlider } from "@/shared/hooks/useBitrixSlider";
import type { GroupedReportFields, Header } from "@/shared/types/table";
import type {
	ClientProjectProps,
	ClientsWithPropjects,
	ReportsContext,
	User,
} from "@/shared/types/types";
import {
	classNames,
	convertToDate,
	convertToMinutesOrHours,
} from "@/shared/utils/utils";
import { Modal } from "../modal";
import { ReportRowActions } from "../Table/universalTable/RowActionBtns";
import cls from "./Calendar.module.scss";
import {
	DayHoursSummary,
	DayHoursWarning,
	describeDayHourDeficits,
} from "./DayHoursWarning";
import {
	getCalendarDayHourDeficits,
	type DayHourDeficit,
} from "./helpers/dayHourDeficits";
import { ProjectCodes } from "./constants/const";
import {
	CALENDAR_DAY_STATE_TITLES,
	getCalendarDayState,
} from "./helpers/calendarDayState";
import {
	formatCalendarDayTitle,
	formatCalendarFullDate,
	getLocalCalendarDateKey,
} from "./helpers/calendarDateFormat";
import {
	getInternalProjectIds,
	getReportCategorySummary,
	REPORT_CATEGORIES,
	REPORT_CATEGORY_TITLES,
	type ReportCategory,
} from "./helpers/reportCategory";
import type { MonthDays } from "./types/types";

const getProjectCompanyId = (project: ClientProjectProps) => {
	return Number(project[ProjectCodes.company] ?? 0);
};

const formatHours = (value: number) => `${Number(value.toFixed(1))} ч`;

const getVisibleCategories = (summary: Record<ReportCategory, number>) =>
	REPORT_CATEGORIES.filter((category) => summary[category] > 0);

const getProjectTitle = (
	projectId: number,
	projects: ProjectFromList[],
	clients: ClientsWithPropjects[],
) => {
	const clientProject = clients
		.flatMap((client) => client.projects ?? [])
		.find(
			(project) =>
				Number(project.id) === projectId ||
				Number(project.projectId) === projectId,
		);

	if (clientProject?.title) {
		return clientProject.title;
	}

	const listProject = projects.find(
		(project) => Number(project.id) === projectId,
	);

	return listProject?.title || listProject?.name || `Проект #${projectId}`;
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
	selectedYear,
	getCurrentMonthName,
	isLoading,
	selectedUserId,
	userIds,
}: {
	monthDays: MonthDays[];
	selectedYear: number;
	getCurrentMonthName: () => string;
	isLoading?: boolean;
	selectedUserId?: string;
	userIds?: string[];
}) => {
	const [open, setOpen] = useState(false);
	const [activeReport, setActiveReports] = useState<GroupedReportFields[]>([]);
	const [activeDayTitle, setActiveDayTitle] = useState("");
	const [activeDeficits, setActiveDeficits] = useState<DayHourDeficit[]>([]);
	const [selectedProjectId, setSelectedProjectId] = useState("");
	const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
	const { projects, activities, clientsList, users } =
		useOutletContext<ReportsContext>();
	const { openTask } = useBitrixSlider();
	const scopeUsers = useMemo(
		() =>
			users.filter((user) =>
				selectedUserId
					? user.id === selectedUserId
					: userIds?.includes(user.id),
			),
		[users, userIds, selectedUserId],
	);
	const internalProjectIds = useMemo(
		() => getInternalProjectIds(projects, clientsList),
		[projects, clientsList],
	);
	const todayKey = getLocalCalendarDateKey(new Date());
	const calendarDays = useMemo(() => {
		const now = new Date(`${todayKey}T00:00:00`);
		return monthDays.map((day) => {
			const confirmedReports = day.confirmedReports ?? [];
			const reports = day.reports ?? [];
			const { deficits, summaryDeficits } = getCalendarDayHourDeficits({
				date: day.date,
				reports,
				users: scopeUsers,
				isPadding: !day.isCurrentMonth,
				now,
			});
			const dayState = getCalendarDayState({
				date: day.date,
				reports,
				activities,
				isPadding: !day.isCurrentMonth,
				hasHourDeficit: deficits.length > 0,
				now,
			});
			return {
				...day,
				reports,
				confirmedReports,
				deficits,
				summaryDeficits,
				dayState,
				canOpenDay:
					(dayState !== "blank" && reports.length > 0) ||
					summaryDeficits.length > 0,
				categorySummary: getReportCategorySummary(
					confirmedReports,
					activities,
					internalProjectIds,
				),
				dayTitle:
					dayState === "blank" || !day.date
						? undefined
						: `${formatCalendarDayTitle(day.date)}: ${CALENDAR_DAY_STATE_TITLES[dayState]}${deficits.length ? `. Сотрудников с недобором: ${deficits.length}` : ""}`,
			};
		});
	}, [monthDays, activities, internalProjectIds, scopeUsers, todayKey]);

	const projectFilterOptions = useMemo(() => {
		const projectIds = Array.from(
			new Set(
				activeReport
					.map((report) => Number(report.parentproject ?? report.project))
					.filter(Boolean),
			),
		);

		return projectIds
			.map((projectId) => ({
				id: String(projectId),
				title: getProjectTitle(projectId, projects, clientsList),
			}))
			.toSorted((a, b) => a.title.localeCompare(b.title, "ru"));
	}, [activeReport, clientsList, projects]);
	const employeeFilterOptions = useMemo(() => {
		const userIds = Array.from(
			new Set(activeReport.map((report) => String(report.assignedById))),
		);

		return userIds
			.map((userId) => {
				const user = users.find((item: User) => String(item.id) === userId);

				return {
					id: userId,
					title: user?.title ?? `Сотрудник #${userId}`,
				};
			})
			.toSorted((a, b) => a.title.localeCompare(b.title, "ru"));
	}, [activeReport, users]);
	const effectiveEmployeeId = selectedUserId || selectedEmployeeId;
	const filteredActiveReports = useMemo(() => {
		return activeReport.filter((report) => {
			const projectMatches =
				!selectedProjectId ||
				String(report.parentproject ?? report.project) === selectedProjectId;
			const employeeMatches =
				!effectiveEmployeeId ||
				String(report.assignedById) === effectiveEmployeeId;

			return projectMatches && employeeMatches;
		});
	}, [activeReport, effectiveEmployeeId, selectedProjectId]);
	const activeCategorySummary = getReportCategorySummary(
		filteredActiveReports,
		activities,
		internalProjectIds,
	);
	const selectedEmployeeTitle =
		selectedUserId &&
		(employeeFilterOptions.find((item) => item.id === selectedUserId)?.title ??
			users.find((item: User) => String(item.id) === selectedUserId)?.title);

	const resetModalFilters = () => {
		setSelectedProjectId("");
		setSelectedEmployeeId("");
	};

	return (
		<div className={cls.calendar}>
			<h2 className={cls["calendar-title"]}>
				{getCurrentMonthName()} {selectedYear}
			</h2>

			<div className={cls.categoryLegend} aria-label="Категории отчётов">
				{REPORT_CATEGORIES.map((category) => (
					<span key={category} className={cls[category]}>
						<i aria-hidden="true" />
						{REPORT_CATEGORY_TITLES[category]}
					</span>
				))}
			</div>

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
					{calendarDays.map((day) => {
						const {
							confirmedReports,
							categorySummary,
							deficits,
							summaryDeficits,
							dayState,
							canOpenDay,
							dayTitle,
						} = day;

						return (
							<div
								key={day.id}
								role={canOpenDay ? "button" : undefined}
								tabIndex={canOpenDay ? 0 : undefined}
								onKeyDown={(event) => {
									if (event.key === "Enter" || event.key === " ") {
										event.preventDefault();
										event.currentTarget.click();
									}
								}}
								className={classNames(cls["calendar-day"], {
									[cls.today]: day.isToday,
								})}
								data-state={dayState}
								data-deficit={deficits.length > 0}
								data-weekend={day.isWeekend && dayState !== "blank"}
								title={`${dayTitle ?? ""}${deficits.length ? `. ${describeDayHourDeficits(deficits)}` : ""}`}
								aria-label={dayTitle}
								onClick={() => {
									if (!canOpenDay) return;
									setActiveDeficits(summaryDeficits);

									resetModalFilters();
									setActiveReports(day.reports ?? []);
									setActiveDayTitle(
										day.date
											? formatCalendarFullDate(day.date)
											: "",
									);
									setOpen(true);
								}}
							>
								<div className={cls.dayTopline}>
									<div className={cls["day-number"]}>{day.dayNumber}</div>
									{!!day.totalHours && (
										<div className={cls.dayHours}>
											{formatHours(day.totalHours)}
										</div>
									)}
								</div>
								<div className={cls["day-name"]}>{day.dayName}</div>
								{(dayState === "missing" || dayState === "absence") && (
									<div className={cls.dayStatus}>
										{CALENDAR_DAY_STATE_TITLES[dayState]}
									</div>
								)}
								<DayHoursWarning
									deficits={deficits}
									isIndividual={!!selectedUserId}
								/>
								{!!day.totalHours && (
									<div className={cls.dayReportMeta}>
										<span>{confirmedReports.length} отчетов</span>
									</div>
								)}
								{!!day.totalHours && (
									<div className={cls.categoryBadges}>
										{getVisibleCategories(categorySummary).map((category) => (
											<span
												key={category}
												className={`${cls.categoryBadge} ${cls[category]}`}
												title={`${REPORT_CATEGORY_TITLES[category]}: ${formatHours(categorySummary[category])}`}
											>
												{Number(categorySummary[category].toFixed(1))}
											</span>
										))}
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
						{REPORT_CATEGORIES.map((category) => (
							<div
								key={category}
								className={`${cls.dayModalWidget} ${cls[category]}`}
							>
								<span>{REPORT_CATEGORY_TITLES[category]}</span>
								<strong>{formatHours(activeCategorySummary[category])}</strong>
							</div>
						))}
					</div>
				</div>
				<DayHoursSummary deficits={activeDeficits} />
				<div className={cls.dayModalFilters}>
					<select
						value={selectedProjectId}
						onChange={(event) => setSelectedProjectId(event.target.value)}
					>
						<option value="">Все проекты</option>
						{projectFilterOptions.map((project) => (
							<option key={project.id} value={project.id}>
								{project.title}
							</option>
						))}
					</select>

					{selectedUserId ? (
						<div className={cls.fixedFilter}>
							{selectedEmployeeTitle ?? "Выбранный сотрудник"}
						</div>
					) : (
						<select
							value={selectedEmployeeId}
							onChange={(event) => setSelectedEmployeeId(event.target.value)}
						>
							<option value="">Все сотрудники</option>
							{employeeFilterOptions.map((employee) => (
								<option key={employee.id} value={employee.id}>
									{employee.title}
								</option>
							))}
						</select>
					)}

					{(selectedProjectId || selectedEmployeeId) && (
						<button type="button" onClick={resetModalFilters}>
							Сбросить
						</button>
					)}
				</div>
				<div className={cls.dayReportsList}>
					{filteredActiveReports.map((report) => (
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
					{!filteredActiveReports.length && (
						<p className={cls.emptyReports}>
							Нет отчётов по выбранным фильтрам
						</p>
					)}
				</div>
				<div className={cls.dayModalTotal}>
					Всего:{" "}
					{formatHours(
						filteredActiveReports.reduce(
							(sum, report) => sum + parseTimeSpent(report.timeSpent),
							0,
						),
					)}
				</div>
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
