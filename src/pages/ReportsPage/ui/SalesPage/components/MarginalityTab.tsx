import { useEffect, useMemo, useState } from "react";
import { ProjectCodes } from "@/components/calendar/constants/const";
import { EntityTypeIds } from "@/shared/constants/const";
import type { ClientProjectProps } from "@/shared/types/types";
import type { Deal } from "../../../types/deals.types";
import { fetchAllCrmItems, fetchProjectPaymentsByProjectIds } from "../model/api";
import { PROJECT_SELECT_FIELDS } from "../model/constants";
import {
	getPaymentAmount,
	getPaymentPercent,
	getPaymentStageBindingLabel,
	getProjectPaymentStageType,
} from "../model/paymentUtils";
import {
	formatMoney,
	getDealProjectIds,
	toNumber,
} from "../model/profitabilityUtils";
import type { ProfitabilityProject, ProjectPayment } from "../model/types";
import styles from "../SalesProfitabilityReport.module.scss";

type MarginalityScope = "all" | "client" | "deal" | "projects";

type MarginalityTabProps = {
	deals: Deal[];
	projects: ProfitabilityProject[];
	selectedDeal: Deal | null;
	selectedProjectId: string | null;
};

type PaymentProjectInfo = {
	id: string;
	title: string;
};

type PaymentItem = {
	payment: ProjectPayment;
	project: PaymentProjectInfo;
};

type CompanyFromCrm = {
	id: string | number;
	title?: string | null;
	TITLE?: string | null;
};

const paymentStageMeta = (stageId: string) => {
	const stageType = getProjectPaymentStageType(stageId);

	if (stageType === "paid") {
		return {
			label: "оплачено",
			className: styles.paymentPaid,
		};
	}

	if (stageType === "canceled") {
		return {
			label: "отменено",
			className: styles.paymentCanceled,
		};
	}

	if (stageType === "debt") {
		return {
			label: "дебиторка",
			className: styles.paymentDebt,
		};
	}

	return {
		label: "нужно выполнить",
		className: styles.paymentPlanned,
	};
};

const formatPercent = (value: number) => `${Number.isFinite(value) ? value : 0}%`;

const formatDate = (value?: string) => {
	if (!value) {
		return "—";
	}

	const date = new Date(value);

	if (Number.isNaN(date.getTime())) {
		return value;
	}

	return new Intl.DateTimeFormat("ru-RU", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	}).format(date);
};

const getPaymentDate = (value?: string) => {
	if (!value) {
		return null;
	}

	const date = new Date(value);

	return Number.isNaN(date.getTime()) ? null : date;
};

const getMonthKey = (date: Date) =>
	`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const formatMonthLabel = (date: Date) =>
	new Intl.DateTimeFormat("ru-RU", {
		month: "short",
		year: "2-digit",
	})
		.format(date)
		.replace(".", "");

const getMonthKeyTime = (key: string) => {
	const [year, month] = key.split("-").map(Number);
	const date = new Date(year, month - 1, 1);

	return Number.isNaN(date.getTime()) ? Number.POSITIVE_INFINITY : date.getTime();
};

const getUniqueValues = (values: Array<string | number | null | undefined>) =>
	Array.from(
		new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean)),
	);

const getProjectId = (project: {
	id: string | number;
	projectId?: string | number | null;
}) => String(project.projectId ?? project.id);

const mergeProjects = (projectGroups: ClientProjectProps[][]) => {
	const result = new Map<string, ClientProjectProps>();

	projectGroups.flat().forEach((project) => {
		result.set(String(project.id), project);
	});

	return Array.from(result.values());
};

const getProjectPaymentId = (payment: ProjectPayment) =>
	String(payment[ProjectCodes.paymentProject] ?? "").trim();

const getCompanyTitle = (company: CompanyFromCrm) =>
	String(company.title ?? company.TITLE ?? "").trim();

const getDealCompanyTitle = (
	deal: Deal | null,
	companyTitleById: Map<string, string>,
) => {
	if (!deal) {
		return "клиенту";
	}

	const record = deal as Deal & Record<string, unknown>;
	const company = record.company;
	const companyRecord =
		company && typeof company === "object"
			? (company as Record<string, unknown>)
			: null;
	const title =
		record.companyTitle ??
		record.companyName ??
		record.COMPANY_TITLE ??
		record.COMPANY_NAME ??
		companyRecord?.title ??
		companyRecord?.name;
	const normalizedTitle = String(title ?? "").trim();
	const companyId = String(deal.companyId ?? "").trim();

	return (
		normalizedTitle ||
		(companyId ? companyTitleById.get(companyId) : "") ||
		`Клиент #${deal.companyId ?? "—"}`
	);
};

