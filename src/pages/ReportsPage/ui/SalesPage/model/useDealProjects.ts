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
import type { Deal } from "../../../types/deals.types";
import { fetchAllCrmItems, fetchProjectPaymentsByProjectIds } from "./api";
import { PROJECT_SELECT_FIELDS, REPORT_SELECT_FIELDS } from "./constants";
import type { ProfitabilityProject } from "./types";

type DealProjectsState = {
	dealId: string | null;
	isLoading: boolean;
	projects: ProfitabilityProject[];
};

const mergeProjectsById = (projectGroups: ClientProjectProps[][]) => {
	const result = new Map<string, ClientProjectProps>();

	projectGroups.flat().forEach((project) => {
		result.set(String(project.id), project);
	});

	return Array.from(result.values());
};

export const useDealProjects = (selectedDeal: Deal | null) => {
	const [projectsState, setProjectsState] = useState<DealProjectsState>({
		dealId: null,
		isLoading: false,
		projects: [],
	});
	useEffect(() => {
		if (!selectedDeal) {
			return;
		}

		const controller = new AbortController();
		const companyId = String(selectedDeal.companyId ?? "").trim();

		const fetchDealProjects = async () => {
			setProjectsState({
				dealId: companyId,
				isLoading: true,
				projects: [],
			});

			try {
				const dealProjects = companyId
					? mergeProjectsById([
							await fetchAllCrmItems<ClientProjectProps>({
								entityTypeId: EntityTypeIds.projects,
								select: PROJECT_SELECT_FIELDS,
								filter: {
									[ProjectCodes.company]: companyId,
								},
								signal: controller.signal,
							}),
						])
					: [];

				if (!dealProjects.length) {
					setProjectsState({
						dealId: companyId,
						isLoading: false,
						projects: [],
					});
					return;
				}

				const preparedProjects = await Promise.all(
					dealProjects.map(async (project) => {
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
						dealId: companyId,
						isLoading: false,
						projects: preparedProjects,
					});
				}
			} catch (error) {
				if (!controller.signal.aborted) {
					console.error("Failed to fetch deal profitability data", error);
					setProjectsState({
						dealId: companyId,
						isLoading: false,
						projects: [],
					});
				}
			}
		};

		fetchDealProjects();

		return () => {
			controller.abort();
		};
	}, [selectedDeal]);

	if (!selectedDeal) {
		return {
			projects: [],
			isLoadingDetails: false,
		};
	}

	const selectedCompanyId = String(selectedDeal.companyId ?? "").trim();
	const isCurrentDealState = projectsState.dealId === selectedCompanyId;

	return {
		projects: isCurrentDealState ? projectsState.projects : [],
		isLoadingDetails: isCurrentDealState ? projectsState.isLoading : true,
	};
};
