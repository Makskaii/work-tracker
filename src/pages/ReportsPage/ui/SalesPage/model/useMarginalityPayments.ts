import { useEffect, useMemo, useState } from "react";
import { ProjectCodes } from "@/components/calendar/constants/const";
import { EntityTypeIds } from "@/shared/constants/const";
import type { ClientProjectProps } from "@/shared/types/types";
import type { Deal } from "../../../types/deals.types";
import {
	fetchAllCrmItems,
	fetchProjectPaymentsByProjectIds,
	fetchProjectsByDealId,
} from "./api";
import { PROJECT_SELECT_FIELDS } from "./constants";
import { getDealProjectIds } from "./profitabilityUtils";
import type { ProfitabilityProject, ProjectPayment } from "./types";

export type MarginalityScope = "all" | "client" | "deal" | "projects";

export type PaymentProjectInfo = {
	id: string;
	title: string;
};

export type MarginalityPaymentItem = {
	payment: ProjectPayment;
	project: PaymentProjectInfo;
};

type NormalizedClientProject = ClientProjectProps & {
	projectId: string;
};

type CompanyFromCrm = {
	id: string;
	title?: string | null;
};

type UseMarginalityPaymentsParams = {
	deals: Deal[];
	projects: ProfitabilityProject[];
	scope: MarginalityScope;
	scopeDeals: Deal[];
	selectedProjectId: string | null;
};

const getUniqueValues = (values: Array<string | number | null | undefined>) =>
	Array.from(
		new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean)),
	);

const normalizeProject = (project: ClientProjectProps): NormalizedClientProject => ({
	...project,
	projectId: String(project.projectId ?? project.id),
});

const getProjectId = (project: { projectId?: string | null }) =>
	String(project.projectId ?? "");

const mergeProjects = (projectGroups: NormalizedClientProject[][]) => {
	const result = new Map<string, NormalizedClientProject>();

	projectGroups.flat().forEach((project) => {
		result.set(String(project.id), project);
	});

	return Array.from(result.values());
};

const getProjectPaymentId = (payment: ProjectPayment) =>
	String(payment[ProjectCodes.paymentProject] ?? "").trim();

const getCompanyTitle = (company: CompanyFromCrm) =>
	String(company.title ?? "").trim();

export const useMarginalityPayments = ({
	deals,
	projects,
	scope,
	scopeDeals,
	selectedProjectId,
}: UseMarginalityPaymentsParams) => {
	const [payments, setPayments] = useState<MarginalityPaymentItem[]>([]);
	const [companyTitleById, setCompanyTitleById] = useState<Map<string, string>>(
		() => new Map(),
	);
	const [isCompaniesLoading, setIsCompaniesLoading] = useState(false);
	const [isPaymentsLoading, setIsPaymentsLoading] = useState(false);
	const [error, setError] = useState<Error | null>(null);
	const companyIds = useMemo(
		() => getUniqueValues(deals.map((deal) => deal.companyId)),
		[deals],
	);
	const currentDealProjectIds = useMemo(
		() => getUniqueValues(projects.map((project) => getProjectId(project))),
		[projects],
	);

	useEffect(() => {
		const controller = new AbortController();

		const loadCompanyTitles = async () => {
			setIsCompaniesLoading(true);
			setError(null);
			const dealTitleByCompanyId = new Map<string, string>();

			deals.forEach((deal) => {
				const companyId = String(deal.companyId ?? "").trim();
				const title = String(deal.companyTitle ?? "").trim();

				if (companyId && title) {
					dealTitleByCompanyId.set(companyId, title);
				}
			});

			const missingCompanyIds = companyIds.filter(
				(companyId) => !dealTitleByCompanyId.has(companyId),
			);

			if (!missingCompanyIds.length) {
				setCompanyTitleById(dealTitleByCompanyId);
				return;
			}

			const companies = await fetchAllCrmItems<CompanyFromCrm>({
				entityTypeId: EntityTypeIds.companies,
				select: ["id", "title"],
				filter:
					missingCompanyIds.length === 1
						? { id: missingCompanyIds[0] }
						: { "@id": missingCompanyIds },
				signal: controller.signal,
			});

			if (controller.signal.aborted) {
				return;
			}

			const nextCompanyTitleById = new Map(dealTitleByCompanyId);

			companies.forEach((company) => {
				const companyId = String(company.id ?? "").trim();
				const title = getCompanyTitle(company);

				if (companyId && title) {
					nextCompanyTitleById.set(companyId, title);
				}
			});

			setCompanyTitleById(nextCompanyTitleById);
		};

		loadCompanyTitles()
			.catch((loadError) => {
				if (!controller.signal.aborted) {
					setError(
						loadError instanceof Error
							? loadError
							: new Error(String(loadError)),
					);
				}
			})
			.finally(() => {
				if (!controller.signal.aborted) {
					setIsCompaniesLoading(false);
				}
			});

		return () => {
			controller.abort();
		};
	}, [companyIds, deals]);

	useEffect(() => {
		const controller = new AbortController();
		const currentProjectTitleById = new Map(
			projects.map((project) => [
				getProjectId(project),
				project.title || `Проект #${getProjectId(project)}`,
			]),
		);

		const loadScopePayments = async () => {
			setIsPaymentsLoading(true);
			setError(null);
			const dealProjectIds = getUniqueValues(
				scopeDeals.flatMap((deal) => getDealProjectIds(deal)),
			);
			const projectIds =
				scope === "projects" && selectedProjectId
					? [selectedProjectId]
					: getUniqueValues([...dealProjectIds, ...currentDealProjectIds]);
			const scopeDealIds =
				scope === "projects" && selectedProjectId
					? []
					: getUniqueValues(scopeDeals.map((deal) => deal.id));
			const projectRequests: Array<Promise<NormalizedClientProject[]>> = [];

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
					}).then((items) => items.map(normalizeProject)),
				);
			}

			projectRequests.push(
				...scopeDealIds.map((dealId) =>
					fetchProjectsByDealId(dealId, controller.signal).then((items) =>
						items.map(normalizeProject),
					),
				),
			);

			const scopeProjects = mergeProjects(await Promise.all(projectRequests));
			const scopeProjectIds = getUniqueValues([
				...projectIds,
				...scopeProjects.map((project) => getProjectId(project)),
			]);
			const projectTitleById = new Map(currentProjectTitleById);

			scopeProjects.forEach((project) => {
				const projectId = getProjectId(project);

				projectTitleById.set(projectId, project.title || `Проект #${projectId}`);
			});

			const scopePayments = await fetchProjectPaymentsByProjectIds({
				projectIds: scopeProjectIds,
				signal: controller.signal,
			});

			if (controller.signal.aborted) {
				return;
			}

			setPayments(
				scopePayments.map((payment) => {
					const projectId = getProjectPaymentId(payment);

					return {
						payment,
						project: {
							id: projectId,
							title: projectTitleById.get(projectId) ?? `Проект #${projectId}`,
						},
					};
				}),
			);
		};

		loadScopePayments()
			.catch((loadError) => {
				if (!controller.signal.aborted) {
					setError(
						loadError instanceof Error
							? loadError
							: new Error(String(loadError)),
					);
					setPayments([]);
				}
			})
			.finally(() => {
				if (!controller.signal.aborted) {
					setIsPaymentsLoading(false);
				}
			});

		return () => {
			controller.abort();
		};
	}, [currentDealProjectIds, projects, scope, scopeDeals, selectedProjectId]);

	return {
		payments,
		companyTitleById,
		isLoading: isCompaniesLoading || isPaymentsLoading,
		error,
	};
};
