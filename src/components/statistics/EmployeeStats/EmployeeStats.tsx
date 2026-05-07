import dayjs from "dayjs";
import { useMemo } from "react";
import { ReportCodes, TaskCodes } from "@/components/calendar/constants/const";
import type { ReportProps } from "@/components/calendar/types/types";
import type { ActivityListItem } from "@/pages/ReportsPage/types/types";
import type { TaskProps } from "@/shared/types/types";
import cls from "./Emplyee.module.scss";

type Props = {
	tasks: TaskProps[];
	taskReportsMap: Record<string, ReportProps[]>;
	allSprintReports: ReportProps[];
	activities: ActivityListItem[];
	sprintStart: string;
	sprintEnd: string;
	doneStageId: string;
	onOpenOverrunTasks?: (taskIds: string[]) => void;
};

type ActivityStat = {
	activityId: string;
	activityName: string;
	hours: number;
	reportsCount: number;
	withTaskCount: number;
	withoutTaskCount: number;
};

const DEV_HOURS_PER_DAY = 6;
const FULL_HOURS_PER_DAY = 8;

const getNumberValue = (value: unknown) => {
	if (typeof value === "number") {
		return Number.isFinite(value) ? value : 0;
	}

	if (typeof value === "string") {
		const normalizedValue = value.trim().replace(",", ".");

		if (!normalizedValue) {
			return 0;
		}

		const numberValue = Number(normalizedValue);

		return Number.isFinite(numberValue) ? numberValue : 0;
	}

	return 0;
};

const formatHours = (value: number) => {
	if (!Number.isFinite(value)) {
		return 0;
	}

	return Number(value.toFixed(2));
};

const getProgressDeg = (value: number, total: number) => {
	if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0) {
		return 0;
	}

	const percent = Math.min((value / total) * 100, 100);

	return (percent / 100) * 360;
};

const getBarColor = (percent: number) => {
	if (percent >= 100) return "#ef4444";
	if (percent >= 85) return "#f59e0b";

	return "#3b82f6";
};

const isWeekday = (date: dayjs.Dayjs) => {
	const day = date.day();

	return day !== 0 && day !== 6;
};

const countWeekdaysInclusive = (start: string, end: string) => {
	let current = dayjs(start).startOf("day");
	const last = dayjs(end).startOf("day");

	let count = 0;

	while (current.isBefore(last) || current.isSame(last, "day")) {
		if (isWeekday(current)) {
			count += 1;
		}

		current = current.add(1, "day");
	}

	return count;
};

const getWorkedDaysForSprint = (sprintStart: string, sprintEnd: string) => {
	const today = dayjs().startOf("day");
	const start = dayjs(sprintStart).startOf("day");
	const end = dayjs(sprintEnd).startOf("day");

	if (today.isBefore(start)) {
		return 0;
	}

	if (today.isAfter(end)) {
		return countWeekdaysInclusive(sprintStart, sprintEnd);
	}

	return countWeekdaysInclusive(sprintStart, today.format("YYYY-MM-DD"));
};

const getReportTaskId = (report: ReportProps) => {
	return String(
		report[ReportCodes.taskId] ?? report[ReportCodes.parentId] ?? "",
	);
};

const getDynamicCapacity = (
	sprintStart: string,
	sprintEnd: string,
	hoursPerDay: number,
) => {
	const today = dayjs().startOf("day");
	const start = dayjs(sprintStart).startOf("day");
	const end = dayjs(sprintEnd).startOf("day");

	if (today.isBefore(start)) {
		return 0;
	}

	if (today.isAfter(end)) {
		return countWeekdaysInclusive(sprintStart, sprintEnd) * hoursPerDay;
	}

	return (
		countWeekdaysInclusive(sprintStart, today.format("YYYY-MM-DD")) *
		hoursPerDay
	);
};

const HOURS_PER_DEV_DAY = 6;
const HOURS_PER_FULL_DAY = 8;

