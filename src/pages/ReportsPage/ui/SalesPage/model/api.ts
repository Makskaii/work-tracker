import { $api } from "@/shared/config";
import { Endpoints } from "@/shared/constants/const";
import { ProjectCodes } from "@/components/calendar/constants/const";
import type { ProfitabilityProject } from "./types";

type CrmItemListResponse<T> = {
	result?: {
		items?: T[];
	};
	next?: number | null;
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

export const ProjectIncidentCodes = {
	comment: "ufCrm30_1780490532",
	info: "ufCrm30_1780490581",
	incidentDates: "ufCrm30_1780490526415",
	project: "parentId1092",
	company: "companyId",
} as const;

export type ProjectIncident = {
	id: number | string;
	title?: string;
	createdTime?: string;
	updatedTime?: string;
	[key: string]: unknown;
};

const PROJECT_INCIDENT_SELECT_FIELDS = [
	"id",
	"title",
	"createdTime",
	"updatedTime",
	ProjectIncidentCodes.project,
	ProjectIncidentCodes.comment,
	ProjectIncidentCodes.info,
	ProjectIncidentCodes.incidentDates,
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
	const projectId = String(project.projectId ?? project.id);
	const companyId = project[ProjectCodes.company];
	const filter: Record<string, unknown> = {};

	if (includeProject) {
		filter[ProjectIncidentCodes.project] = projectId;
	}

	if (includeCompany && companyId) {
		filter[ProjectIncidentCodes.company] = companyId;
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
			entityTypeId: 1140,
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
			return await request(includeProject, includeCompany);
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
