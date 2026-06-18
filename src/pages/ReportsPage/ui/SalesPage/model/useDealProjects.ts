import { useEffect, useState } from "react";
import {
	ProjectCodes,
	ReportCodes,
	ReportStageIds,
	TaskCodes,
} from "@/components/calendar/constants/const";
import type { ReportProps } from "@/components/calendar/types/types";
import { EntityTypeIds, TASK_SELECT_FIELDS } from "@/shared/constants/const";
import type { ClientProjectProps, TaskProps } from "@/shared/types/types";
import { fetchAllCrmItems, fetchProjectPaymentsByProjectIds } from "./api";
import { PROJECT_SELECT_FIELDS, REPORT_SELECT_FIELDS } from "./constants";
import type { ProfitabilityProject } from "./types";

type ProjectsState = {
	isLoading: boolean;
	projects: ProfitabilityProject[];
};

// TODO: rename to useCompanyProjects after the sales report fully drops deal-based naming.
export const useDealProjects = () => {
	const [projectsState, setProjectsState] = useState<ProjectsState>({
		isLoading: false,
		projects: [],
	});

	useEffect(() => {
		const controller = new AbortController();

		const fetchProjects = async () => {
			setProjectsState({
				isLoading: true,
				projects: [],
			});

			try {
				const projects = await fetchAllCrmItems<ClientProjectProps>({
					entityTypeId: EntityTypeIds.projects,
					select: PROJECT_SELECT_FIELDS,
					filter: {},
					signal: controller.signal,
				});

				const preparedProjects = await Promise.all(
					projects.map(async (project) => {
						const projectId = String(project.projectId ?? project.id);
						const companyId = String(
							project[ProjectCodes.company] ?? "",
						).trim();
						const tasksProjectFilter = {
							[TaskCodes.parentproject]: projectId,
						};
						const tasksStrictFilter = {
							...tasksProjectFilter,
							...(companyId ? { [TaskCodes.company]: companyId } : {}),
						};
						const reportsProjectFilter = {
							[ReportCodes.parentproject]: projectId,
							stageId: ReportStageIds.confirmed,
						};
						const reportsStrictFilter = {
							...reportsProjectFilter,
							...(companyId ? { [ReportCodes.company]: companyId } : {}),
						};

						const fetchProjectTasks = async () => {
							const tasks = await fetchAllCrmItems<TaskProps>({
								entityTypeId: EntityTypeIds.tasks,
								select: TASK_SELECT_FIELDS,
								filter: tasksStrictFilter,
								signal: controller.signal,
							});

							if (tasks.length || !companyId) {
								return tasks;
							}

							return fetchAllCrmItems<TaskProps>({
								entityTypeId: EntityTypeIds.tasks,
								select: TASK_SELECT_FIELDS,
								filter: tasksProjectFilter,
								signal: controller.signal,
							});
						};

						const fetchProjectReports = async () => {
							const reports = await fetchAllCrmItems<ReportProps>({
								entityTypeId: EntityTypeIds.reports,
								select: REPORT_SELECT_FIELDS,
								filter: reportsStrictFilter,
								signal: controller.signal,
							});

							if (reports.length || !companyId) {
								return reports;
							}

							return fetchAllCrmItems<ReportProps>({
								entityTypeId: EntityTypeIds.reports,
								select: REPORT_SELECT_FIELDS,
								filter: reportsProjectFilter,
								signal: controller.signal,
							});
						};

						const [tasks, reports, payments] = await Promise.all([
							fetchProjectTasks(),
							fetchProjectReports(),
							fetchProjectPaymentsByProjectIds({
								projectIds: [projectId],
								signal: controller.signal,
							}),
						]);

						return {
							...project,
							projectId,
							tasks,
							reports,
							payments,
						};
					}),
				);

				if (!controller.signal.aborted) {
					setProjectsState({
						isLoading: false,
						projects: preparedProjects,
					});
				}
			} catch (error) {
				if (!controller.signal.aborted) {
					console.error("Failed to fetch company profitability data", error);
					setProjectsState({
						isLoading: false,
						projects: [],
					});
				}
			}
		};

		fetchProjects();

		return () => {
			controller.abort();
		};
	}, []);

	return {
		projects: projectsState.projects,
		isLoadingDetails: projectsState.isLoading,
	};
};
