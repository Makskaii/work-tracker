import { $backendApi } from "@/shared/config/axios/axios.config";
import { type ApiProjectGroup, type SupportProjectTask, toClientPackage } from "./clientHoursPackages.api";
import type { ClientPackage } from "./clientHoursPackages.types";

export type SupportWorkspaceReport = {
	id: string;
	taskId: string | null;
	taskTitle: string | null;
	responsibleName: string | null;
	date: string;
	hours: number;
	title: string | null;
	description: string | null;
	includeInPackage: boolean;
	allocations: { purchaseId: number; purchaseDate: string; hours: number }[];
	allocatedHours: number;
	unallocatedHours: number;
};

export type SupportProjectWorkspace = {
	projectId: number;
	reports: SupportWorkspaceReport[];
	tasks: SupportProjectTask[];
	packageGroup: ClientPackage;
};

export const fetchSupportProjectWorkspace = async (projectId: number, signal?: AbortSignal): Promise<SupportProjectWorkspace> => {
	const { data } = await $backendApi.get<Omit<SupportProjectWorkspace, "packageGroup"> & { packageGroup: ApiProjectGroup }>(
		`support-hours-packages/projects/${projectId}/workspace`,
		{ signal, timeout: 120_000 },
	);
	if (data.projectId !== projectId || !Array.isArray(data.reports) || !Array.isArray(data.tasks) || !data.packageGroup) {
		throw new Error("Не удалось проверить список работ проекта");
	}
	return { ...data, packageGroup: toClientPackage(data.packageGroup) };
};
