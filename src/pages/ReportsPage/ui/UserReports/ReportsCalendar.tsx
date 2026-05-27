import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router";
import { ClientsCodes } from "@/shared/constants/const";
import { Calendar } from "../../../../components/calendar/Calendar";
import {
	months,
	ProjectCodes,
	years,
} from "../../../../components/calendar/constants/const";
import {
	getPaymentKindFromReport,
	getPaymentSortFromReport,
	getPaymentSummary,
	PAYMENT_KIND_BY_SORT,
	PAYMENT_SORT_TITLES,
	type PaymentSort,
} from "../../../../components/calendar/helpers/paymentType";
import {
	DEPARTMENT_IDS,
	EntityTypeIds,
} from "../../../../shared/constants/const";
import { useBitrixSlider } from "../../../../shared/hooks/useBitrixSlider";
import type { GroupedReportFields } from "../../../../shared/types/table";
import type {
	ClientListItems,
	ClientProjectProps,
	ReportsContext,
	User,
} from "../../../../shared/types/types";
import type { ProjectFromList } from "../../ReportsPage";
import type {
	ActivityListItem,
	ActivitySort,
	GroupedClientItem,
} from "../../types/types";
import cls from "./ReportsCalendar.module.scss";
import { ProjectActivitiesTree } from "./ui/ProjectActivitiesTree/ProjectActivitiesTree";

const ACTIVITY_SORT_TITLES = PAYMENT_SORT_TITLES;

const parseTimeSpent = (value: string | number | null | undefined): number => {
	if (value == null) return 0;

	const normalized = String(value).replace(",", ".").trim();
	const parsed = Number(normalized);

	return Number.isNaN(parsed) ? 0 : parsed;
};

const formatHours = (value: number) => `${Number(value.toFixed(1))} ч`;

const getProjectCompanyId = (project: ClientProjectProps) => {
	return Number(project[ProjectCodes.company] ?? 0);
};