export const EmployeeStats = ({
	tasks,
	taskReportsMap,
	allSprintReports,
	activities,
	sprintStart,
	sprintEnd,
	doneStageId,
	onOpenOverrunTasks,
}: Props) => {
	const stats = useMemo(() => {
		const workedDays = getWorkedDaysForSprint(sprintStart, sprintEnd);
		const sprintDays = countWeekdaysInclusive(sprintStart, sprintEnd);

		const devCapacity = getDynamicCapacity(
			sprintStart,
			sprintEnd,
			HOURS_PER_DEV_DAY,
		);
		const fullCapacity = getDynamicCapacity(
			sprintStart,
			sprintEnd,
			HOURS_PER_FULL_DAY,
		);

		const fullSprintDevCapacity = sprintDays * DEV_HOURS_PER_DAY;
		const fullSprintCapacity = sprintDays * FULL_HOURS_PER_DAY;

		const completedTasksCount = tasks.filter(
			(task) => task.stageId === doneStageId,
		).length;

		const totalTasksCount = tasks.length;

		const taskEstimatedHours = tasks.reduce((sum, task) => {
			return sum + getNumberValue(task[TaskCodes.estimateTime]);
		}, 0);

		const taskSpentHours = tasks.reduce((sum, task) => {
			const reports = taskReportsMap[String(task.id)] ?? [];

			return (
				sum +
				reports.reduce((innerSum, report) => {
					return innerSum + getNumberValue(report[ReportCodes.timeSpent]);
				}, 0)
			);
		}, 0);

		const spentAllReports = allSprintReports.reduce((sum, report) => {
			return sum + getNumberValue(report[ReportCodes.timeSpent]);
		}, 0);

		const spentWithoutTask = allSprintReports.reduce((sum, report) => {
			const taskId = getReportTaskId(report);

			if (taskId) return sum;

			return sum + getNumberValue(report[ReportCodes.timeSpent]);
		}, 0);

		const remainingTaskHours = Math.max(taskEstimatedHours - taskSpentHours, 0);

		const totalOverrunHours = Math.max(taskSpentHours - taskEstimatedHours, 0);

		const remainingDevCapacity = Math.max(devCapacity - spentAllReports, 0);
		const remainingFullCapacity = Math.max(fullCapacity - spentAllReports, 0);

		const usedReserveHours = Math.max(spentAllReports - devCapacity, 0);
		const availableReserveHours = Math.max(
			fullCapacity - Math.max(spentAllReports, devCapacity),
			0,
		);

		const planningOverflowHours = Math.max(taskEstimatedHours - 40, 0);
		const isOverPlanned = planningOverflowHours > 0;

		const deficitHours = Math.max(
			remainingTaskHours - remainingFullCapacity,
			0,
		);

		const totalSprintFullCapacity =
			countWeekdaysInclusive(sprintStart, sprintEnd) * HOURS_PER_FULL_DAY;

		const overrunTaskIds: string[] = [];
		let overrunTasksHours = 0;

		for (const task of tasks) {
			const reports = taskReportsMap[String(task.id)] ?? [];

			const spent = reports.reduce((sum, report) => {
				return sum + getNumberValue(report[ReportCodes.timeSpent]);
			}, 0);

			const estimated = getNumberValue(task[TaskCodes.estimateTime]);

			if (spent > estimated) {
				overrunTaskIds.push(String(task.id));
				overrunTasksHours += spent - estimated;
			}
		}

		const activityMap = new Map<string, ActivityStat>();

		for (const report of allSprintReports) {
			const activityId = String(report[ReportCodes.activityType] ?? "");
			const timeSpent = getNumberValue(report[ReportCodes.timeSpent]);

			const activityName =
				activities.find((item) => item.ID === activityId)?.NAME ||
				"Без активности";

			const hasTask = Boolean(getReportTaskId(report));

			const current = activityMap.get(activityId) ?? {
				activityId,
				activityName,
				hours: 0,
				reportsCount: 0,
				withTaskCount: 0,
				withoutTaskCount: 0,
			};

			current.hours += timeSpent;
			current.reportsCount += 1;

			if (hasTask) {
				current.withTaskCount += 1;
			} else {
				current.withoutTaskCount += 1;
			}

			activityMap.set(activityId, current);
		}

		const activitiesStats = Array.from(activityMap.values())
			.map((item) => ({
				...item,
				hours: formatHours(item.hours),
			}))
			.sort((a, b) => b.hours - a.hours);

		return {
			workedDays,
			sprintDays,

			devCapacity: formatHours(devCapacity),
			fullCapacity: formatHours(fullCapacity),
			fullSprintDevCapacity: formatHours(fullSprintDevCapacity),
			fullSprintCapacity: formatHours(fullSprintCapacity),

			totalTasksCount,
			completedTasksCount,

			taskEstimatedHours: formatHours(taskEstimatedHours),
			taskSpentHours: formatHours(taskSpentHours),
			spentAllReports: formatHours(spentAllReports),
			spentWithoutTask: formatHours(spentWithoutTask),

			remainingTaskHours: formatHours(remainingTaskHours),
			totalOverrunHours: formatHours(totalOverrunHours),

			remainingDevCapacity: formatHours(remainingDevCapacity),
			remainingFullCapacity: formatHours(remainingFullCapacity),
			usedReserveHours: formatHours(usedReserveHours),
			availableReserveHours: formatHours(availableReserveHours),
			deficitHours: formatHours(deficitHours),

			overrunTaskIds,
			overrunTasksHours: formatHours(overrunTasksHours),

			activitiesStats,

			isOverPlanned,
			totalSprintFullCapacity,
			planningOverflowHours,
		};
	}, [
		tasks,
		taskReportsMap,
		allSprintReports,
		activities,
		sprintStart,
		sprintEnd,
		doneStageId,
	]);

	const devPercent =
		stats.devCapacity > 0
			? (stats.spentAllReports / stats.devCapacity) * 100
			: 0;

	const fullPercent =
		stats.fullCapacity > 0
			? (stats.spentAllReports / stats.fullCapacity) * 100
			: 0;

	const devDeg = getProgressDeg(stats.spentAllReports, stats.devCapacity);
	const fullDeg = getProgressDeg(stats.spentAllReports, stats.fullCapacity);
	const hasStatsData = tasks.length > 0 || allSprintReports.length > 0;

	if (!hasStatsData) {
		return (
			<div className={cls.statsEmptyState}>
				Нет данных для статистики за выбранный спринт
			</div>
		);
	}

	return (
		<div className={cls.statsStack}>
			<div className={cls.container}>
				<div className={cls.statCard}>
					<div
						className={cls.circularProgress}
						style={{
							background: `conic-gradient(${"#00ff1e"} 0deg ${devDeg}deg, #e5e7eb ${devDeg}deg 360deg)`,
						}}
					>
						<div className={cls.circularProgressInner}>
							{Math.min(Math.round(devPercent), 999)}%
						</div>
					</div>
					<div className={cls.statLabel}>Капасити разработки</div>
					<div className={cls.statValue}>
						{stats.spentAllReports} / {stats.devCapacity}ч
					</div>
				</div>

				<div className={cls.statCard}>
					<div
						className={cls.circularProgress}
						style={{
							background: `conic-gradient(${getBarColor(fullPercent)} 0deg ${fullDeg}deg, #e5e7eb ${fullDeg}deg 360deg)`,
						}}
					>
						<div className={cls.circularProgressInner}>
							{Math.min(Math.round(fullPercent), 999)}%
						</div>
					</div>
					<div className={cls.statLabel}>Полный капасити спринта</div>
					<div className={cls.statValue}>
						{stats.spentAllReports} / {stats.fullCapacity}ч
					</div>
				</div>

				<div className={cls.statCard}>
					<div className={cls.statLabel}>Задач выполнено</div>
					<div className={cls.statValue}>
						{stats.completedTasksCount} / {stats.totalTasksCount}
					</div>
					<div className={cls.statBadge}>По задачам спринта</div>
				</div>

				<div className={cls.statCard}>
					<div className={cls.statLabel}>Оценка задач</div>
					<div className={cls.statValue}>{stats.taskEstimatedHours}ч</div>
					<div className={cls.statBadge}>
						{stats.isOverPlanned
							? `Перегрузка спринта: +${stats.planningOverflowHours}ч`
							: `Вмещается в спринт`}
					</div>
				</div>

				<div className={cls.statCard}>
					<div className={cls.statLabel}>По задачам списано</div>
					<div className={cls.statValue}>{stats.taskSpentHours}ч</div>
					<button
						type="button"
						className={`${cls.statBadge} ${cls.statBadgeButton}`}
						disabled={!stats.overrunTaskIds.length || !onOpenOverrunTasks}
						onClick={() => {
							if (stats.overrunTaskIds.length && onOpenOverrunTasks) {
								onOpenOverrunTasks(stats.overrunTaskIds);
							}
						}}
					>
						Перерасход: {stats.overrunTasksHours}ч
					</button>
				</div>

				<div className={cls.statCard}>
					<div className={cls.statLabel}>Без задачи</div>
					<div className={cls.statValue}>{stats.spentWithoutTask}ч</div>
					<div className={cls.statBadge}>Созвоны / внутренняя работа</div>
				</div>

				<div className={cls.statCard}>
					<div className={cls.statLabel}>Резерв спринта</div>
					<div className={cls.statValue}>{stats.availableReserveHours}ч</div>
					<div className={cls.statBadge}>
						Использовано: {stats.usedReserveHours}ч
					</div>
				</div>
			</div>

			<div className={cls.activitiesPanel}>
				<div className={cls.activitiesHeader}>
					<div>Активности за спринт</div>
					<div>Часы / отчёты</div>
				</div>

				<div className={cls.activitiesList}>
					{stats.activitiesStats.length ? (
						stats.activitiesStats.map((activity) => (
							<div
								key={activity.activityId || activity.activityName}
								className={cls.activityItem}
							>
								<div className={cls.activityHeader}>
									<div className={cls.activityName}>
										{activity.activityName}
									</div>
									<div className={cls.activityHours}>{activity.hours}ч</div>
								</div>

								<div className={cls.activityBar}>
									<div
										className={cls.activityBarFill}
										style={{
											width: `${Math.min(
												(activity.hours / Math.max(stats.spentAllReports, 1)) *
													100,
												100,
											)}%`,
										}}
									/>
								</div>

								<div className={cls.activityBadges}>
									<span className={cls.statBadge}>
										Отчётов: {activity.reportsCount}
									</span>
									<span className={cls.statBadge}>
										С задачей: {activity.withTaskCount}
									</span>
									<span className={cls.statBadge}>
										Без задачи: {activity.withoutTaskCount}
									</span>
								</div>
							</div>
						))
					) : (
						<div className={cls.emptyState}>
							Нет отчётов за выбранный спринт
						</div>
					)}
				</div>
			</div>
		</div>
	);
};
