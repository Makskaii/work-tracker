import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router";
import { Modal } from "../../../../components/modal";
import { ReportStageIds } from "@/components/calendar/constants/const";
import { Calendar } from "../../../../components/calendar/Calendar";
import {
	getInternalProjectIds,
	getReportCategorySummary,
} from "../../../../components/calendar/helpers/reportCategory";
import { EntityTypeIds } from "../../../../shared/constants/const";
import { useBitrixSlider } from "../../../../shared/hooks/useBitrixSlider";
import type { GroupedReportFields } from "../../../../shared/types/table";
import type { ReportsContext } from "../../../../shared/types/types";
import { getEmployeeMetricsFromReports } from "./model/employeeMetrics";
import { groupReportsByProject } from "./model/groupReportsByProject";
import type { ViewCalendar } from "./model/types";
import {
	getCapacityByView,
	getDepartmentUsers,
	getVisibleEmployees,
} from "./model/utils";
import cls from "./ReportsCalendar.module.scss";
import { EmployeesPanel } from "./ui/EmployeesPanel";
import { PeriodControls } from "./ui/PeriodControls";
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
	const [periodReports, setPeriodReports] = useState<GroupedReportFields[]>([]);
	const [selectedProjectKey, setSelectedProjectKey] = useState("");
	const [isProjectReportsOpen, setIsProjectReportsOpen] = useState(false);

	const departmentUsers = useMemo(
		() => getDepartmentUsers(context.users),
		[context.users],
	);
	const visibleEmployees = useMemo(
		() => getVisibleEmployees(departmentUsers, periodReports),
		[departmentUsers, periodReports],
	);
	const selectedUser = visibleEmployees.find(
		(user) => user.id === selectedUserId,
	);
	const effectiveUserId = selectedUser?.id ?? "";
	useEffect(() => {
		context.setUser(effectiveUserId);
	}, [effectiveUserId, context.setUser]);
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

	const reportProjects = useMemo(
		() => groupReportsByProject(groupedByActivity, context.projects),
		[groupedByActivity, context.projects],
	);
	useEffect(() => {
		if (!reportProjects.some((project) => project.key === selectedProjectKey)) {
			setSelectedProjectKey(reportProjects[0]?.key ?? "");
		}
	}, [reportProjects, selectedProjectKey]);
	const selectedProject = reportProjects.find(
		(project) => project.key === selectedProjectKey,
	);
	const selectProject = (key: string) => {
		setSelectedProjectKey(key);
		if (isCalendarVisible) setIsProjectReportsOpen(true);
	};
	const projectPanel = (
		<ProjectCardsPanel
			projects={reportProjects}
			selectedProjectKey={selectedProjectKey}
			isLoading={isReportDataLoading}
			onSelectProject={selectProject}
		/>
	);
	const reportsPanel = (
		<ReportsPanel
			projectTitle={selectedProject?.title}
			reports={selectedProject?.reports ?? []}
			users={context.users}
			activities={context.activities}
			isLoading={isReportDataLoading}
			onOpenReport={(reportId) => openTask(reportId, EntityTypeIds.reports)}
		/>
	);

	const employeeMetrics = useMemo(
		() =>
			getEmployeeMetricsFromReports(
				periodReports.filter(
					(report) => report.stageId === ReportStageIds.confirmed,
				),
				context.activities,
			),
		[periodReports, context.activities],
	);

	const internalProjectIds = useMemo(
		() => getInternalProjectIds(context.projects, context.clientsList),
		[context.projects, context.clientsList],
	);
	const categorySummary = getReportCategorySummary(
		groupedByActivity,
		context.activities,
		internalProjectIds,
	);
	const periodCapacity = getCapacityByView(view);
	const totalCapacity = periodCapacity * visibleEmployees.length;
	const employeeMetricsLoading = isReportDataLoading;
	const sidebarTotalHours = employeeMetrics.totalHours;
	const isEmployeeSidebarCompact =
		isCalendarVisible && isEmployeeSidebarCollapsed;
	const employeesPanel = (
		<EmployeesPanel
			users={visibleEmployees}
			view={view}
			selectedUserId={effectiveUserId}
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
									setView("month");
								}}
							>
								Месяц
							</button>
							<button
								type="button"
								className={view === "week" ? cls.activeTab : ""}
								onClick={() => {
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
									{projectPanel}
									<SummaryCard
										title={selectedUser?.title ?? "Весь отдел"}
										summary={categorySummary}
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
								userId={effectiveUserId}
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
								onPeriodReportsChange={setPeriodReports}
							/>
						</main>
					</div>
				) : (
					<>
						<Calendar
							view={view}
							userId={effectiveUserId}
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
							onPeriodReportsChange={setPeriodReports}
						/>
						<div className={cls.hiddenCalendarLayout}>
							{employeesPanel}
							{projectPanel}
							{reportsPanel}
						</div>
					</>
				)}
				<Modal
					isOpen={isProjectReportsOpen}
					onClose={() => setIsProjectReportsOpen(false)}
					innerScroll
				>
					{reportsPanel}
				</Modal>
			</div>
		</div>
	);
};

export default ReportsCalendar;
