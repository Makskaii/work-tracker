import { useCallback, useMemo, useState } from "react";
import { ProjectCodes } from "@/components/calendar/constants/const";
import type { Deal } from "../../../types/deals.types";
import {
	getPaymentAmount,
	getProjectPaymentStageType,
} from "../model/paymentUtils";
import { formatMoney, getProjectAmount } from "../model/profitabilityUtils";
import type { ProfitabilityProject } from "../model/types";
import {
	type MarginalityScope,
	useMarginalityPayments,
} from "../model/useMarginalityPayments";
import styles from "../SalesProfitabilityReport.module.scss";

type MarginalityTabProps = {
	deals: Deal[];
	projects: ProfitabilityProject[];
	selectedProjectId: string | null;
};

const paymentStageMeta = (stageId?: string | null) => {
	const stageType = getProjectPaymentStageType(stageId);

	if (stageType === "paid") {
		return {
			label: "оплачено",
			className: styles.paymentPaid,
		};
	}

	return {
		label: "неоплачено",
		className: styles.paymentCanceled,
	};
};

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

const getStageBindingValues = (value?: string | string[] | null) => {
	const values = Array.isArray(value) ? value : [value];

	return values.map((item) => String(item ?? "").trim()).filter(Boolean);
};

const formatStageBindingValue = (
	value: string | string[] | null | undefined,
	labelById: Map<string, string>,
) => {
	const values = getStageBindingValues(value);

	if (!values.length) {
		return "—";
	}

	return values.map((item) => labelById.get(item) ?? item).join(", ");
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

const getProjectCompanyTitle = (
	projects: ProfitabilityProject[],
	companyTitleById: Map<string, string>,
) => {
	const companyId = String(projects[0]?.[ProjectCodes.company] ?? "").trim();

	if (!companyId) {
		return "клиенту";
	}

	return companyTitleById.get(companyId) || `Клиент #${companyId}`;
};

const getProjectCompanyId = (project?: ProfitabilityProject | null) =>
	String(project?.[ProjectCodes.company] ?? "").trim();

const getProjectId = (project?: ProfitabilityProject | null) =>
	String(project?.projectId ?? "").trim();

const getScopeProjects = (
	projects: ProfitabilityProject[],
	scope: MarginalityScope,
	selectedProjectId: string | null,
) => {
	if (scope === "project" && selectedProjectId) {
		return projects.filter((project) => project.projectId === selectedProjectId);
	}

	if (scope === "client") {
		const selectedProject = projects.find(
			(project) => project.projectId === selectedProjectId,
		);
		const selectedCompanyId = getProjectCompanyId(selectedProject);

		if (!selectedCompanyId) {
			return projects;
		}

		return projects.filter(
			(project) => getProjectCompanyId(project) === selectedCompanyId,
		);
	}

	return projects;
};

export const MarginalityTab = ({
	deals,
	projects,
	selectedProjectId,
}: MarginalityTabProps) => {
	const [scope, setScope] = useState<MarginalityScope>("all");
	const selectedProject = projects.find(
		(project) => project.projectId === selectedProjectId,
	);
	const scopedProjects = useMemo(
		() => getScopeProjects(projects, scope, selectedProjectId),
		[projects, scope, selectedProjectId],
	);
	const projectById = useMemo(
		() => new Map(projects.map((project) => [getProjectId(project), project])),
		[projects],
	);
	const projectAmount = scopedProjects.reduce(
		(sum, project) => sum + getProjectAmount(project),
		0,
	);

	const {
		payments,
		companyTitleById,
		paymentStageBindingLabelById,
		isLoading,
		error,
	} =
		useMarginalityPayments({
		deals,
		projects,
		scope,
		selectedProjectId,
	});
	const getPaymentProjectAmount = useCallback(
		(item: (typeof payments)[number]) => {
			const projectId = String(item.project.id ?? "").trim();
			const paymentProject = projectById.get(projectId);
			const fallbackProject =
				scopedProjects.length === 1 ? scopedProjects[0] : undefined;

			return getProjectAmount(paymentProject ?? fallbackProject);
		},
		[projectById, scopedProjects],
	);
	const paidAmount = payments.reduce((sum, item) => {
		const stageType = getProjectPaymentStageType(item.payment.stageId);

		return stageType === "paid"
			? sum + getPaymentAmount(item.payment, getPaymentProjectAmount(item))
			: sum;
	}, 0);
	const debtAmount = payments.reduce((sum, item) => {
		const stageType = getProjectPaymentStageType(item.payment.stageId);

		return stageType === "debt"
			? sum + getPaymentAmount(item.payment, getPaymentProjectAmount(item))
			: sum;
	}, 0);
	const requestAmount = Math.max(projectAmount - paidAmount, 0);
	const marginPercent =
		projectAmount
			? Math.round((paidAmount / projectAmount) * 100)
			: 0;
	const paymentsByMonth = useMemo(() => {
		return payments.reduce(
			(result, item) => {
				const date = getPaymentDate(
					item.payment[ProjectCodes.paymentDate] ?? undefined,
				);

				const key = date ? getMonthKey(date) : "no-date";
				const group = result.get(key) ?? {
					date,
					items: [],
				};

				group.items.push(item);
				result.set(key, group);

				return result;
			},
			new Map<string, { date: Date | null; items: typeof payments }>(),
		);
	}, [payments]);
	const chartColumns = useMemo(() => {
		const columns = Array.from(paymentsByMonth.entries()).map(([key, group]) => {
			const amount = group.items.reduce(
				(sum, item) =>
					sum + getPaymentAmount(item.payment, getPaymentProjectAmount(item)),
				0,
			);
			const segments = group.items
				.map((item) => ({
					...item,
					amount: getPaymentAmount(item.payment, getPaymentProjectAmount(item)),
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
	}, [getPaymentProjectAmount, paymentsByMonth]);
	const hasChartColumns = chartColumns.length > 0;
	const paymentListItems = useMemo(() => {
		const stageCounters = new Map<string, number>();

		return payments.map((item) => {
			const stageMeta = paymentStageMeta(item.payment.stageId);
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
					{scope === "project" && selectedProject
						? ` по вотерфол проекту ${selectedProject.title}`
						: scope === "client"
								? ` по ${getProjectCompanyTitle(scopedProjects, companyTitleById)}`
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
						className={scope === "project" ? styles.activeFilter : ""}
						onClick={() => setScope("project")}
					>
						Проект
					</button>
				</div>
			</div>

			<div className={styles.marginalityMetrics}>
				<div>
					<span>Проектов</span>
					<strong>{scopedProjects.length}</strong>
				</div>
				<div>
					<span>Маржа</span>
					<strong className={styles.successText}>{marginPercent}%</strong>
				</div>
				<div>
					<span>Сумма</span>
					<strong className={styles.amountText}>
						{formatMoney(projectAmount)}
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
					<span className={styles.paymentCanceled}>неоплачено</span>
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
												<strong>{date ? formatMonthLabel(date) : "Без даты"}</strong>
												<small>{formatMoney(periodAmount)}</small>
											</div>
											<div
												className={styles.stackedBar}
												style={{ height: `${columnHeight}px` }}
											>
												{segments.length ? (
													segments.map(({ amount, payment }) => {
														const stageMeta = paymentStageMeta(payment.stageId);

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
																title={formatMoney(amount)}
															>
																{formatMoney(amount)}
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
					{error ? (
						<div className={styles.emptyState}>Не удалось загрузить оплаты</div>
					) : isLoading ? (
						<div className={styles.emptyState}>Загрузка оплат...</div>
					) : payments.length ? (
						paymentListItems.map(({ payment, paymentNumber, project, stageMeta }) => {
							const paymentProjectAmount = getPaymentProjectAmount({
								payment,
								project,
							});
							const amount = getPaymentAmount(payment, paymentProjectAmount);

							return (
								<article key={String(payment.id)} className={styles.paymentItem}>
									<div>
										<strong>
											{project.title} · {paymentNumber} платеж
										</strong>
										<span>
											Дата платежа:{" "}
											{formatDate(payment[ProjectCodes.paymentDate] ?? undefined)}
										</span>
										<small className={styles.paymentStageBinding}>
											Привязка к этапу:{" "}
											{formatStageBindingValue(
												payment[ProjectCodes.paymentStageBinding],
												paymentStageBindingLabelById,
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
