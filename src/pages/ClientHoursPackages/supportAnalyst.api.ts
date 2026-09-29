import { $backendApi } from "@/shared/config/axios/axios.config";
import type { SupportHoursPackagePayload } from "./clientHoursPackages.api";

export type PackageImpactTotals = {
	purchasedHours: number;
	consumedHours: number;
	remainingHours: number;
	reportCount: number;
};
export type PackageImpact = {
	packageId: number;
	projectId: number;
	operation: "update" | "delete";
	fingerprint: string;
	requiresConfirmation: boolean;
	packages: Array<{
		id: number;
		purchaseDate: string;
		before: PackageImpactTotals | null;
		after: PackageImpactTotals | null;
		affected: boolean;
	}>;
	movedHours: number;
	movedReportCount: number;
	unallocatedHoursBefore: number;
	unallocatedHoursAfter: number;
};
export const previewPackageImpact = async (
	id: number,
	operation: "update" | "delete",
	changes?: Partial<Omit<SupportHoursPackagePayload, "projectId">>,
) => {
	const response = await $backendApi.post<PackageImpact>(
		`support-hours-packages/${id}/impact`,
		{ operation, ...(changes ? { changes } : {}) },
	);
	return response.data;
};

export type SupportReportValues = {
	taskId?: number | null;
	activityId: number;
	reportTypeId?: number | null;
	description: string;
	hours: number;
	reportDate: string;
	includeInPackage: boolean;
};
export const getSupportReportForEdit = async (
	id: string,
	projectId: number,
) => {
	const response = await $backendApi.get<SupportReportValues>(
		`support-hours-packages/reports/${id}/edit`,
		{ params: { projectId } },
	);
	return response.data;
};
export const prepareSupportReportFields = async (
	projectId: number,
	values: SupportReportValues & { reportId?: number },
) => {
	const response = await $backendApi.post<{
		entityTypeId: number;
		fields: Record<string, unknown>;
	}>(`support-hours-packages/projects/${projectId}/report-fields`, values);
	return response.data;
};
export type PackageCheck = {
	code: string;
	severity: "warning" | "error";
	message: string;
	entityTypeId: number;
	itemId: string | number;
};
export type PackageChecks = {
	checkedAt: string;
	blocking: boolean;
	issues: PackageCheck[];
};
export const fetchPackageChecks = async (
	packageId: number,
	signal?: AbortSignal,
) => {
	const response = await $backendApi.get<PackageChecks>(
		`support-hours-packages/${packageId}/checks`,
		{ signal, timeout: 120_000 },
	);
	return response.data;
};

export const supportErrorMessage = (
	error: unknown,
	fallback: string,
): string => {
	if (error && typeof error === "object" && "response" in error) {
		const response = error.response as
			| { data?: { message?: unknown } }
			| undefined;
		const message = response?.data?.message;
		if (typeof message === "string") return message;
		if (
			Array.isArray(message) &&
			message.every((item) => typeof item === "string")
		)
			return message.join(". ");
	}
	return fallback;
};

export const downloadSupportPdf = (pdf: Blob, filename: string) => {
	const objectUrl = URL.createObjectURL(pdf);
	const link = document.createElement("a");
	try {
		link.href = objectUrl;
		link.download = filename;
		document.body.appendChild(link);
		link.click();
	} finally {
		link.remove();
		window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
	}
};

export const fetchSupportReportOptions = async (signal?: AbortSignal) => {
	const response = await $backendApi.get<{
		activities: Array<{ id: number; title: string }>;
		reportTypes: Array<{ id: number; title: string }>;
	}>("support-hours-packages/reports/form-options", { signal });
	return response.data;
};