export const groupReportsByClientsProjectsAndActivities = ({
	reports,
	projects,
	activities,
	clients,
}: {
	reports: GroupedReportFields[];
	projects: ProjectFromList[];
	activities: ActivityListItem[];
	clients: (ClientListItems & { projects: ClientProjectProps[] })[];
}): GroupedClientItem[] => {
	const projectTitleMap = new Map<number, string>();
	for (const project of projects) {
		const projectTitle =
			project.title || project.name || `Проект #${project.id}`;

		projectTitleMap.set(Number(project.id), projectTitle);
		projectTitleMap.set(Number(project[ClientsCodes.client]), projectTitle);
	}

	const clientTitleMap = new Map<number, string>();
	for (const client of clients) {
		clientTitleMap.set(Number(client.ID), client.NAME);

		for (const project of client.projects ?? []) {
			projectTitleMap.set(Number(project.id), project.title);

			if (project.projectId) {
				projectTitleMap.set(Number(project.projectId), project.title);
			}

			const companyId = getProjectCompanyId(project);

			if (companyId) {
				clientTitleMap.set(companyId, client.NAME);
			}
		}
	}

	const resultMap = new Map<number, GroupedClientItem>();

	for (const report of reports) {
		const clientId = Number(report.company ?? report.client);
		const projectId = Number(report.parentproject ?? report.project);
		const sort = getPaymentSortFromReport(report, activities);

		if (!clientId || !projectId || sort === null) continue;

		const timeSpent = parseTimeSpent(report.timeSpent);

		if (!resultMap.has(clientId)) {
			resultMap.set(clientId, {
				clientId,
				clientTitle: clientTitleMap.get(clientId) ?? `Компания #${clientId}`,
				timeSpent: 0,
				projects: [],
			});
		}

		const clientGroup = resultMap.get(clientId)!;

		let projectGroup = clientGroup.projects.find(
			(item) => item.projectId === projectId,
		);

		if (!projectGroup) {
			projectGroup = {
				projectId,
				projectTitle: projectTitleMap.get(projectId) ?? `Проект #${projectId}`,
				timeSpent: 0,
				categories: {
					0: {
						sort: 0,
						title: ACTIVITY_SORT_TITLES[0],
						timeSpent: 0,
						activities: [],
					},
					1: {
						sort: 1,
						title: ACTIVITY_SORT_TITLES[1],
						timeSpent: 0,
						activities: [],
					},
					2: {
						sort: 2,
						title: ACTIVITY_SORT_TITLES[2],
						timeSpent: 0,
						activities: [],
					},
				},
			};

			clientGroup.projects.push(projectGroup);
		}

		const category = projectGroup.categories[sort];
		const activityId = Number(report.activity);
		const activityTitle =
			activities.find((activity) => Number(activity.ID) === activityId)?.NAME ??
			`Активность #${activityId}`;

		let activityGroup = category.activities.find(
			(item) => item.activityId === activityId,
		);

		if (!activityGroup) {
			activityGroup = {
				activityId,
				activityTitle,
				sort,
				timeSpent: 0,
				reports: [],
			};

			category.activities.push(activityGroup);
		}

		activityGroup.timeSpent += timeSpent;
		activityGroup.reports.push({
			id: report.id,
			title: report.title,
			begindate: report.day,
			timeSpent,
			rawTimeSpent: report.timeSpent,
			taskId: report.taskId,
			parentId: report.parentId,
		});

		category.timeSpent += timeSpent;
		projectGroup.timeSpent += timeSpent;
		clientGroup.timeSpent += timeSpent;
	}

	return Array.from(resultMap.values())
		.map((client) => ({
			...client,
			projects: client.projects
				.map((project) => ({
					...project,
					categories: {
						0: {
							...project.categories[0],
							activities: [...project.categories[0].activities]
								.map((activity) => ({
									...activity,
									reports: [...activity.reports].sort(
										(a, b) =>
											new Date(b.begindate).getTime() -
											new Date(a.begindate).getTime(),
									),
								}))
								.sort((a, b) => b.timeSpent - a.timeSpent),
						},
						1: {
							...project.categories[1],
							activities: [...project.categories[1].activities]
								.map((activity) => ({
									...activity,
									reports: [...activity.reports].sort(
										(a, b) =>
											new Date(b.begindate).getTime() -
											new Date(a.begindate).getTime(),
									),
								}))
								.sort((a, b) => b.timeSpent - a.timeSpent),
						},
						2: {
							...project.categories[2],
							activities: [...project.categories[2].activities]
								.map((activity) => ({
									...activity,
									reports: [...activity.reports].sort(
										(a, b) =>
											new Date(b.begindate).getTime() -
											new Date(a.begindate).getTime(),
									),
								}))
								.sort((a, b) => b.timeSpent - a.timeSpent),
						},
					},
				}))
				.sort((a, b) => b.timeSpent - a.timeSpent),
		}))
		.sort((a, b) => b.timeSpent - a.timeSpent);
};

type ViewCalendar = "month" | "week";

const getProjectKey = (clientId: number, projectId: number) =>
	`${clientId}-${projectId}`;

const getDepartmentUsers = (users: User[]) => {
	const filtered = users.filter((user) =>
		[DEPARTMENT_IDS.ANALYTICS, DEPARTMENT_IDS.DEV].includes(user.department),
	);

	return filtered.length ? filtered : users;
};

const PanelSkeleton = ({
	rows,
	variant,
}: {
	rows: number;
	variant: "employee" | "project" | "report";
}) => (
	<div className={cls.skeletonList} data-variant={variant}>
		{Array.from({ length: rows }, (_, index) => (
			<div key={index} className={cls.skeletonCard}>
				{variant === "employee" && <span className={cls.skeletonAvatar} />}
				<div className={cls.skeletonContent}>
					<span className={cls.skeletonLine} />
					<span className={cls.skeletonLineShort} />
					{variant === "project" && (
						<div className={cls.skeletonPills}>
							<span />
							<span />
							<span />
						</div>
					)}
				</div>
				<span className={cls.skeletonValue} />
			</div>
		))}
	</div>
);

