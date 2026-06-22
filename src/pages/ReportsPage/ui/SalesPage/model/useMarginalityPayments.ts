import { useEffect, useMemo, useState } from "react";
import { ProjectCodes } from "@/components/calendar/constants/const";
import { EntityTypeIds } from "@/shared/constants/const";
import type { Deal } from "../../../types/deals.types";
import {
	fetchAllCrmItems,
	fetchProjectPaymentStageBindingLabels,
	fetchProjectPaymentsByProjectIds,
} from "./api";
import type { ProfitabilityProject, ProjectPayment } from "./types";

export type MarginalityScope = "all" | "client" | "project";

export type PaymentProjectInfo = {
	id: string;
	title: string;
};

export type MarginalityPaymentItem = {
	payment: ProjectPayment;
	project: PaymentProjectInfo;
};

type CompanyFromCrm = {
	id: string;
	title?: string | null;
};

type UseMarginalityPaymentsParams = {
	deals: Deal[];
	projects: ProfitabilityProject[];
	scope: MarginalityScope;
	selectedProjectId: string | null;
};

const getUniqueValues = (values: Array<string | number | null | undefined>) =>
	Array.from(
		new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean)),
	);

const getProjectId = (project: { projectId?: string | null }) =>
	String(project.projectId ?? "");

const getProjectPaymentId = (payment: ProjectPayment) =>
	String(payment[ProjectCodes.paymentProject] ?? "").trim();

const getProjectCompanyId = (project?: ProfitabilityProject | null) =>
	String(project?.[ProjectCodes.company] ?? "").trim();

const getCompanyTitle = (company: CompanyFromCrm) =>
	String(company.title ?? "").trim();

export const useMarginalityPayments = ({
	deals,
	projects,
	scope,
	selectedProjectId,
}: UseMarginalityPaymentsParams) => {
	const [payments, setPayments] = useState<MarginalityPaymentItem[]>([]);
	const [companyTitleById, setCompanyTitleById] = useState<Map<string, string>>(
		() => new Map(),
	);
	const [paymentStageBindingLabelById, setPaymentStageBindingLabelById] =
		useState<Map<string, string>>(() => new Map());
	const [isCompaniesLoading, setIsCompaniesLoading] = useState(false);
	const [isPaymentsLoading, setIsPaymentsLoading] = useState(false);
	const [error, setError] = useState<Error | null>(null);
	const companyIds = useMemo(
		() => getUniqueValues(projects.map((project) => project[ProjectCodes.company])),
		[projects],
	);
	const currentProjectIds = useMemo(
		() => getUniqueValues(projects.map((project) => getProjectId(project))),
		[projects],
	);
	const selectedProject = useMemo(
		() => projects.find((project) => getProjectId(project) === selectedProjectId),
		[projects, selectedProjectId],
	);
	const scopeProjectIds = useMemo(() => {
		if (scope === "project" && selectedProjectId) {
			return [selectedProjectId];
		}

		if (scope === "client") {
			const selectedCompanyId = getProjectCompanyId(selectedProject);

			if (!selectedCompanyId) {
				return currentProjectIds;
			}

			return getUniqueValues(
				projects
					.filter(
						(project) => getProjectCompanyId(project) === selectedCompanyId,
					)
					.map((project) => getProjectId(project)),
			);
		}

		return currentProjectIds;
	}, [currentProjectIds, projects, scope, selectedProject, selectedProjectId]);

	useEffect(() => {
		const controller = new AbortController();

		const loadCompanyTitles = async () => {
			setIsCompaniesLoading(true);
			setError(null);
			const companyTitleFromDealsById = new Map<string, string>();

			deals.forEach((deal) => {
				const companyId = String(deal.companyId ?? "").trim();
				const title = String(deal.companyTitle ?? "").trim();

				if (companyId && title) {
					companyTitleFromDealsById.set(companyId, title);
				}
			});

			const missingCompanyIds = companyIds.filter(
				(companyId) => !companyTitleFromDealsById.has(companyId),
			);

			if (!missingCompanyIds.length) {
				setCompanyTitleById(companyTitleFromDealsById);
				return;
			}

			const companies = await fetchAllCrmItems<CompanyFromCrm>({
				entityTypeId: EntityTypeIds.companies,
				select: ["id", "title"],
				filter: { "@id": missingCompanyIds },
				signal: controller.signal,
			});

			if (controller.signal.aborted) {
				return;
			}

			const nextCompanyTitleById = new Map(companyTitleFromDealsById);

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
			projects.map((project) => {
				const projectId = getProjectId(project);

				return [projectId, project.title || `Проект #${projectId}`];
			}),
		);

		const loadScopePayments = async () => {
			setIsPaymentsLoading(true);
			setError(null);
			const scopePayments = await fetchProjectPaymentsByProjectIds({
				projectIds: scopeProjectIds,
				signal: controller.signal,
			});
			let stageBindingLabels = new Map<string, string>();

			try {
				stageBindingLabels =
					await fetchProjectPaymentStageBindingLabels(controller.signal);
			} catch (labelsError) {
				if (controller.signal.aborted) {
					throw labelsError;
				}
			}

			if (controller.signal.aborted) {
				return;
			}

			setPaymentStageBindingLabelById(stageBindingLabels);
			setPayments(
				scopePayments.map((payment) => {
					const projectId = getProjectPaymentId(payment);

					return {
						payment,
						project: {
							id: projectId,
							title: currentProjectTitleById.get(projectId) ?? `Проект #${projectId}`,
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
	}, [projects, scopeProjectIds]);

	return {
		payments,
		companyTitleById,
		paymentStageBindingLabelById,
		isLoading: isCompaniesLoading || isPaymentsLoading,
		error,
	};
};
