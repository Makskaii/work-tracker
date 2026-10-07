import { useCallback, useEffect, useRef, useState } from "react";
import {
	ProjectCodes,
	ReportCodes,
	ReportStageIds,
	TaskCodes,
} from "@/components/calendar/constants/const";
import type { ReportProps } from "@/components/calendar/types/types";
import { Endpoints, EntityTypeIds, TASK_SELECT_FIELDS } from "@/shared/constants/const";
import { clearBitrixReadCache } from "@/shared/config/axios/axios.config";
import type { ClientProjectProps, TaskProps } from "@/shared/types/types";
import { fetchAllCrmItems } from "./api";
import { PROJECT_SELECT_FIELDS, REPORT_SELECT_FIELDS } from "./constants";
import type { ProfitabilityProject } from "./types";

type ProjectsState = {
	companyTitleById: Map<string, string>;
	isLoading: boolean;
	isRefreshing: boolean;
	hasLoaded: boolean;
	projects: ProfitabilityProject[];
	error: string | null;
};

type CompanyFromCrm = {
	id: string | number;
	title?: string | null;
};

export type ProfitabilityProjectReference = Pick<
	ProfitabilityProject,
	"id" | "projectId" | "title"
>;

export const fetchProfitabilityProjectDetails = async (
	project: ProfitabilityProjectReference,
	signal?: AbortSignal,
): Promise<ProfitabilityProject> => {
	const projectId = String(project.projectId ?? project.id).trim();

	if (!/^\d+$/.test(projectId) || Number(projectId) <= 0) {
		throw new Error("Не указана связь с проектом Битрикс24");
	}

	// The project relation is authoritative. Company can be missing or stale on
	// an otherwise correctly linked task/report, so it must not narrow this query.
	const fetchProjectTasks = () =>
		fetchAllCrmItems<TaskProps>({
			entityTypeId: EntityTypeIds.tasks,
			select: TASK_SELECT_FIELDS,
			filter: { [TaskCodes.parentproject]: projectId },
			signal,
		});

	const fetchProjectReports = () =>
		fetchAllCrmItems<ReportProps>({
			entityTypeId: EntityTypeIds.reports,
			select: REPORT_SELECT_FIELDS,
			filter: {
				[ReportCodes.parentproject]: projectId,
				stageId: ReportStageIds.confirmed,
			},
			signal,
		});

	// The current payment list/Gantt loads payments from Work Tracker's API.
	// The retired CRM payment type is not part of task/report metrics.
	const [linkedProjects, tasks, reports] = await Promise.all([
		fetchAllCrmItems<ClientProjectProps>({
			entityTypeId: EntityTypeIds.projects,
			select: ["id", "title", "assignedById", ProjectCodes.company],
			filter: { id: projectId },
			signal,
		}),
		fetchProjectTasks(),
		fetchProjectReports(),
	]);
	const linkedProject = linkedProjects.find((item) => String(item.id) === projectId);
	if (!linkedProject) {
		throw new Error("Связанный проект Битрикс24 не найден или недоступен");
	}

	return {
		...linkedProject,
		projectId,
		tasks,
		reports,
		payments: [],
	};
};

export const useCompanyProjects = ({ enabled = true } = {}) => {
	const [projectsState, setProjectsState] = useState<ProjectsState>({
		companyTitleById: new Map(),
		isLoading: true,
		isRefreshing: false,
		hasLoaded: false,
		projects: [],
		error: null,
	});
	const [requestRevision, setRequestRevision] = useState(0);
	const completedRevision = useRef<number | null>(null);
	const reloadProjects = useCallback(() => {
		clearBitrixReadCache([Endpoints.crmItems]);
		setRequestRevision((value) => value + 1);
	}, []);

	useEffect(() => {
		if (!enabled || completedRevision.current === requestRevision) return;
		const controller = new AbortController();

		const fetchProjects = async () => {
			setProjectsState((previous) => ({
				...previous,
				isLoading: !previous.hasLoaded,
				isRefreshing: previous.hasLoaded,
				error: null,
			}));

			try {
				// New projects may belong to a company with no existing project yet.
				const [projects, companies] = await Promise.all([
					fetchAllCrmItems<ClientProjectProps>({
						entityTypeId: EntityTypeIds.projects,
						select: PROJECT_SELECT_FIELDS,
						filter: {},
						signal: controller.signal,
					}),
					fetchAllCrmItems<CompanyFromCrm>({
						entityTypeId: EntityTypeIds.companies,
						select: ["id", "title"],
						filter: {},
						signal: controller.signal,
					}),
				]);
				const companyTitleEntries: Array<[string, string]> = companies
					.map((company): [string, string] => [
						String(company.id ?? "").trim(),
						String(company.title ?? "").trim(),
					])
					.filter(([id, title]) => id && title);
				const companyTitleById = new Map(companyTitleEntries);

				const preparedProjects = projects.map((project) => ({
					...project,
					projectId: String(project.projectId ?? project.id),
					tasks: [],
					reports: [],
					payments: [],
				}));

				if (!controller.signal.aborted) {
					completedRevision.current = requestRevision;
					setProjectsState({
						companyTitleById,
						isLoading: false,
						isRefreshing: false,
						hasLoaded: true,
						projects: preparedProjects,
						error: null,
					});
				}
			} catch (error) {
				if (!controller.signal.aborted) {
					controller.abort();
					console.error("Failed to fetch company profitability data", error);
					setProjectsState((previous) => ({
						...previous,
						isLoading: false,
						isRefreshing: false,
						error:
							error instanceof Error
								? error.message
								: "Не удалось загрузить проекты из Битрикс24",
					}));
				}
			}
		};

		fetchProjects();

		return () => {
			controller.abort();
		};
	}, [enabled, requestRevision]);

	return {
		companyTitleById: projectsState.companyTitleById,
		projects: projectsState.projects,
		isLoadingDetails: enabled && projectsState.isLoading,
		isRefreshing: enabled && projectsState.isRefreshing,
		error: projectsState.error,
		reloadProjects,
	};
};
