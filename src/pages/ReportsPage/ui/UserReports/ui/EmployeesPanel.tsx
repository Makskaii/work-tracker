import type { User } from "@/shared/types/types";
import type { EmployeeMetrics, ViewCalendar } from "../model/types";
import { formatHours, getWorkloadPercent } from "../model/utils";
import cls from "../ReportsCalendar.module.scss";
import { PanelSkeleton } from "./PanelSkeleton";

type EmployeesPanelProps = {
	users: User[];
	view: ViewCalendar;
	selectedUserId: string;
	employeeMetrics: EmployeeMetrics;
	isCompact: boolean;
	isCalendarVisible: boolean;
	isReportDataLoading: boolean;
	isMetricsLoading: boolean;
	sidebarTotalHours: number;
	totalCapacity: number;
	periodCapacity: number;
	onUserChange: (userId: string) => void;
};

const HoursPill = ({
	value,
	isLoading,
}: {
	value: number;
	isLoading: boolean;
}) => (
	<span className={cls.hoursPill}>
		{isLoading ? <span className={cls.hoursSkeleton} /> : formatHours(value)}
	</span>
);

const EmployeeWorkload = ({
	spent,
	capacity,
	notAtWork,
	isLoading = false,
}: {
	spent: number;
	capacity: number;
	notAtWork?: number;
	isLoading?: boolean;
}) =>
	isLoading ? (
		<span className={cls.employeeWorkload}>
			<span className={cls.employeeWorkloadMeta}>
				<span className={cls.workloadTextSkeleton} />
				{notAtWork !== undefined && (
					<span className={cls.workloadTextSkeleton} />
				)}
			</span>
			<span className={cls.employeeProgress}>
				<span className={cls.progressSkeleton} />
			</span>
		</span>
	) : (
		<span className={cls.employeeWorkload}>
			<span className={cls.employeeWorkloadMeta}>
				<span>
					{Number(spent.toFixed(1))} / {capacity} ч
				</span>
				{notAtWork !== undefined && (
					<span>not at work {Number(notAtWork.toFixed(1))} ч</span>
				)}
			</span>
			<span className={cls.employeeProgress}>
				<span style={{ width: `${getWorkloadPercent(spent, capacity)}%` }} />
			</span>
		</span>
	);

export const EmployeesPanel = ({
	users,
	view,
	selectedUserId,
	employeeMetrics,
	isCompact,
	isCalendarVisible,
	isReportDataLoading,
	isMetricsLoading,
	sidebarTotalHours,
	totalCapacity,
	periodCapacity,
	onUserChange,
}: EmployeesPanelProps) => (
	<section
		className={`${cls.panel} ${cls.employeePanel} ${
			isCompact ? cls.employeePanelCollapsed : ""
		}`}
		aria-label="Сотрудники"
	>
		<div className={cls.panelHeader}>
			<h3>Сотрудники</h3>
			<span>
				{isMetricsLoading ? (
					<span className={cls.panelHeaderSkeleton} />
				) : (
					formatHours(sidebarTotalHours)
				)}
			</span>
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
						onClick={() => onUserChange("")}
						title="Весь отдел"
					>
						<span className={cls.avatar}>▦</span>
						<span className={cls.employeeInfo}>
							<strong>Весь отдел</strong>
							<small>Все сотрудники</small>
							<EmployeeWorkload
								spent={sidebarTotalHours}
								capacity={totalCapacity}
								isLoading={isMetricsLoading}
							/>
						</span>
						<HoursPill value={sidebarTotalHours} isLoading={isMetricsLoading} />
					</button>
					{users.map((user) => {
						const spent = employeeMetrics.hours.get(user.id) ?? 0;
						const notAtWork = employeeMetrics.notAtWork.get(user.id) ?? 0;

						return (
							<button
								type="button"
								key={user.id}
								className={`${cls.employeeCard} ${
									selectedUserId === user.id ? cls.activeCard : ""
								}`}
								onClick={() => onUserChange(user.id)}
								title={user.title}
							>
								{user.photo ? (
									<img src={user.photo} alt="" className={cls.avatarImage} />
								) : (
									<span className={cls.avatar}>{user.title.charAt(0)}</span>
								)}
								<span className={cls.employeeInfo}>
									<strong>{user.title}</strong>
									<small>{view === "week" ? "неделя" : "месяц"}</small>
									<EmployeeWorkload
										spent={spent}
										capacity={periodCapacity}
										notAtWork={notAtWork}
										isLoading={isMetricsLoading}
									/>
								</span>
								<HoursPill value={spent} isLoading={isMetricsLoading} />
							</button>
						);
					})}
				</>
			)}
		</div>
	</section>
);
