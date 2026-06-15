import type { ActivityListItem } from "@/pages/ReportsPage/types/types";
import type { GroupedReportFields } from "@/shared/types/table";

export type PaymentSort = 0 | 1 | 2;
export type PaymentKind = "client" | "company" | "unpaid";

export const PAYMENT_SORT_TITLES: Record<PaymentSort, string> = {
	0: "Clients paid",
	1: "Company paid",
	2: "Unpaid",
};

export const PAYMENT_KIND_BY_SORT: Record<PaymentSort, PaymentKind> = {
	0: "client",
	1: "company",
	2: "unpaid",
};

export const PAYMENT_SORT_BY_KIND: Record<PaymentKind, PaymentSort> = {
	client: 0,
	company: 1,
	unpaid: 2,
};

export const PAYMENT_CLASS_BY_KIND: Record<PaymentKind, string> = {
	client: "clientPaid",
	company: "companyPaid",
	unpaid: "unpaid",
};

const TASK_TYPE_IDS = {
	task: {
		clientPaid: 393,
		unpaid: 394,
		companyPaid: 395,
	},
	report: {
		clientPaid: 396,
		unpaid: 397,
		companyPaid: 398,
	},
} as const;

const TASK_TYPE_SORT_BY_ID = new Map<number, PaymentSort>([
	[TASK_TYPE_IDS.task.clientPaid, PAYMENT_SORT_BY_KIND.client],
	[TASK_TYPE_IDS.task.companyPaid, PAYMENT_SORT_BY_KIND.company],
	[TASK_TYPE_IDS.task.unpaid, PAYMENT_SORT_BY_KIND.unpaid],
	[TASK_TYPE_IDS.report.clientPaid, PAYMENT_SORT_BY_KIND.client],
	[TASK_TYPE_IDS.report.companyPaid, PAYMENT_SORT_BY_KIND.company],
	[TASK_TYPE_IDS.report.unpaid, PAYMENT_SORT_BY_KIND.unpaid],
]);

const getTaskTypeCode = (value: unknown): number | null => {
	if (typeof value === "number") {
		return Number.isInteger(value) ? value : null;
	}

	if (typeof value === "string") {
		const normalized = value.trim();

		return /^\d+$/.test(normalized) ? Number(normalized) : null;
	}

	return null;
};

const getTaskTypeSortByCode = (value: unknown): PaymentSort | null => {
	const code = getTaskTypeCode(value);

	if (code !== null) {
		return TASK_TYPE_SORT_BY_ID.get(code) ?? null;
	}

	if (Array.isArray(value)) {
		for (const item of value) {
			const sort = getTaskTypeSortByCode(item);

			if (sort !== null) return sort;
		}

		return null;
	}

	if (typeof value === "object") {
		if (value === null) return null;

		const item = value as { ID?: unknown; id?: unknown };

		return getTaskTypeSortByCode(item.ID ?? item.id);
	}

	return null;
};

const getActivitySort = (
	report: GroupedReportFields,
	activities: ActivityListItem[],
): PaymentSort | null => {
	const activity = activities.find(
		(item) => Number(item.ID) === Number(report.activity),
	);
	const sort = Number(activity?.SORT);

	return sort === 0 || sort === 1 || sort === 2 ? sort : null;
};

export const getPaymentSortFromReport = (
	report: GroupedReportFields,
	activities: ActivityListItem[] = [],
): PaymentSort | null => {
	const taskTypeSort = getTaskTypeSortByCode(report.taskType);

	if (taskTypeSort !== null) return taskTypeSort;

	return getActivitySort(report, activities);
};

export const getPaymentKindFromReport = (
	report: GroupedReportFields,
	activities: ActivityListItem[] = [],
): PaymentKind | null => {
	const sort = getPaymentSortFromReport(report, activities);

	return sort === null ? null : PAYMENT_KIND_BY_SORT[sort];
};

export const getPaymentSummary = (
	reports: GroupedReportFields[] = [],
	activities: ActivityListItem[] = [],
) => {
	return reports.reduce<Record<PaymentSort, number>>(
		(acc, report) => {
			const sort = getPaymentSortFromReport(report, activities);
			const timeSpent = Number(report.timeSpent) || 0;

			if (sort !== null) {
				acc[sort] += timeSpent;
			}

			return acc;
		},
		{
			0: 0,
			1: 0,
			2: 0,
		},
	);
};
