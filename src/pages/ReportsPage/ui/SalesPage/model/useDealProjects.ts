import { useEffect, useState } from "react";
import {
	ProjectCodes,
	ReportCodes,
	ReportStageIds,
	TaskCodes,
} from "@/components/calendar/constants/const";
import type { ReportProps } from "@/components/calendar/types/types";
import {
	EntityTypeIds,
	TASK_SELECT_FIELDS,
} from "@/shared/constants/const";
import type { ClientProjectProps, TaskProps } from "@/shared/types/types";
import type { Deal } from "../../../types/deals.types";
import { fetchAllCrmItems, fetchProjectPaymentsByProjectIds } from "./api";
import {
	PROJECT_SELECT_FIELDS,
	REPORT_SELECT_FIELDS,
} from "./constants";
import { getDealProjectIds } from "./profitabilityUtils";
import type { ProfitabilityProject } from "./types";

const mergeProjectsById = (projectGroups: ClientProjectProps[][]) => {
	const result = new Map<string, ClientProjectProps>();

	projectGroups.flat().forEach((project) => {
		result.set(String(project.id), project);
	});

	return Array.from(result.values());
};

export const useDealProjects = (selectedDeal: Deal | null) => {
	const [projects, setProjects] = useState<ProfitabilityProject[]>([]);
	const [isLoadingDetails, setIsLoadingDetails] = useState(false);

	useEffect(() => {
		if (!selectedDeal) {
			setProjects([]);
			return;
		}

		const controller = new AbortController();
		const projectIds = getDealProjectIds(selectedDeal);

		const fetchDealProjects = async () => {
			setIsLoadingDetails(true);

			try {
				const projectRequests: Array<Promise<ClientProjectProps[]>> = [
					fetchAllCrmItems<ClientProjectProps>({
						entityTypeId: EntityTypeIds.projects,
						select: PROJECT_SELECT_FIELDS,
						filter: {
							[ProjectCodes.parentproject]: selectedDeal.id,
						},
						signal: controller.signal,
					}),
				];

				if (projectIds.length) {
					projectRequests.push(
						fetchAllCrmItems<ClientProjectProps>({
							entityTypeId: EntityTypeIds.projects,
							select: PROJECT_SELECT_FIELDS,
							filter:
								projectIds.length === 1
									? { id: projectIds[0] }
									: { "@id": projectIds },
							signal: controller.signal,
						}),
					);
				}

				const dealProjects = mergeProjectsById(await Promise.all(projectRequests));

				if (!dealProjects.length) {
					setProjects([]);
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
					setProjects(preparedProjects);
				}
			} catch (error) {
				if (!controller.signal.aborted) {
					console.error("Failed to fetch deal profitability data", error);
					setProjects([]);
				}
			} finally {
				if (!controller.signal.aborted) {
					setIsLoadingDetails(false);
				}
			}
		};

		fetchDealProjects();

		return () => {
			controller.abort();
		};
	}, [selectedDeal]);

	return {
		projects,
		isLoadingDetails,
	};
};
