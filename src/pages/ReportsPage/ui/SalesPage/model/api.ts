import { $api } from "@/shared/config";
import { Endpoints, EntityTypeIds } from "@/shared/constants/const";
import { ProjectCodes } from "@/components/calendar/constants/const";
import type { ClientProjectProps } from "@/shared/types/types";
import { PROJECT_SELECT_FIELDS } from "./constants";
import type { ProfitabilityProject, ProjectPayment } from "./types";

type CrmItemListResponse<T> = {
	result?: {
		items?: T[];
	};
	next?: number | null;
};

type CrmFieldEnumItem = {
	ID: string | number;
	VALUE: string | null;
};

type CrmItemFieldsResponse = {
	result?: {
		fields?: Record<string, { items?: CrmFieldEnumItem[] }>;
	};
};

export const fetchAllCrmItems = async <T,>({
	entityTypeId,
	select,
	filter,
	signal,
}: {
	entityTypeId: number;
	select: readonly string[];
	filter: Record<string, unknown>;
	signal?: AbortSignal;
}) => {
	const limit = 50;
	let start = 0;
	let next: number | null | undefined = 0;
	const items: T[] = [];

	while (next !== null) {
		const response = await $api.get<CrmItemListResponse<T>>(
			Endpoints.crmItems,
			{
				params: {
					entityTypeId,
					select,
					filter,
					start,
				},
				signal,
			},
		);

		items.push(...(response.data.result?.items ?? []));

		next = response.data.next ?? null;
		start = next ?? start + limit;
	}

	return items;
};

const PROJECT_PAYMENT_SELECT_FIELDS = [
	"id",
	"title",
	ProjectCodes.paymentDate,
	ProjectCodes.paymentStage,
	ProjectCodes.paymentStageBinding,
	ProjectCodes.paymentPercent,
	ProjectCodes.paymentAmount,
	ProjectCodes.paymentProject,
] as const;

const normalizeProjectPayment = (
	payment: ProjectPayment,
): ProjectPayment => ({
	...payment,
	id: String(payment.id),
});

export const fetchProjectPaymentStageBindingLabels = async (
	signal?: AbortSignal,
) => {
	const response = await $api.get<CrmItemFieldsResponse>(Endpoints.crmFeilds, {
		params: {
			entityTypeId: EntityTypeIds.projectPayments,
		},
		signal,
	});
	const field =
		response.data.result?.fields?.[ProjectCodes.paymentStageBinding];
	const labels = new Map<string, string>();

	field?.items?.forEach((item) => {
		const id = String(item.ID).trim();
		const label = String(item.VALUE ?? "").trim();

		if (id && label) {
			labels.set(id, label);
		}
	});

	return labels;
};

export const fetchPaymentsByProjectId = (
	projectId: string,
	signal?: AbortSignal,
) =>
	fetchAllCrmItems<ProjectPayment>({
		entityTypeId: EntityTypeIds.projectPayments,
		select: PROJECT_PAYMENT_SELECT_FIELDS,
		filter: {
			[ProjectCodes.paymentProject]: projectId,
		},
		signal,
	}).then((payments) => payments.map(normalizeProjectPayment));

export const fetchProjectPaymentsByProjectIds = async ({
	projectIds,
	signal,
}: {
	projectIds: string[];
	signal?: AbortSignal;
}) => {
	const normalizedProjectIds = Array.from(
		new Set(projectIds.map((projectId) => projectId.trim()).filter(Boolean)),
	);
	if (!normalizedProjectIds.length) {
		return [];
	}

	try {
		const payments = await fetchAllCrmItems<ProjectPayment>({
			entityTypeId: EntityTypeIds.projectPayments,
			select: PROJECT_PAYMENT_SELECT_FIELDS,
			filter: { [`@${ProjectCodes.paymentProject}`]: normalizedProjectIds },
			signal,
		});
		const normalizedPayments = payments.map(normalizeProjectPayment);

		return Array.from(
			new Map(normalizedPayments.map((payment) => [payment.id, payment])).values(),
		);
	} catch (error) {
		if (signal?.aborted) {
			throw error;
		}
	}

	const payments = await Promise.all(
		normalizedProjectIds.map((projectId) =>
			fetchPaymentsByProjectId(projectId, signal),
		),
	);
	const result = new Map<string, ProjectPayment>();

	payments.flat().forEach((payment) => {
		result.set(String(payment.id), payment);
	});

	return Array.from(result.values());
};

export const fetchProjectsByDealId = (dealId: string, signal?: AbortSignal) =>
	fetchAllCrmItems<ClientProjectProps>({
		entityTypeId: EntityTypeIds.projects,
		select: PROJECT_SELECT_FIELDS,
		filter: {
			[ProjectCodes.parentDeal]: dealId,
		},
		signal,
	});

export type ProjectIncident = {
	id: string;
	title?: string;
	createdTime?: string;
	updatedTime?: string;
	[key: string]: unknown;
};

const normalizeProjectIncident = (
	incident: ProjectIncident,
): ProjectIncident => ({
	...incident,
	id: String(incident.id),
});

const PROJECT_INCIDENT_SELECT_FIELDS = [
	"id",
	"title",
	"createdTime",
	"updatedTime",
	ProjectCodes.project,
	ProjectCodes.comment,
	ProjectCodes.info,
	ProjectCodes.incidentDates,
] as const;

const getProjectIncidentFilter = ({
	includeCompany,
	includeProject,
	project,
}: {
	includeCompany: boolean;
	includeProject: boolean;
	project: ProfitabilityProject;
}) => {
	const projectId = project.projectId;
	const companyId = project[ProjectCodes.company];
	const filter: Record<string, unknown> = {};

	if (includeProject) {
		filter[ProjectCodes.project] = projectId;
	}

	if (includeCompany && companyId) {
		filter[ProjectCodes.incidentCompany] = companyId;
	}

	return filter;
};

export const fetchProjectIncidents = async ({
	project,
	signal,
}: {
	project: ProfitabilityProject;
	signal?: AbortSignal;
}) => {
	const companyId = project[ProjectCodes.company];
	const request = (includeProject: boolean, includeCompany: boolean) =>
		fetchAllCrmItems<ProjectIncident>({
			entityTypeId: EntityTypeIds.projectIncidents,
			select: PROJECT_INCIDENT_SELECT_FIELDS,
			filter: getProjectIncidentFilter({
				includeCompany,
				includeProject,
				project,
			}),
			signal,
		});
	const safeRequest = async (
		includeProject: boolean,
		includeCompany: boolean,
	) => {
		try {
			const incidents = await request(includeProject, includeCompany);

			return incidents.map(normalizeProjectIncident);
		} catch {
			return [];
		}
	};

	const strictItems = await safeRequest(true, true);

	if (strictItems.length) {
		return strictItems;
	}

	const projectItems = await safeRequest(true, false);

	if (projectItems.length || !companyId) {
		return projectItems;
	}

	return safeRequest(false, true);
};
