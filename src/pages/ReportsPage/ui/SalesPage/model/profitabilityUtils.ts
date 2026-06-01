import { ReportCodes, TaskCodes } from "@/components/calendar/constants/const";
import type { ReportProps } from "@/components/calendar/types/types";
import type { TaskProps, User } from "@/shared/types/types";
import { type Deal, DealCodes } from "../../../types/deals.types";
import type { ActivityListItem } from "../../../types/types";
import { MOCK_MARGIN_PERCENT } from "./constants";
import type { DealSummary, ProfitabilityProject } from "./types";

export const toNumber = (value: unknown) => {
	const parsed = Number(String(value ?? "0").replace(",", "."));
	return Number.isFinite(parsed) ? parsed : 0;
};

export const getDealProjectIds = (deal: Deal | null) => {
	const value = deal?.[DealCodes.parentProject];
	const values = Array.isArray(value) ? value : [value];

	return values.map((item) => String(item ?? "").trim()).filter(Boolean);
};

export const formatHours = (value: number) => `${Number(value.toFixed(1))} ч`;

export const formatMoney = (value: number) =>
	new Intl.NumberFormat("ru-RU", {
		style: "currency",
		currency: "RUB",
		maximumFractionDigits: 0,
	}).format(value);

const normalizeTaskType = (value: unknown): string => {
	if (value === null || value === undefined) return "";

	if (Array.isArray(value)) {
		return value.map(normalizeTaskType).join(" ");
	}

	return String(value).toLowerCase();
};

export const getPaymentKindFromTaskType = (value: unknown) => {
	const normalized = normalizeTaskType(value);

	if (normalized.includes("company") || normalized.includes("ours")) {
		return "company";
	}

	if (normalized.includes("unpaid")) {
		return "unpaid";
	}

	return "client";
};

export const getUserName = (
	users: User[],
	userId?: string | number | null,
) =>
	users.find((user) => String(user.id) === String(userId))?.title ??
	(userId ? `Сотрудник #${userId}` : "Не назначен");

export const getActivityName = (
	activities: ActivityListItem[],
	activityId?: string | number | null,
) => {
	const normalizedId = String(activityId ?? "").trim();

	if (!normalizedId) return "Без активности";

	return (
		activities.find((activity) => String(activity.ID) === normalizedId)?.NAME ??
		normalizedId
	);
};

export const getProjectPlanHours = (tasks: TaskProps[]) =>
	tasks.reduce((acc, task) => acc + toNumber(task[TaskCodes.estimateTime]), 0);

export const getProjectFactHours = (reports: ReportProps[]) =>
	reports.reduce(
		(acc, report) => acc + toNumber(report[ReportCodes.timeSpent]),
		0,
	);

const buildTaskTypeMap = (tasks: TaskProps[]) =>
	new Map(tasks.map((task) => [String(task.id), task[TaskCodes.taskType]]));

const getReportTaskId = (report: ReportProps) =>
	String(report[ReportCodes.parentId] ?? report[ReportCodes.taskId] ?? "");

export const getLossHours = (project: ProfitabilityProject) => {
	const taskTypeById = buildTaskTypeMap(project.tasks);

	return project.reports.reduce(
		(acc, report) => {
			const taskType = taskTypeById.get(getReportTaskId(report));
			const kind = getPaymentKindFromTaskType(taskType);
			const hours = toNumber(report[ReportCodes.timeSpent]);

			if (kind === "company") {
				acc.company += hours;
			}

			if (kind === "unpaid") {
				acc.unpaid += hours;
			}

			return acc;
		},
		{
			company: 0,
			unpaid: 0,
		},
	);
};

export const getDealSummary = (
	projects: ProfitabilityProject[],
	deal: Deal | null,
): DealSummary => {
	const planHours = projects.reduce(
		(acc, project) => acc + getProjectPlanHours(project.tasks),
		0,
	);
	const factHours = projects.reduce(
		(acc, project) => acc + getProjectFactHours(project.reports),
		0,
	);
	const losses = projects.reduce(
		(acc, project) => {
			const projectLosses = getLossHours(project);
			acc.company += projectLosses.company;
			acc.unpaid += projectLosses.unpaid;
			return acc;
		},
		{
			company: 0,
			unpaid: 0,
		},
	);
	const revenue = toNumber(deal?.opportunity);

	return {
		purchasedHours: toNumber(deal?.[DealCodes.purchasedHours]),
		revenue,
		planHours,
		factHours,
		lossHours: losses.company + losses.unpaid,
		companyHours: losses.company,
		unpaidHours: losses.unpaid,
		mockMarginPercent: MOCK_MARGIN_PERCENT,
		mockProfit: Math.round((revenue * MOCK_MARGIN_PERCENT) / 100),
	};
};

export const getTaskTitle = (task: TaskProps) =>
	task.title || `Задача #${task.id}`;

export const getProjectStatus = (project: ProfitabilityProject) => {
	const planHours = getProjectPlanHours(project.tasks);
	const factHours = getProjectFactHours(project.reports);

	if (factHours > planHours) return "Риск";

	return "В норме";
};
