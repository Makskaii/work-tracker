import { $backendApi } from "@/shared/config/axios/axios.config";
import { type GanttEventResponse, type GanttStageResponse, normalizeGanttEvent, normalizeGanttStage } from "./projectGanttResponses";
import type {
	ProjectGanttEventPayload,
	ProjectGanttStagePayload,
} from "./types";

export const fetchProjectGanttStages = async (
	projectId: string,
	signal?: AbortSignal,
) => {
	const response = await $backendApi.get<GanttStageResponse[]>(
		`project-reports/projects/${projectId}/gantt/stages`,
		{ signal },
	);

	return response.data.map(normalizeGanttStage);
};

export const createProjectGanttStage = async (
	projectId: string,
	payload: ProjectGanttStagePayload,
) => {
	const response = await $backendApi.post<GanttStageResponse>(
		`project-reports/projects/${projectId}/gantt/stages`,
		payload,
	);

	return normalizeGanttStage(response.data);
};

export const updateProjectGanttStage = async (
	stageId: number,
	payload: Partial<ProjectGanttStagePayload>,
) => {
	const response = await $backendApi.patch<GanttStageResponse>(
		`project-reports/gantt/stages/${stageId}`,
		payload,
	);

	return normalizeGanttStage(response.data);
};

export const deleteProjectGanttStage = (stageId: number) =>
	$backendApi.delete(`project-reports/gantt/stages/${stageId}`);

export const moveProjectGanttStageParent = async (
	stageId: number,
	parentStageId: number,
	beforeStageId: number | null,
) => {
	const response = await $backendApi.patch<GanttStageResponse[]>(
		`project-reports/gantt/stages/${stageId}/parent`,
		{ beforeStageId, parentStageId },
	);

	return response.data.map(normalizeGanttStage);
};

export const fetchProjectGanttEvents = async (
	projectId: string,
	signal?: AbortSignal,
) => {
	const response = await $backendApi.get<GanttEventResponse[]>(
		`project-reports/projects/${projectId}/gantt/events`,
		{ signal },
	);

	return response.data.map(normalizeGanttEvent);
};

export const createProjectGanttEvent = async (
	projectId: string,
	payload: ProjectGanttEventPayload,
) => {
	const response = await $backendApi.post<GanttEventResponse>(
		`project-reports/projects/${projectId}/gantt/events`,
		payload,
	);

	return normalizeGanttEvent(response.data);
};

export const updateProjectGanttEvent = async (
	eventId: number,
	payload: Partial<ProjectGanttEventPayload>,
) => {
	const response = await $backendApi.patch<GanttEventResponse>(
		`project-reports/gantt/events/${eventId}`,
		payload,
	);

	return normalizeGanttEvent(response.data);
};

export const deleteProjectGanttEvent = (eventId: number) =>
	$backendApi.delete(`project-reports/gantt/events/${eventId}`);
