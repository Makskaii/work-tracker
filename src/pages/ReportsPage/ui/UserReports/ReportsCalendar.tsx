import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { useOutletContext } from "react-router";
import { Calendar } from "../../../../components/calendar/Calendar";
import { getPaymentSummary } from "../../../../components/calendar/helpers/paymentType";
import { EntityTypeIds } from "../../../../shared/constants/const";
import { useBitrixSlider } from "../../../../shared/hooks/useBitrixSlider";
import type { GroupedReportFields } from "../../../../shared/types/table";
import type { ReportsContext } from "../../../../shared/types/types";
import { fetchCompanyTitlesByIds } from "./model/companyTitles";
import { getEmployeeMetricsFromReports } from "./model/employeeMetrics";
import {
	buildClientTitleMap,
	groupReportsByClientsProjectsAndActivities,
} from "./model/groupReports";
import type { EmployeeMetrics, ViewCalendar } from "./model/types";
import {
	createEmptyEmployeeMetrics,
	getCapacityByView,
	getDepartmentUsers,
	getProjectKey,
	parseTimeSpent,
} from "./model/utils";
import cls from "./ReportsCalendar.module.scss";
import { EmployeesPanel } from "./ui/EmployeesPanel";
import { PeriodControls } from "./ui/PeriodControls";
import { ProjectActivitiesTree } from "./ui/ProjectActivitiesTree/ProjectActivitiesTree";
import { ProjectCardsPanel } from "./ui/ProjectCardsPanel";
import { ReportsPanel } from "./ui/ReportsPanel";
import { SummaryCard } from "./ui/SummaryCard";

