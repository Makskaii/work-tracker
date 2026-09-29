/** biome-ignore-all lint/suspicious/noExplicitAny: <s> */

import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import {
	Endpoints,
	EntityTypeIds,
	TASK_SELECT_FIELDS,
} from "@/shared/constants/const";
import { useLoadAllData } from "@/shared/hooks/useLoadAllTasks";
import type { GroupedReportFields } from "@/shared/types/table";
import type { TaskProps } from "@/shared/types/types";
import { CalendarMonth, WeekCalendar } from ".";
import {
	months,
	ReportCodes,
	ReportStageIds,
	selectFields,
	TaskCodes,
} from "./constants/const";
import { getWeekRange } from "./helpers/calendarPeriod";
import { generateMonthDays } from "./helpers/generateMonthDays";
import type { ReportProps } from "./types/types";

const getReportRelationId = (
	newValue: string | number | null | undefined,
	legacyValue: string | number | null | undefined,
) => {
	return Number(newValue ?? legacyValue ?? 0);
};

const mapReportToGroupedFields = (
	report: ReportProps,
	taskType?: string | number | null,
): GroupedReportFields => {
	const companyId = getReportRelationId(
		report[ReportCodes.company],
		report[ReportCodes.client],
	);
	const parentProjectId = getReportRelationId(
		report[ReportCodes.parentproject],
		report[ReportCodes.project],
	);

	return {
		id: report.id,
		title: report[ReportCodes.title],
		timeSpent: report[ReportCodes.timeSpent],
		taskId: report[ReportCodes.taskId],
		parentId: report[ReportCodes.parentId],
		day: report.begindate,
		project: parentProjectId,
		parentproject: parentProjectId,
		activity: report[ReportCodes.activityType],
		assignedById: String(report.assignedById),
		client: companyId,
		company: companyId,
		stageId: report.stageId,
		taskType: taskType ?? report[ReportCodes.taskType] ?? null,
		reportTaskType: report[ReportCodes.taskType] ?? null,
	};
};

export const Calendar = ({
	view,
	userId,
	userIds,
	isVisible = true,
	setGroupByActivity,
	selectedMonth,
	selectedYear,
	selectedDate,
	onLoadingChange,
	onPeriodReportsChange,
}: {
	view: "month" | "week";
	userId?: string;
	userIds?: string[];
	isVisible?: boolean;
	setGroupByActivity: (value: GroupedReportFields[]) => void;
	selectedMonth: number;
	selectedYear: number;
	selectedDate: string;
	onLoadingChange?: (value: boolean) => void;
	onPeriodReportsChange?: (reports: GroupedReportFields[]) => void;
}) => {
	const [reports, setReports] = useState<GroupedReportFields[]>([]);
	const weekRange = useMemo(
		() => getWeekRange(dayjs(selectedDate)),
		[selectedDate],
	);
	const scopeUserId = userIds?.length ? "" : userId;
	const scopeFilter = useMemo(() => {
		// Keep the full period roster available while displaying one employee.
		if (userIds?.length) {
			return { "@assignedById": userIds };
		}

		if (scopeUserId) {
			return { assignedById: scopeUserId };
		}

		return { assignedById: "__empty__" };
	}, [scopeUserId, userIds]);
	const periodRange = useMemo(() => {
		if (view === "week") {
			return {
				start: dayjs(weekRange.startOfTheWeek).startOf("day").toISOString(),
				end: dayjs(weekRange.endOfTheWeek).endOf("day").toISOString(),
			};
		}

		return {
			start: new Date(selectedYear, selectedMonth, 1).toISOString(),
			end: new Date(
				selectedYear,
				selectedMonth + 1,
				0,
				23,
				59,
				59,
				999,
			).toISOString(),
		};
	}, [selectedMonth, selectedYear, view, weekRange]);

	const { data, loading, error, setFilters } = useLoadAllData<ReportProps>({
		initialEndpoint: Endpoints.crmItems,
		initialFilters: {
			params: {
				entityTypeId: EntityTypeIds.reports,

				select: selectFields,

				filter: {
					">=begindate": periodRange.start,
					"<=begindate": periodRange.end,
					...scopeFilter,
					"@stageId": [ReportStageIds.unconfirmed, ReportStageIds.confirmed],
				},
			},
		},
	});

	const { data: tasks, setFilters: setTaskFilters } = useLoadAllData<TaskProps>(
		{
			initialEndpoint: Endpoints.crmItems,
			initialFilters: {
				params: {
					entityTypeId: EntityTypeIds.tasks,
					select: TASK_SELECT_FIELDS,
					filter: {
						"@id": ["__empty__"],
					},
				},
			},
		},
	);

	useEffect(() => {
		setReports([]);
		setGroupByActivity([]);
		onPeriodReportsChange?.([]);
		setFilters({
			params: {
				entityTypeId: EntityTypeIds.reports,

				select: selectFields,

				filter: {
					">=begindate": periodRange.start,
					"<=begindate": periodRange.end,
					...scopeFilter,
					"@stageId": [ReportStageIds.unconfirmed, ReportStageIds.confirmed],
				},
			},
		});
	}, [
		periodRange,
		setFilters,
		scopeFilter,
		setGroupByActivity,
		onPeriodReportsChange,
	]);

	useEffect(() => {
		const taskIds = Array.from(
			new Set(
				data
					.map((report) => String(report[ReportCodes.parentId] ?? "").trim())
					.filter(Boolean),
			),
		);

		if (!taskIds.length) return;

		setTaskFilters({
			params: {
				entityTypeId: EntityTypeIds.tasks,
				select: TASK_SELECT_FIELDS,
				filter: {
					"@id": taskIds,
				},
			},
		});
	}, [data, setTaskFilters]);

	useEffect(() => {
		if (data) {
			const taskTypeById = new Map(
				tasks.map((task) => [
					String(task.id),
					task[TaskCodes.taskType] ?? null,
				]),
			);
			const normalizedReports = data.map((report) =>
				mapReportToGroupedFields(
					report,
					taskTypeById.get(String(report[ReportCodes.parentId])),
				),
			);
			setReports(normalizedReports);
			if (!loading) onPeriodReportsChange?.(normalizedReports);
		}
	}, [data, tasks, loading, onPeriodReportsChange]);

	const visibleReports = useMemo(
		() =>
			userId
				? reports.filter((report) => report.assignedById === userId)
				: reports,
		[reports, userId],
	);
	useEffect(() => {
		setGroupByActivity(
			visibleReports.filter(
				(report) => report.stageId === ReportStageIds.confirmed,
			),
		);
	}, [visibleReports, setGroupByActivity]);

	const monthDays = generateMonthDays({
		selectedYear,
		selectedMonth,
		reports: visibleReports,
	});

	const getCurrentMonthName = () => {
		return months[selectedMonth];
	};

	useEffect(() => {
		onLoadingChange?.(loading);
	}, [loading, onLoadingChange]);

	if (!isVisible) {
		return null;
	}
	if (error) {
		return (
			<div role="alert">
				Не удалось загрузить отчёты. Обновите страницу, чтобы повторить попытку.
			</div>
		);
	}

	return (
		<>
			{view === "month" ? (
				<CalendarMonth
					getCurrentMonthName={getCurrentMonthName}
					monthDays={monthDays}
					selectedYear={selectedYear}
					isLoading={loading}
					selectedUserId={userId}
					userIds={userIds}
				/>
			) : (
				<WeekCalendar
					userId={userId}
					userIds={userIds}
					selectedDate={selectedDate}
				/>
			)}
		</>
	);
};