const ReportsCalendar = () => {
	const context = useOutletContext<ReportsContext>();
	const { openTask } = useBitrixSlider();
	const [view, setView] = useState<ViewCalendar>("month");
	const [isCalendarVisible, setIsCalendarVisible] = useState(true);
	const [selectedUserId, setSelectedUserId] = useState("");
	const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
	const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
	const [groupedByActivity, setGroupByActivity] = useState<
		GroupedReportFields[]
	>([]);
	const [isReportDataLoading, setIsReportDataLoading] = useState(false);
	const [expandedClients, setExpandedClients] = useState<Set<number>>(
		() => new Set(),
	);
	const [selectedProjectKey, setSelectedProjectKey] = useState("");

	const departmentUsers = useMemo(
		() => getDepartmentUsers(context.users),
		[context.users],
	);
	const selectedUser = departmentUsers.find(
		(user) => user.id === selectedUserId,
	);
	const departmentUserIds = useMemo(
		() => departmentUsers.map((user) => user.id),
		[departmentUsers],
	);

	const handleUserChange = (userId: string) => {
		setSelectedUserId(userId);
		context.setUser(userId);
	};

	const handleCalendarToggle = () => {
		setIsCalendarVisible((prev) => {
			const next = !prev;

			if (!next) {
				handleUserChange("");
			}

			return next;
		});
	};

	const handleMonthChange = (event: ChangeEvent<HTMLSelectElement>) => {
		setSelectedMonth(Number(event.target.value));
	};

	const handleYearChange = (event: ChangeEvent<HTMLSelectElement>) => {
		setSelectedYear(Number(event.target.value));
	};

	const handlePrevMonth = () => {
		if (selectedMonth === 0) {
			setSelectedMonth(11);
			setSelectedYear((year) => year - 1);
			return;
		}

		setSelectedMonth((month) => month - 1);
	};

	const handleNextMonth = () => {
		if (selectedMonth === 11) {
			setSelectedMonth(0);
			setSelectedYear((year) => year + 1);
			return;
		}

		setSelectedMonth((month) => month + 1);
	};

	const handleToday = () => {
		const today = new Date();

		setSelectedMonth(today.getMonth());
		setSelectedYear(today.getFullYear());
	};

	const groupedClientActivities = useMemo(() => {
		return groupReportsByClientsProjectsAndActivities({
			reports: groupedByActivity,
			projects: context.projects,
			activities: context.activities,
			clients: context.clientsList,
		});
	}, [
		context.activities,
		context.projects,
		groupedByActivity,
		context.clientsList,
	]);

	const firstProjectKey = groupedClientActivities[0]?.projects[0]
		? getProjectKey(
				groupedClientActivities[0].clientId,
				groupedClientActivities[0].projects[0].projectId,
			)
		: "";

	useEffect(() => {
		if (!firstProjectKey) {
			setSelectedProjectKey("");
			return;
		}

		const hasSelectedProject = groupedClientActivities.some((client) =>
			client.projects.some(
				(project) =>
					getProjectKey(client.clientId, project.projectId) ===
					selectedProjectKey,
			),
		);

		if (!hasSelectedProject) {
			setSelectedProjectKey(firstProjectKey);
		}
	}, [firstProjectKey, groupedClientActivities, selectedProjectKey]);

	const selectedClientProject = useMemo(() => {
		for (const client of groupedClientActivities) {
			const project = client.projects.find(
				(project) =>
					getProjectKey(client.clientId, project.projectId) ===
					selectedProjectKey,
			);

			if (project) {
				return { client, project };
			}
		}

		return null;
	}, [groupedClientActivities, selectedProjectKey]);

	const selectedProjectReports = useMemo(() => {
		if (!selectedClientProject) return [];

		return groupedByActivity
			.filter((report) => {
				const clientId = Number(report.company ?? report.client);
				const projectId = Number(report.parentproject ?? report.project);

				return (
					clientId === selectedClientProject.client.clientId &&
					projectId === selectedClientProject.project.projectId
				);
			})
			.toSorted(
				(a, b) => new Date(b.day).getTime() - new Date(a.day).getTime(),
			);
	}, [groupedByActivity, selectedClientProject]);

	const employeeHours = useMemo(() => {
		const map = new Map<string, number>();

		for (const report of groupedByActivity) {
			const userId = String(report.assignedById);
			map.set(
				userId,
				(map.get(userId) ?? 0) + parseTimeSpent(report.timeSpent),
			);
		}

		return map;
	}, [groupedByActivity]);

	const paymentSummary = getPaymentSummary(
		groupedByActivity,
		context.activities,
	);
	const totalHours = groupedByActivity.reduce(
		(acc, report) => acc + parseTimeSpent(report.timeSpent),
		0,
	);

	const getActivityTitle = (activityId: number) =>
		context.activities.find((activity) => Number(activity.ID) === activityId)
			?.NAME ?? `Активность #${activityId}`;

	const getEmployeeTitle = (userId: string | number) =>
		context.users.find((user) => String(user.id) === String(userId))?.title ??
		`Сотрудник #${userId}`;

	const renderPeriodControls = () => (
		<div className={cls.periodControls}>
			<button
				type="button"
				className={cls.iconButton}
				onClick={handlePrevMonth}
			>
				‹
			</button>
			<select value={selectedMonth} onChange={handleMonthChange}>
				{months.map((month, index) => (
					<option key={month} value={index}>
						{month}
					</option>
				))}
			</select>
			<select value={selectedYear} onChange={handleYearChange}>
				{years.map((year) => (
					<option key={year} value={year}>
						{year}
					</option>
				))}
			</select>
			<button
				type="button"
				className={cls.iconButton}
				onClick={handleNextMonth}
			>
				›
			</button>
			{isCalendarVisible && (
				<button type="button" className={cls.todayButton} onClick={handleToday}>
					Сегодня
				</button>
			)}
		</div>
	);

	const renderEmployees = () => (
		<section className={cls.panel}>
			<div className={cls.panelHeader}>
				<h3>Сотрудники</h3>
				<span>{formatHours(totalHours)}</span>
			</div>
			<div className={cls.employeeList}>
				{!isCalendarVisible && isReportDataLoading ? (
					<PanelSkeleton rows={7} variant="employee" />
				) : (
					<>
						<button
							type="button"
							className={`${cls.employeeCard} ${
								selectedUserId === "" ? cls.activeCard : ""
							}`}
							onClick={() => handleUserChange("")}
						>
							<span className={cls.avatar}>▦</span>
							<span className={cls.employeeInfo}>
								<strong>Весь отдел</strong>
								<small>Все сотрудники</small>
							</span>
							<span className={cls.hoursPill}>{formatHours(totalHours)}</span>
						</button>
						{departmentUsers.map((user) => (
							<button
								type="button"
								key={user.id}
								className={`${cls.employeeCard} ${
									selectedUserId === user.id ? cls.activeCard : ""
								}`}
								onClick={() => handleUserChange(user.id)}
							>
								{user.photo ? (
									<img src={user.photo} alt="" className={cls.avatarImage} />
								) : (
									<span className={cls.avatar}>{user.title.charAt(0)}</span>
								)}
								<span className={cls.employeeInfo}>
									<strong>{user.title}</strong>
									<small>месяц</small>
								</span>
								<span className={cls.hoursPill}>
									{formatHours(employeeHours.get(user.id) ?? 0)}
								</span>
							</button>
						))}
					</>
				)}
			</div>
		</section>
	);

	const renderSummary = () => (
		<section className={cls.summaryCard}>
			<h3>{selectedUser?.title ?? "Весь отдел"}</h3>
			<div className={cls.summarySubtitle}>Сводка по выбранному периоду</div>
			<div className={cls.summaryGrid}>
				{([0, 1, 2] as PaymentSort[]).map((sort) => {
					const kind = PAYMENT_KIND_BY_SORT[sort];

					return (
						<div key={sort} className={`${cls.summaryItem} ${cls[kind]}`}>
							<span>{PAYMENT_SORT_TITLES[sort]}</span>
							<strong>{formatHours(paymentSummary[sort])}</strong>
						</div>
					);
				})}
			</div>
		</section>
	);

	const toggleClient = (clientId: number) => {
		setExpandedClients((prev) => {
			const next = new Set(prev);

			if (next.has(clientId)) {
				next.delete(clientId);
			} else {
				next.add(clientId);
			}

			return next;
		});
	};

	const renderProjectCards = () => (
		<section className={`${cls.panel} ${cls.projectsPanel}`}>
			<div className={cls.panelHeader}>
				<h3>Клиенты и проекты</h3>
				<span>{groupedClientActivities.length}</span>
			</div>
			<div className={cls.projectCards}>
				{isReportDataLoading ? (
					<PanelSkeleton rows={6} variant="project" />
				) : (
					groupedClientActivities.map((client) => {
						const isExpanded = expandedClients.has(client.clientId);
						const firstProject = client.projects[0];
						const clientSummary = client.projects.reduce(
							(acc, project) => {
								([0, 1, 2] as ActivitySort[]).forEach((sort) => {
									acc[sort] += project.categories[sort].timeSpent;
								});

								return acc;
							},
							{ 0: 0, 1: 0, 2: 0 } as Record<ActivitySort, number>,
						);

						return (
							<div key={client.clientId} className={cls.clientBlock}>
								<button
									type="button"
									className={`${cls.clientCard} ${
										firstProject &&
										selectedProjectKey ===
											getProjectKey(client.clientId, firstProject.projectId)
											? cls.activeCard
											: ""
									}`}
									onClick={() => {
										if (firstProject) {
											setSelectedProjectKey(
												getProjectKey(client.clientId, firstProject.projectId),
											);
										}
										toggleClient(client.clientId);
									}}
								>
									<div>
										<div className={cls.clientTitle}>
											› {client.clientTitle}
										</div>
										<div className={cls.clientMeta}>
											{client.projects.length} проектов
										</div>
										<div className={cls.clientPills}>
											{([0, 1, 2] as ActivitySort[]).map((sort) => {
												const kind = PAYMENT_KIND_BY_SORT[sort];

												return (
													<span key={sort} className={cls[kind]}>
														{PAYMENT_SORT_TITLES[sort].replace(" paid", "")}{" "}
														{Number(clientSummary[sort].toFixed(1))}
													</span>
												);
											})}
										</div>
									</div>
									<span className={cls.clientTotal}>
										{formatHours(client.timeSpent)}
									</span>
								</button>
								{isExpanded && (
									<div className={cls.projectList}>
										{client.projects.map((project) => (
											<button
												type="button"
												key={project.projectId}
												className={`${cls.projectButton} ${
													selectedProjectKey ===
													getProjectKey(client.clientId, project.projectId)
														? cls.activeCard
														: ""
												}`}
												onClick={() =>
													setSelectedProjectKey(
														getProjectKey(client.clientId, project.projectId),
													)
												}
											>
												<span>{project.projectTitle}</span>
												<strong>{formatHours(project.timeSpent)}</strong>
											</button>
										))}
									</div>
								)}
							</div>
						);
					})
				)}
				{!isReportDataLoading && !groupedClientActivities.length && (
					<div className={cls.emptyState}>Нет данных за выбранный период</div>
				)}
			</div>
		</section>
	);

	const renderReportsPanel = () => (
		<section className={`${cls.panel} ${cls.reportsPanel}`}>
			<div className={cls.panelHeader}>
				<h3>
					Отчеты: {selectedClientProject?.client.clientTitle ?? "клиент"} -{" "}
					{selectedClientProject?.project.projectTitle ?? "проект"}
				</h3>
				<span>{selectedProjectReports.length}</span>
			</div>
			<div className={cls.reportList}>
				{isReportDataLoading ? (
					<PanelSkeleton rows={8} variant="report" />
				) : (
					selectedProjectReports.map((report) => {
						const paymentKind = getPaymentKindFromReport(
							report,
							context.activities,
						);

						return (
							<button
								type="button"
								key={report.id}
								className={cls.reportRow}
								onClick={() => openTask(report.id, EntityTypeIds.reports)}
							>
								<div className={cls.reportMain}>
									<strong>{report.title}</strong>
									<small>
										{getEmployeeTitle(report.assignedById)} ·{" "}
										{new Date(report.day).toLocaleDateString("ru-RU")}
									</small>
								</div>
								<span className={cls.activityBadge}>
									{getActivityTitle(Number(report.activity))}
								</span>
								<span
									className={`${cls.paymentLabel} ${
										paymentKind ? cls[paymentKind] : ""
									}`}
								>
									{paymentKind
										? PAYMENT_SORT_TITLES[
												getPaymentSortFromReport(report, context.activities) ??
													0
											]
										: "Без типа"}
								</span>
								<strong className={cls.reportHours}>
									{formatHours(parseTimeSpent(report.timeSpent))}
								</strong>
							</button>
						);
					})
				)}
				{!isReportDataLoading && !selectedProjectReports.length && (
					<div className={cls.emptyState}>Выберите клиента или проект</div>
				)}
			</div>
		</section>
	);

	return (
		<div className={cls.page}>
			<div className={cls.shell}>
				<header className={cls.toolbar}>
					<div className={cls.leftTools}>
						<button type="button" className={cls.backButton}>
							←
						</button>
						<button
							type="button"
							className={cls.toggleButton}
							onClick={handleCalendarToggle}
						>
							{isCalendarVisible ? "Скрыть календарь" : "Показать календарь"}
						</button>
					</div>
					<div className={cls.rightTools}>
						<div className={cls.viewTabs}>
							<button
								type="button"
								className={view === "month" ? cls.activeTab : ""}
								onClick={() => setView("month")}
							>
								Месяц
							</button>
							<button
								type="button"
								className={view === "week" ? cls.activeTab : ""}
								onClick={() => setView("week")}
							>
								Неделя
							</button>
						</div>
						{!isCalendarVisible && renderPeriodControls()}
					</div>
				</header>

				{isCalendarVisible ? (
					<div className={cls.calendarLayout}>
						<aside className={cls.sidebar}>
							{renderEmployees()}
							<section className={cls.clientsTree}>
								<div className={cls.treeTitle}>Клиенты</div>
								<ProjectActivitiesTree data={groupedClientActivities} />
							</section>
							{renderSummary()}
						</aside>
						<main className={cls.calendarArea}>
							<div className={cls.calendarScope}>
								<span>{selectedUser?.title ?? "Весь отдел"}</span>
							</div>
							<Calendar
								view={view}
								userId={selectedUserId}
								userIds={departmentUserIds}
								setGroupByActivity={setGroupByActivity}
								selectedMonth={selectedMonth}
								selectedYear={selectedYear}
								handleMonthChange={handleMonthChange}
								handleYearChange={handleYearChange}
								handlePrevMonth={handlePrevMonth}
								handleNextMonth={handleNextMonth}
								handleToday={handleToday}
								onLoadingChange={setIsReportDataLoading}
							/>
						</main>
					</div>
				) : (
					<>
						<Calendar
							view={view}
							userId={selectedUserId}
							userIds={departmentUserIds}
							isVisible={false}
							setGroupByActivity={setGroupByActivity}
							selectedMonth={selectedMonth}
							selectedYear={selectedYear}
							handleMonthChange={handleMonthChange}
							handleYearChange={handleYearChange}
							handlePrevMonth={handlePrevMonth}
							handleNextMonth={handleNextMonth}
							handleToday={handleToday}
							onLoadingChange={setIsReportDataLoading}
						/>
						<div className={cls.hiddenCalendarLayout}>
							{renderEmployees()}
							{renderProjectCards()}
							{renderReportsPanel()}
						</div>
					</>
				)}
			</div>
		</div>
	);
};

export default ReportsCalendar;