const ReportsCalendar = () => {
	const context = useOutletContext<ReportsContext>();
	const { openTask } = useBitrixSlider();
	const [view, setView] = useState<ViewCalendar>("month");
	const [isCalendarVisible, setIsCalendarVisible] = useState(true);
	const [isEmployeeSidebarCollapsed, setIsEmployeeSidebarCollapsed] =
		useState(false);
	const [selectedUserId, setSelectedUserId] = useState("");
	const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
	const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
	const [groupedByActivity, setGroupByActivity] = useState<
		GroupedReportFields[]
	>([]);
	const [isReportDataLoading, setIsReportDataLoading] = useState(false);
	const [employeeMetrics, setEmployeeMetrics] = useState<EmployeeMetrics>(
		createEmptyEmployeeMetrics,
	);
	const [expandedClients, setExpandedClients] = useState<Set<number>>(
		() => new Set(),
	);
	const [selectedProjectKey, setSelectedProjectKey] = useState("");
	const [reportCompanyTitleById, setReportCompanyTitleById] = useState<
		Map<number, string>
	>(() => new Map());
	const requestedCompanyIdsRef = useRef<Set<number>>(new Set());

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
				setIsEmployeeSidebarCollapsed(false);
				handleUserChange("");
			}

			return next;
		});
	};

	const handleMonthChange = (event: ChangeEvent<HTMLSelectElement>) => {
		setEmployeeMetrics(createEmptyEmployeeMetrics());
		setSelectedMonth(Number(event.target.value));
	};

	const handleYearChange = (event: ChangeEvent<HTMLSelectElement>) => {
		setEmployeeMetrics(createEmptyEmployeeMetrics());
		setSelectedYear(Number(event.target.value));
	};

	const handlePrevMonth = () => {
		setEmployeeMetrics(createEmptyEmployeeMetrics());

		if (selectedMonth === 0) {
			setSelectedMonth(11);
			setSelectedYear((year) => year - 1);
			return;
		}

		setSelectedMonth((month) => month - 1);
	};

	const handleNextMonth = () => {
		setEmployeeMetrics(createEmptyEmployeeMetrics());

		if (selectedMonth === 11) {
			setSelectedMonth(0);
			setSelectedYear((year) => year + 1);
			return;
		}

		setSelectedMonth((month) => month + 1);
	};

	const handleToday = () => {
		const today = new Date();

		setEmployeeMetrics(createEmptyEmployeeMetrics());
		setSelectedMonth(today.getMonth());
		setSelectedYear(today.getFullYear());
	};

	useEffect(() => {
		const clientTitleMap = buildClientTitleMap(context.clientsList);
		const missingCompanyIds = Array.from(
			new Set(
				groupedByActivity
					.map((report) => Number(report.company ?? report.client))
					.filter(
						(companyId) =>
							companyId &&
							!clientTitleMap.has(companyId) &&
							!reportCompanyTitleById.has(companyId) &&
							!requestedCompanyIdsRef.current.has(companyId),
					),
			),
		);

		if (!missingCompanyIds.length) return;

		let isCancelled = false;
		let shouldRetryOnCleanup = true;

		for (const companyId of missingCompanyIds) {
			requestedCompanyIdsRef.current.add(companyId);
		}

		fetchCompanyTitlesByIds(missingCompanyIds)
			.then((companyTitleMap) => {
				if (isCancelled || !companyTitleMap.size) return;

				shouldRetryOnCleanup = false;

				setReportCompanyTitleById((prev) => {
					const next = new Map(prev);

					for (const [companyId, title] of companyTitleMap) {
						next.set(companyId, title);
					}

					return next;
				});
			})
			.catch((error) => {
				shouldRetryOnCleanup = false;

				for (const companyId of missingCompanyIds) {
					requestedCompanyIdsRef.current.delete(companyId);
				}

				console.error("Failed to fetch report companies", error);
			});

		return () => {
			isCancelled = true;

			if (shouldRetryOnCleanup) {
				for (const companyId of missingCompanyIds) {
					requestedCompanyIdsRef.current.delete(companyId);
				}
			}
		};
	}, [context.clientsList, groupedByActivity, reportCompanyTitleById]);

	const groupedClientActivities = useMemo(() => {
		return groupReportsByClientsProjectsAndActivities({
			reports: groupedByActivity,
			projects: context.projects,
			activities: context.activities,
			clients: context.clientsList,
			companyTitleById: reportCompanyTitleById,
		});
	}, [
		context.activities,
		context.projects,
		groupedByActivity,
		context.clientsList,
		reportCompanyTitleById,
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

	const currentEmployeeMetrics = useMemo(
		() => getEmployeeMetricsFromReports(groupedByActivity, context.activities),
		[groupedByActivity, context.activities],
	);

	useEffect(() => {
		if (isReportDataLoading) return;
		if (!groupedByActivity.length && employeeMetrics.hasLoaded) return;

		if (!selectedUserId) {
			setEmployeeMetrics(currentEmployeeMetrics);
			return;
		}

		setEmployeeMetrics((prev) => {
			const hours = new Map(prev.hours);
			const notAtWork = new Map(prev.notAtWork);
			const previousUserHours = hours.get(selectedUserId) ?? 0;
			const nextUserHours =
				currentEmployeeMetrics.hours.get(selectedUserId) ?? 0;
			const nextTotalHours =
				prev.hasLoaded && prev.totalHours
					? prev.totalHours - previousUserHours + nextUserHours
					: currentEmployeeMetrics.totalHours;

			hours.set(selectedUserId, nextUserHours);
			notAtWork.set(
				selectedUserId,
				currentEmployeeMetrics.notAtWork.get(selectedUserId) ?? 0,
			);

			return {
				hours,
				notAtWork,
				totalHours: nextTotalHours,
				hasLoaded: prev.hasLoaded || currentEmployeeMetrics.hasLoaded,
			};
		});
	}, [
		currentEmployeeMetrics,
		employeeMetrics.hasLoaded,
		groupedByActivity.length,
		isReportDataLoading,
		selectedUserId,
	]);

	const paymentSummary = getPaymentSummary(
		groupedByActivity,
		context.activities,
	);
	const totalHours = groupedByActivity.reduce(
		(acc, report) => acc + parseTimeSpent(report.timeSpent),
		0,
	);
	const periodCapacity = getCapacityByView(view);
	const totalCapacity = periodCapacity * departmentUsers.length;
	const employeeMetricsLoading =
		isReportDataLoading && !employeeMetrics.hasLoaded;
	const sidebarTotalHours = employeeMetrics.hasLoaded
		? employeeMetrics.totalHours
		: totalHours;
	const selectedUserNotAtWork = selectedUserId
		? (employeeMetrics.notAtWork.get(selectedUserId) ?? 0)
		: 0;
	const isEmployeeSidebarCompact =
		isCalendarVisible && isEmployeeSidebarCollapsed;
	const employeesPanel = (
		<EmployeesPanel
			users={departmentUsers}
			view={view}
			selectedUserId={selectedUserId}
			employeeMetrics={employeeMetrics}
			isCompact={isEmployeeSidebarCompact}
			isCalendarVisible={isCalendarVisible}
			isReportDataLoading={isReportDataLoading}
			isMetricsLoading={employeeMetricsLoading}
			sidebarTotalHours={sidebarTotalHours}
			totalCapacity={totalCapacity}
			periodCapacity={periodCapacity}
			onUserChange={handleUserChange}
		/>
	);

	const getActivityTitle = (activityId: number) =>
		context.activities.find((activity) => Number(activity.ID) === activityId)
			?.NAME ?? `Активность #${activityId}`;

	const getEmployeeTitle = (userId: string | number) =>
		context.users.find((user) => String(user.id) === String(userId))?.title ??
		`Сотрудник #${userId}`;

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

	return (
		<div className={cls.page}>
			<div className={cls.shell}>
				<header className={cls.toolbar}>
					<div className={cls.leftTools}>
						<button
							type="button"
							className={`${cls.backButton} ${
								isEmployeeSidebarCollapsed ? cls.backButtonActive : ""
							}`}
							onClick={() => setIsEmployeeSidebarCollapsed((prev) => !prev)}
							aria-label={
								isEmployeeSidebarCollapsed
									? "Развернуть список сотрудников"
									: "Свернуть список сотрудников"
							}
							aria-pressed={isEmployeeSidebarCollapsed}
							disabled={!isCalendarVisible}
						>
							{isEmployeeSidebarCollapsed ? "→" : "←"}
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
								onClick={() => {
									setEmployeeMetrics(createEmptyEmployeeMetrics());
									setView("month");
								}}
							>
								Месяц
							</button>
							<button
								type="button"
								className={view === "week" ? cls.activeTab : ""}
								onClick={() => {
									setEmployeeMetrics(createEmptyEmployeeMetrics());
									setView("week");
								}}
							>
								Неделя
							</button>
						</div>
						{!isCalendarVisible && (
							<PeriodControls
								selectedMonth={selectedMonth}
								selectedYear={selectedYear}
								showToday={isCalendarVisible}
								onMonthChange={handleMonthChange}
								onYearChange={handleYearChange}
								onPrevMonth={handlePrevMonth}
								onNextMonth={handleNextMonth}
								onToday={handleToday}
							/>
						)}
					</div>
				</header>

				{isCalendarVisible ? (
					<div
						className={`${cls.calendarLayout} ${
							isEmployeeSidebarCollapsed ? cls.calendarLayoutCollapsed : ""
						}`}
					>
						<aside
							className={`${cls.sidebar} ${
								isEmployeeSidebarCollapsed ? cls.sidebarCollapsed : ""
							}`}
						>
							{employeesPanel}
							{!isEmployeeSidebarCollapsed && (
								<>
									<section className={cls.clientsTree}>
										<div className={cls.treeTitle}>Клиенты</div>
										<ProjectActivitiesTree data={groupedClientActivities} />
									</section>
									<SummaryCard
										title={selectedUser?.title ?? "Весь отдел"}
										paymentSummary={paymentSummary}
										showNotAtWork={Boolean(selectedUserId)}
										notAtWorkHours={selectedUserNotAtWork}
									/>
								</>
							)}
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
							{employeesPanel}
							<ProjectCardsPanel
								clients={groupedClientActivities}
								expandedClients={expandedClients}
								selectedProjectKey={selectedProjectKey}
								isLoading={isReportDataLoading}
								onToggleClient={toggleClient}
								onSelectProject={setSelectedProjectKey}
							/>
							<ReportsPanel
								selectedClientProject={selectedClientProject}
								reports={selectedProjectReports}
								activities={context.activities}
								isLoading={isReportDataLoading}
								onOpenReport={(reportId) =>
									openTask(reportId, EntityTypeIds.reports)
								}
								getEmployeeTitle={getEmployeeTitle}
								getActivityTitle={getActivityTitle}
							/>
						</div>
					</>
				)}
			</div>
		</div>
	);
};

export default ReportsCalendar;
