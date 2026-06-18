import { useMemo, useState } from "react";
import { ProjectCodes } from "@/components/calendar/constants/const";
import type { Deal } from "../../../types/deals.types";
import {
	getPaymentAmount,
	getPaymentPercent,
	getPaymentStageBindingLabel,
	getProjectPaymentStageType,
} from "../model/paymentUtils";
import { formatMoney } from "../model/profitabilityUtils";
import type { ProfitabilityProject } from "../model/types";
import {
	type MarginalityScope,
	useMarginalityPayments,
} from "../model/useMarginalityPayments";
import styles from "../SalesProfitabilityReport.module.scss";

type MarginalityTabProps = {
	deals: Deal[];
	projects: ProfitabilityProject[];
	selectedDeal: Deal | null;
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

const getDealCompanyTitle = (
	deal: Deal | null,
	companyTitleById: Map<string, string>,
) => {
	if (!deal) {
		return "клиенту";
	}

	const normalizedTitle = String(deal.companyTitle ?? "").trim();
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
	const selectedProject = projects.find(
		(project) => project.projectId === selectedProjectId,
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
	const dealAmount = 0;

	const { payments, companyTitleById, isLoading, error } =
		useMarginalityPayments({
		deals,
		projects,
		scope,
		scopeDeals,
		selectedProjectId,
	});
	const paidAmount = payments.reduce((sum, item) => {
		const stageType = getProjectPaymentStageType(item.payment.stageId);

		return stageType === "paid"
			? sum + getPaymentAmount(item.payment, dealAmount)
			: sum;
	}, 0);
	const totalPaymentAmount = payments.reduce(
		(sum, item) => sum + getPaymentAmount(item.payment, dealAmount),
		0,
	);
	const debtAmount = payments.reduce((sum, item) => {
		const stageType = getProjectPaymentStageType(item.payment.stageId);

		return stageType === "debt"
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
				const date = getPaymentDate(
					item.payment[ProjectCodes.paymentDate] ?? undefined,
				);

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
	}, [paymentsByMonth]);
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
					{scope === "projects" && selectedProject
						? ` по проекту ${selectedProject.title}`
						: scope === "deal" && selectedDeal
							? ` по финансовому проекту ${selectedDeal.title}`
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
						Финансовый вотерфол проект
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
					<span>Проектов</span>
					<strong>{projects.length}</strong>
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
					{error ? (
						<div className={styles.emptyState}>Не удалось загрузить оплаты</div>
					) : isLoading ? (
						<div className={styles.emptyState}>Загрузка оплат...</div>
					) : payments.length ? (
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
										<span>
											Дата платежа:{" "}
											{formatDate(payment[ProjectCodes.paymentDate] ?? undefined)}
										</span>
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
