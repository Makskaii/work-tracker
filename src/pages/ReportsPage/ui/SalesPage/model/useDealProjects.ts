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
import { fetchAllCrmItems } from "./api";
import {
	PROJECT_SELECT_FIELDS,
	REPORT_SELECT_FIELDS,
} from "./constants";
import { getDealProjectIds } from "./profitabilityUtils";
import type { ProfitabilityProject, ProjectPayment } from "./types";

const PROJECT_PAYMENT_SELECT_FIELDS = [
	"id",
	"title",
	"createdTime",
	ProjectCodes.paymentStage,
	ProjectCodes.paymentStageBinding,
	ProjectCodes.paymentPercent,
	ProjectCodes.paymentAmount,
	ProjectCodes.paymentProject,
] as const;

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
			if (!projectIds.length) {
				setProjects([]);
				return;
			}

			setIsLoadingDetails(true);

			try {
				const dealProjects = await fetchAllCrmItems<ClientProjectProps>({
					entityTypeId: EntityTypeIds.projects,
					select: PROJECT_SELECT_FIELDS,
					filter:
						projectIds.length === 1
							? { id: projectIds[0] }
							: { "@id": projectIds },
					signal: controller.signal,
				});

				const preparedProjects = await Promise.all(
					dealProjects.map(async (project) => {
						const projectId = String(project.projectId ?? project.id);
						const companyId = String(
							project[ProjectCodes.company] ?? "",
						).trim();

						const [tasks, reports, payments] = await Promise.all([
							fetchAllCrmItems<TaskProps>({
								entityTypeId: EntityTypeIds.tasks,
								select: TASK_SELECT_FIELDS,
								filter: {
									[TaskCodes.parentproject]: projectId,
									...(companyId ? { [TaskCodes.company]: companyId } : {}),
								},
								signal: controller.signal,
							}),
							fetchAllCrmItems<ReportProps>({
								entityTypeId: EntityTypeIds.reports,
								select: REPORT_SELECT_FIELDS,
								filter: {
									[ReportCodes.parentproject]: projectId,
									...(companyId ? { [ReportCodes.company]: companyId } : {}),
									stageId: ReportStageIds.confirmed,
								},
								signal: controller.signal,
							}),
							fetchAllCrmItems<ProjectPayment>({
								entityTypeId: EntityTypeIds.projectPayments,
								select: PROJECT_PAYMENT_SELECT_FIELDS,
								filter: {
									[ProjectCodes.paymentProject]: projectId,
								},
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
