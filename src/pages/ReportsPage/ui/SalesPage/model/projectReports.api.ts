import { $backendApi } from "@/shared/config/axios/axios.config";
import type {
	CreateProjectReportEntryPayload,
	ProjectReportEntry,
	ProjectReportEntryFile,
	ReportProject,
	ReportProjectFile,
	ReportProjectFileKind,
	ReportProjectPayload,
	UpdateProjectReportEntryPayload,
} from "./types";

const normalizeReportProject = (project: ReportProject): ReportProject => ({
	...project,
	analystId: project.analystId ?? null,
	developmentTeamIds: project.developmentTeamIds ?? null,
	files: project.files ?? [],
	nextProjectReportDate: project.nextProjectReportDate ?? null,
	projectType: project.projectType ?? "none",
	qaId: project.qaId ?? null,
	responsibleId: project.responsibleId ?? null,
	salesManagerId: project.salesManagerId ?? null,
});

const normalizeProjectReportEntry = (
	reportEntry: ProjectReportEntry,
): ProjectReportEntry => ({
	...reportEntry,
	files: reportEntry.files ?? [],
});

export const fetchReportProjects = async (signal?: AbortSignal) => {
	const response = await $backendApi.get<ReportProject[]>(
		"project-reports/projects",
		{ signal },
	);

	return response.data.map(normalizeReportProject);
};

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
