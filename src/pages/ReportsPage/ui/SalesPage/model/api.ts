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
	AutonomousProjectPayment,
	AutonomousProjectPaymentPayload,
	CreateProjectReportEntryPayload,
	ProfitabilityProject,
	ProjectReportEntry,
	ProjectReportEntryFile,
	ProjectGanttEvent,
	ProjectGanttEventPayload,
	ProjectGanttStage,
	ProjectGanttStagePayload,
	ProjectPayment,
	ReportProject,
	ReportProjectFile,
	ReportProjectFileKind,
	ReportProjectPayload,
	UpdateProjectReportEntryPayload,
} from "./types";

type CrmItemListResponse<T> = {
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

export const fetchProjectGanttStages = async (
	projectId: string,
	signal?: AbortSignal,
) => {
	const response = await $backendApi.get<ProjectGanttStage[]>(
		`project-reports/projects/${projectId}/gantt/stages`,
		{ signal },
	);

	return response.data;
};

export const createProjectGanttStage = async (
	projectId: string,
	payload: ProjectGanttStagePayload,
) => {
	const response = await $backendApi.post<ProjectGanttStage>(
		`project-reports/projects/${projectId}/gantt/stages`,
		payload,
	);

	return response.data;
};

export const updateProjectGanttStage = async (
	stageId: number,
	payload: Partial<ProjectGanttStagePayload>,
) => {
	const response = await $backendApi.patch<ProjectGanttStage>(
		`project-reports/gantt/stages/${stageId}`,
		payload,
	);

	return response.data;
};

export const deleteProjectGanttStage = (stageId: number) =>
	$backendApi.delete(`project-reports/gantt/stages/${stageId}`);

export const fetchProjectGanttEvents = async (
	projectId: string,
	signal?: AbortSignal,
) => {
	const response = await $backendApi.get<ProjectGanttEvent[]>(
		`project-reports/projects/${projectId}/gantt/events`,
		{ signal },
	);

	return response.data;
};

export const createProjectGanttEvent = async (
	projectId: string,
	payload: ProjectGanttEventPayload,
) => {
	const response = await $backendApi.post<ProjectGanttEvent>(
		`project-reports/projects/${projectId}/gantt/events`,
		payload,
	);

	return response.data;
};

export const updateProjectGanttEvent = async (
	eventId: number,
	payload: Partial<ProjectGanttEventPayload>,
) => {
	const response = await $backendApi.patch<ProjectGanttEvent>(
		`project-reports/gantt/events/${eventId}`,
		payload,
	);

	return response.data;
};

export const deleteProjectGanttEvent = (eventId: number) =>
	$backendApi.delete(`project-reports/gantt/events/${eventId}`);

export const fetchAutonomousProjectPayments = async (
	projectId: string,
	signal?: AbortSignal,
) => {
	const response = await $backendApi.get<AutonomousProjectPayment[]>(
		`project-reports/projects/${projectId}/payments`,
		{ signal },
	);

	return response.data;
};

export const createAutonomousProjectPayment = async (
	projectId: string,
	payload: AutonomousProjectPaymentPayload,
) => {
	const response = await $backendApi.post<AutonomousProjectPayment>(
		`project-reports/projects/${projectId}/payments`,
		payload,
	);

	return response.data;
};

export const updateAutonomousProjectPayment = async (
	paymentId: number,
	payload: Partial<AutonomousProjectPaymentPayload>,
) => {
	const response = await $backendApi.patch<AutonomousProjectPayment>(
		`project-reports/payments/${paymentId}`,
		payload,
	);

	return response.data;
};

export const deleteAutonomousProjectPayment = (paymentId: number) =>
	$backendApi.delete(`project-reports/payments/${paymentId}`);

export const fetchReportProjects = async (signal?: AbortSignal) => {
	const response = await $backendApi.get<ReportProject[]>(
		"project-reports/projects",
		{ signal },
	);

	return response.data.map(normalizeReportProject);
};

const normalizeReportProject = (project: ReportProject): ReportProject => ({
	...project,
	files: project.files ?? [],
});

export const createReportProject = async (
	payload: ReportProjectPayload,
) => {
	const response = await $backendApi.post<ReportProject>(
		"project-reports/projects",
		payload,
	);

	return normalizeReportProject(response.data);
};

export const updateReportProject = async (
	projectId: number,
	payload: Partial<ReportProjectPayload>,
) => {
	const response = await $backendApi.patch<ReportProject>(
		`project-reports/projects/${projectId}`,
		payload,
	);

	return normalizeReportProject(response.data);
};

export const deleteReportProject = (projectId: number) =>
	$backendApi.delete(`project-reports/projects/${projectId}`);

export const uploadReportProjectFile = async (
	projectId: number,
	fileKind: ReportProjectFileKind,
	file: File,
) => {
	const formData = new FormData();

	formData.append("file", file);

	const response = await $backendApi.post<ReportProjectFile>(
		`project-reports/projects/${projectId}/files/${fileKind}`,
		formData,
		{
			headers: {
				"Content-Type": "multipart/form-data",
			},
		},
	);

	return response.data;
};

export const downloadReportProjectFile = (projectId: number, fileId: number) =>
	$backendApi.get<Blob>(`project-reports/projects/${projectId}/files/${fileId}`, {
		responseType: "blob",
	});

export const deleteReportProjectFile = (projectId: number, fileId: number) =>
	$backendApi.delete(`project-reports/projects/${projectId}/files/${fileId}`);

export const fetchProjectReportEntries = async (
	projectId: number,
	signal?: AbortSignal,
) => {
	const response = await $backendApi.get<ProjectReportEntry[]>(
		`project-reports/projects/${projectId}/reports`,
		{ signal },
	);

	return response.data.map(normalizeProjectReportEntry);
};

const normalizeProjectReportEntry = (
	reportEntry: ProjectReportEntry,
): ProjectReportEntry => ({
	...reportEntry,
	files: reportEntry.files ?? [],
});

export const createProjectReportEntry = async (
	projectId: number,
	payload: CreateProjectReportEntryPayload,
) => {
	const response = await $backendApi.post<ProjectReportEntry>(
		`project-reports/projects/${projectId}/reports`,
		payload,
	);

	return normalizeProjectReportEntry(response.data);
};

export const updateProjectReportEntry = async (
	projectId: number,
	reportId: number,
	payload: UpdateProjectReportEntryPayload,
) => {
	const response = await $backendApi.patch<ProjectReportEntry>(
		`project-reports/projects/${projectId}/reports/${reportId}`,
		payload,
	);

	return normalizeProjectReportEntry(response.data);
};

export const deleteProjectReportEntry = (projectId: number, reportId: number) =>
	$backendApi.delete(`project-reports/projects/${projectId}/reports/${reportId}`);

export const uploadProjectReportEntryFile = async (
	projectId: number,
	reportId: number,
	file: File,
) => {
	const formData = new FormData();

	formData.append("file", file);

	const response = await $backendApi.post<ProjectReportEntryFile>(
		`project-reports/projects/${projectId}/reports/${reportId}/files`,
		formData,
		{
			headers: {
				"Content-Type": "multipart/form-data",
			},
		},
	);

	return response.data;
};

export const downloadProjectReportEntryFile = (
	projectId: number,
	reportId: number,
	fileId: number,
) =>
	$backendApi.get<Blob>(
		`project-reports/projects/${projectId}/reports/${reportId}/files/${fileId}`,
		{
			responseType: "blob",
		},
	);

export const deleteProjectReportEntryFile = (
	projectId: number,
	reportId: number,
	fileId: number,
) =>
	$backendApi.delete(
		`project-reports/projects/${projectId}/reports/${reportId}/files/${fileId}`,
	);