export const MarginalityTab = ({
	deals,
	projects,
	selectedDeal,
	selectedProjectId,
}: MarginalityTabProps) => {
	const [scope, setScope] = useState<MarginalityScope>("all");
	const [payments, setPayments] = useState<PaymentItem[]>([]);
	const [companyTitleById, setCompanyTitleById] = useState<Map<string, string>>(
		() => new Map(),
	);
	const selectedProject = projects.find(
		(project) => String(project.projectId ?? project.id) === selectedProjectId,
	);
	const companyIds = useMemo(
		() => getUniqueValues(deals.map((deal) => deal.companyId)),
		[deals],
	);
	const currentDealProjectIds = useMemo(
		() => getUniqueValues(projects.map((project) => getProjectId(project))),
		[projects],
	);
	const scopeDeals = useMemo(() => {
		if (scope === "all") {
			return deals;
		}

		if (scope === "client") {
			const companyId = String(selectedDeal?.companyId ?? "").trim();

			return companyId
				? deals.filter((deal) => String(deal.companyId ?? "").trim() === companyId)
				: selectedDeal
					? [selectedDeal]
					: [];
		}

		return selectedDeal ? [selectedDeal] : [];
	}, [deals, scope, selectedDeal]);
	const dealAmount = scopeDeals.reduce(
		(sum, deal) => sum + toNumber(deal.opportunity),
		0,
	);

	useEffect(() => {
		const controller = new AbortController();

		const loadCompanyTitles = async () => {
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

		loadCompanyTitles().catch((error) => {
			if (!controller.signal.aborted) {
				console.error("Failed to fetch deal companies", error);
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
			const projectRequests: Array<Promise<ClientProjectProps[]>> = [];

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

			projectRequests.push(
				...scopeDealIds.map((dealId) =>
					fetchAllCrmItems<ClientProjectProps>({
						entityTypeId: EntityTypeIds.projects,
						select: PROJECT_SELECT_FIELDS,
						filter: {
							[ProjectCodes.parentDeal]: dealId,
						},
						signal: controller.signal,
					}),
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

		loadScopePayments().catch((error) => {
			if (!controller.signal.aborted) {
				console.error("Failed to fetch marginality payments", error);
				setPayments([]);
			}
		});

		return () => {
			controller.abort();
		};
	}, [currentDealProjectIds, projects, scope, scopeDeals, selectedProjectId]);
	const paidAmount = payments.reduce((sum, item) => {
		const stageMeta = paymentStageMeta(item.payment.stageId ?? "");

		return stageMeta.className === styles.paymentPaid
			? sum + getPaymentAmount(item.payment, dealAmount)
			: sum;
	}, 0);
	const totalPaymentAmount = payments.reduce(
		(sum, item) => sum + getPaymentAmount(item.payment, dealAmount),
		0,
	);
	const debtAmount = payments.reduce((sum, item) => {
		const stageMeta = paymentStageMeta(item.payment.stageId ?? "");

		return stageMeta.className === styles.paymentPlanned
			? sum + getPaymentAmount(item.payment, dealAmount)
			: sum;
	}, 0);
	const requestAmount = Math.max((dealAmount || totalPaymentAmount) - paidAmount, 0);
	const marginPercent =
		dealAmount || totalPaymentAmount
			? Math.round((paidAmount / (dealAmount || totalPaymentAmount)) * 100)
			: 0;
	const paymentsByMonth = useMemo(() => {
		return payments.reduce(
			(result, item) => {
				const date = getPaymentDate(item.payment.createdTime);

				if (!date) {
					return result;
				}

				const key = getMonthKey(date);
				const group = result.get(key) ?? {
					date,
					items: [],
				};

				group.items.push(item);
				result.set(key, group);

				return result;
			},
			new Map<string, { date: Date; items: typeof payments }>(),
		);
	}, [payments]);
	const chartColumns = useMemo(() => {
		const columns = Array.from(paymentsByMonth.entries()).map(([key, group]) => {
			const amount = group.items.reduce(
				(sum, item) => sum + getPaymentAmount(item.payment, dealAmount),
				0,
			);
			const segments = group.items
				.map((item) => ({
					...item,
					amount: getPaymentAmount(item.payment, dealAmount),
					percent: getPaymentPercent(item.payment, dealAmount),
				}))
				.filter((item) => item.amount > 0);

			return {
				key,
				date: group.date,
				items: group.items,
				amount,
				segments,
			};
		});
		columns.sort((a, b) => getMonthKeyTime(a.key) - getMonthKeyTime(b.key));
		const maxAmount = Math.max(...columns.map((column) => column.amount), 1);

		return columns.map((column) => ({
			...column,
			maxAmount,
		}));
	}, [dealAmount, paymentsByMonth]);
	const hasChartColumns = chartColumns.length > 0;
	const paymentListItems = useMemo(() => {
		const stageCounters = new Map<string, number>();

		return payments.map((item) => {
			const stageMeta = paymentStageMeta(item.payment.stageId ?? "");
			const nextPaymentNumber = (stageCounters.get(stageMeta.label) ?? 0) + 1;

			stageCounters.set(stageMeta.label, nextPaymentNumber);

			return {
				...item,
				paymentNumber: nextPaymentNumber,
				stageMeta,
			};
		});
	}, [payments]);

	return (
		<div className={styles.tabContent}>
			<div className={styles.marginalityHeader}>
				<h3>
					Список оплат
					{scope === "projects" && selectedProject
						? ` по проекту ${selectedProject.title}`
						: scope === "deal" && selectedDeal
							? ` по сделке ${selectedDeal.title}`
							: scope === "client"
								? ` по ${getDealCompanyTitle(selectedDeal, companyTitleById)}`
							: " по всем клиентам"}
				</h3>

				<div className={styles.marginalityFilters}>
					<button
						type="button"
						className={scope === "all" ? styles.activeFilter : ""}
						onClick={() => setScope("all")}
					>
						Все клиенты
					</button>
					<button
						type="button"
						className={scope === "client" ? styles.activeFilter : ""}
						onClick={() => setScope("client")}
					>
						Клиент
					</button>
					<button
						type="button"
						className={scope === "deal" ? styles.activeFilter : ""}
						onClick={() => setScope("deal")}
					>
						Сделка
					</button>
					<button
						type="button"
						className={scope === "projects" ? styles.activeFilter : ""}
						onClick={() => setScope("projects")}
					>
						Проект
					</button>
				</div>
			</div>

			<div className={styles.marginalityMetrics}>
				<div>
					<span>Сделок</span>
					<strong>{scopeDeals.length}</strong>
				</div>
				<div>
					<span>Маржа</span>
					<strong className={styles.successText}>{marginPercent}%</strong>
				</div>
				<div>
					<span>Сумма</span>
					<strong className={styles.amountText}>
						{formatMoney(dealAmount || totalPaymentAmount)}
					</strong>
				</div>
				<div>
					<span>Оплачено</span>
					<strong className={styles.successText}>{formatMoney(paidAmount)}</strong>
				</div>
				<div>
					<span>Дебиторка</span>
					<strong className={styles.warningText}>{formatMoney(debtAmount)}</strong>
				</div>
			</div>
			<div className={styles.requestCard}>
				<span>Запросить</span>
				<strong className={styles.requestText}>{formatMoney(requestAmount)}</strong>
			</div>

			<div className={styles.marginalityCard}>
				<h4>График оплат по датам</h4>
				<div className={styles.paymentLegend}>
					<span className={styles.paymentPaid}>оплачено</span>
					<span className={styles.paymentPlanned}>нужно выполнить</span>
					<span className={styles.paymentDebt}>дебиторка</span>
					<span className={styles.paymentCanceled}>отменено</span>
				</div>
				<div className={styles.paymentChart}>
					{hasChartColumns ? (
						<div
							className={`${styles.chartPlot} ${
								chartColumns.length === 1 ? styles.chartPlotSingle : ""
							}`}
						>
							<div className={styles.chartAxisLabel}>к оплате</div>
							{chartColumns.map(
								({ key, date, amount: periodAmount, maxAmount, segments }) => {
									const columnHeight = periodAmount
										? Math.max((periodAmount / maxAmount) * 150, 48)
										: 0;

									return (
										<div key={key} className={styles.periodColumn}>
											<div className={styles.periodHeader}>
												<strong>{formatMonthLabel(date)}</strong>
												<small>{formatMoney(periodAmount)}</small>
											</div>
											<div
												className={styles.stackedBar}
												style={{ height: `${columnHeight}px` }}
											>
												{segments.length ? (
													segments.map(({ amount, payment, percent }) => {
														const stageMeta = paymentStageMeta(payment.stageId ?? "");

														return (
															<span
																key={String(payment.id)}
																className={`${styles.paymentSegment} ${stageMeta.className}`}
																style={{
																	height: `${Math.max(
																		(amount / periodAmount) * columnHeight,
																		16,
																	)}px`,
																}}
																title={`${formatMoney(amount)} · ${formatPercent(
																	percent,
																)}`}
															>
																{formatPercent(percent)}
															</span>
														);
													})
												) : (
													<span className={styles.paymentZeroSegment} />
												)}
											</div>
										</div>
									);
								},
							)}
						</div>
					) : (
						<div className={styles.paymentChartEmpty}>
							Платежи по выбранному контексту не найдены
						</div>
					)}
				</div>
			</div>

			<div className={styles.marginalityCard}>
				<h4>Платежи</h4>
				<div className={styles.paymentsList}>
					{payments.length ? (
						paymentListItems.map(({ payment, paymentNumber, project, stageMeta }) => {
							const amount = getPaymentAmount(payment, dealAmount);
							const percent = getPaymentPercent(payment, dealAmount);

							return (
								<article key={String(payment.id)} className={styles.paymentItem}>
									<div>
										<strong>
											{project.title} · {paymentNumber} платеж ·{" "}
											{formatPercent(percent)}
										</strong>
										<span>Дата создания: {formatDate(payment.createdTime)}</span>
										<small>
											Этап:{" "}
											{getPaymentStageBindingLabel(
												payment[ProjectCodes.paymentStageBinding],
											)}
										</small>
									</div>
									<b>{formatMoney(amount)}</b>
									<em className={stageMeta.className}>{stageMeta.label}</em>
								</article>
							);
						})
					) : (
						<div className={styles.emptyState}>Платежи не найдены</div>
					)}
				</div>
			</div>
		</div>
	);
};
