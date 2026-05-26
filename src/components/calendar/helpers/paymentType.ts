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

const normalizeTaskType = (value: unknown): string => {
	if (value === null || value === undefined) return "";

	if (Array.isArray(value)) {
		return value.map(normalizeTaskType).join(" ");
	}

	if (typeof value === "object") {
		return Object.values(value as Record<string, unknown>)
			.map(normalizeTaskType)
			.join(" ");
	}

	return String(value).trim().toLowerCase();
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
	const taskType = normalizeTaskType(report.taskType);

	if (
		taskType.includes("client") ||
		taskType.includes("клиент") ||
		taskType === "0"
	) {
		return 0;
	}

	if (
		taskType.includes("company") ||
		taskType.includes("ours") ||
		taskType.includes("our") ||
		taskType.includes("компан") ||
		taskType.includes("внут") ||
		taskType === "1"
	) {
		return 1;
	}

	if (
		taskType.includes("unpaid") ||
		taskType.includes("анпейд") ||
		taskType.includes("неоплач") ||
		taskType === "2"
	) {
		return 2;
	}

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
