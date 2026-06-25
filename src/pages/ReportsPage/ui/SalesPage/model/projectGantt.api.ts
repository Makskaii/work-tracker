import { $backendApi } from "@/shared/config/axios/axios.config";
import type {
	ProjectGanttEvent,
	ProjectGanttEventPayload,
	ProjectGanttStage,
	ProjectGanttStagePayload,
} from "./types";

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
