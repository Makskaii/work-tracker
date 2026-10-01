import { $api } from "@/shared/config";
import { $backendApi } from "@/shared/config/axios/axios.config";
import { Endpoints, EntityTypeIds } from "@/shared/constants/const";
import { ProjectCodes } from "@/components/calendar/constants/const";
import type { ClientProjectProps } from "@/shared/types/types";
import { PROJECT_SELECT_FIELDS } from "./constants";
import type {
	CustomGanttEvent,
	CustomGanttEventPayload,
	GanttIncident,
	GanttIncidentFile,
	GanttIncidentPayload,
	ProfitabilityProject,
	ProjectPayment,
} from "./types";

type CrmItemListResponse<T> = {
	error?: string;
	error_description?: string;
	result?: {
		items?: T[];
	};
	next?: number | null;
};

type BitrixCrmFieldEnumItem = {
	ID: string | number;
	VALUE: string | null;
};

type CrmItemFieldsResponse = {
	result?: {
		fields?: Record<string, { items?: BitrixCrmFieldEnumItem[] }>;
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

		const pageItems = response.data.result?.items;

		if (response.data.error || !Array.isArray(pageItems)) {
			throw new Error(
				response.data.error_description ||
					response.data.error ||
					"Не удалось получить данные из Битрикс24",
			);
		}

		items.push(...pageItems);

		next = response.data.next ?? null;

		if (next !== null && (!Number.isFinite(next) || next <= start)) {
			throw new Error("Битрикс24 вернул некорректную страницу данных");
		}

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
	ProjectCodes.paymentWaitingDays,
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

export const fetchGanttCustomEvents = async (
	projectId: string,
	signal?: AbortSignal,
) => {
	const response = await $backendApi.get<CustomGanttEvent[]>(
		`gantt/projects/${projectId}/events`,
		{ signal },
	);

	return response.data;
};

export const createGanttCustomEvent = async (
	projectId: string,
	payload: CustomGanttEventPayload,
) => {
	const response = await $backendApi.post<CustomGanttEvent>(
		`gantt/projects/${projectId}/events`,
		payload,
	);

	return response.data;
};

export const updateGanttCustomEvent = async (
	eventId: number,
	payload: Partial<CustomGanttEventPayload>,
) => {
	const response = await $backendApi.patch<CustomGanttEvent>(
		`gantt/events/${eventId}`,
		payload,
	);

	return response.data;
};

export const deleteGanttCustomEvent = (eventId: number) =>
	$backendApi.delete(`gantt/events/${eventId}`);

export const fetchGanttIncidents = async (
	projectId: string,
	signal?: AbortSignal,
) => {
	const response = await $backendApi.get<GanttIncident[]>(
		`gantt/projects/${projectId}/incidents`,
		{ signal },
	);

	return response.data;
};

export const createGanttIncident = async (
	projectId: string,
	payload: GanttIncidentPayload,
) => {
	const response = await $backendApi.post<GanttIncident>(
		`gantt/projects/${projectId}/incidents`,
		payload,
	);

	return response.data;
};

export const updateGanttIncident = async (
	incidentId: number,
	payload: Partial<GanttIncidentPayload>,
) => {
	const response = await $backendApi.patch<GanttIncident>(
		`gantt/incidents/${incidentId}`,
		payload,
	);

	return response.data;
};

export const deleteGanttIncident = (incidentId: number) =>
	$backendApi.delete(`gantt/incidents/${incidentId}`);

export const uploadGanttIncidentFiles = async (
	incidentId: number,
	files: File[],
) => {
	const formData = new FormData();

	files.forEach((file) => {
		formData.append("files", file);
	});

	const response = await $backendApi.post<GanttIncidentFile[]>(
		`gantt/incidents/${incidentId}/files`,
		formData,
		{
			headers: {
				"Content-Type": "multipart/form-data",
			},
		},
	);

	return response.data;
};

export const downloadGanttIncidentFile = (incidentId: number, fileId: number) =>
	$backendApi.get<Blob>(`gantt/incidents/${incidentId}/files/${fileId}`, {
		responseType: "blob",
	});

export const deleteGanttIncidentFile = (incidentId: number, fileId: number) =>
	$backendApi.delete(`gantt/incidents/${incidentId}/files/${fileId}`);
