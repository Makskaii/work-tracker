import { useMemo, useState } from "react";
import { ProjectCodes } from "@/components/calendar/constants/const";
import type { Deal } from "../../../types/deals.types";
import { formatMoney, toNumber } from "../model/profitabilityUtils";
import type { ProfitabilityProject, ProjectPayment } from "../model/types";
import styles from "../SalesProfitabilityReport.module.scss";

type MarginalityScope = "all" | "client" | "deal" | "projects";

type MarginalityTabProps = {
	deals: Deal[];
	projects: ProfitabilityProject[];
	selectedDeal: Deal | null;
	selectedProjectId: string | null;
};

const paymentStageMeta = (stageId: string) => {
	const normalizedStage = stageId.toLowerCase();

	if (normalizedStage.includes("success") || normalizedStage.includes("paid")) {
		return {
			label: "оплачено",
			className: styles.paymentPaid,
		};
	}

	if (normalizedStage.includes("fail") || normalizedStage.includes("cancel")) {
		return {
			label: "отменено",
			className: styles.paymentCanceled,
		};
	}

	if (normalizedStage.includes("debt")) {
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

const getPaymentAmount = (payment: ProjectPayment) =>
	toNumber(payment[ProjectCodes.paymentAmount]);

const getPaymentPercent = (payment: ProjectPayment, dealAmount: number) => {
	const percent = toNumber(payment[ProjectCodes.paymentPercent]);

	if (percent) {
		return percent;
	}

	const amount = getPaymentAmount(payment);

	return dealAmount ? Math.round((amount / dealAmount) * 100) : 0;
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

export const MarginalityTab = ({
	deals,
	projects,
	selectedDeal,
	selectedProjectId,
}: MarginalityTabProps) => {
	const [scope, setScope] = useState<MarginalityScope>("all");
	const dealAmount = toNumber(selectedDeal?.opportunity);
	const selectedProject = projects.find(
		(project) => String(project.projectId ?? project.id) === selectedProjectId,
	);
	const scopedProjects =
		scope === "projects" && selectedProject ? [selectedProject] : projects;
	const payments = scopedProjects.flatMap((project) =>
		project.payments.map((payment) => ({ payment, project })),
	);
	const paidAmount = payments.reduce((sum, item) => {
		const stageMeta = paymentStageMeta(item.payment.stageId ?? "");

		return stageMeta.className === styles.paymentPaid
			? sum + getPaymentAmount(item.payment)
			: sum;
	}, 0);
	const totalPaymentAmount = payments.reduce(
		(sum, item) => sum + getPaymentAmount(item.payment),
		0,
	);
	const debtAmount = Math.max((dealAmount || totalPaymentAmount) - paidAmount, 0);
	const marginPercent =
		dealAmount || totalPaymentAmount
			? Math.round((paidAmount / (dealAmount || totalPaymentAmount)) * 100)
			: 0;
	const paymentsByDate = useMemo(() => {
		return payments.reduce(
			(result, item) => {
				const date = formatDate(item.payment.createdTime);
				const group = result.get(date) ?? [];

				group.push(item);
				result.set(date, group);

				return result;
			},
			new Map<string, typeof payments>(),
		);
	}, [payments]);

	return (
		<div className={styles.tabContent}>
			<div className={styles.marginalityHeader}>
				<h3>
					Маржинальность
					{scope === "projects" && selectedProject
						? ` по проекту ${selectedProject.title}`
						: scope === "deal" && selectedDeal
							? ` по сделке ${selectedDeal.title}`
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
						Проекты сделки
					</button>
				</div>
			</div>

			<div className={styles.marginalityMetrics}>
				<div>
					<span>Сделок</span>
					<strong>{scope === "all" ? deals.length : selectedDeal ? 1 : 0}</strong>
				</div>
				<div>
					<span>Маржа</span>
					<strong className={styles.successText}>{marginPercent}%</strong>
				</div>
				<div>
					<span>Сумма</span>
					<strong>{formatMoney(dealAmount || totalPaymentAmount)}</strong>
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

			<div className={styles.marginalityCard}>
				<h4>График оплат по датам</h4>
				<div className={styles.paymentLegend}>
					<span className={styles.paymentPaid}>оплачено</span>
					<span className={styles.paymentPlanned}>нужно выполнить</span>
					<span className={styles.paymentDebt}>дебиторка</span>
					<span className={styles.paymentCanceled}>отменено</span>
				</div>
				<div className={styles.paymentChart}>
					{Array.from(paymentsByDate.entries()).map(([date, items]) => {
						const dayAmount = items.reduce(
							(sum, item) => sum + getPaymentAmount(item.payment),
							0,
						);

						return (
							<div key={date} className={styles.paymentColumn}>
								<strong>{date}</strong>
								<small>{formatMoney(dayAmount)}</small>
								<div className={styles.paymentStack}>
									{items.map(({ payment }) => {
										const percent = getPaymentPercent(payment, dealAmount);
										const stageMeta = paymentStageMeta(payment.stageId ?? "");

										return (
											<span
												key={String(payment.id)}
												className={stageMeta.className}
												style={{
													height: `${Math.max(percent, 8)}px`,
												}}
											>
												{percent}%
											</span>
										);
									})}
								</div>
							</div>
						);
					})}
				</div>
			</div>

			<div className={styles.marginalityCard}>
				<h4>Платежи</h4>
				<div className={styles.paymentsList}>
					{payments.length ? (
						payments.map(({ payment, project }) => {
							const stageMeta = paymentStageMeta(payment.stageId ?? "");
							const amount = getPaymentAmount(payment);
							const percent = getPaymentPercent(payment, dealAmount);

							return (
								<article key={String(payment.id)} className={styles.paymentItem}>
									<div>
										<strong>
											{payment.title ?? project.title} · {percent}%
										</strong>
										<span>Дата создания: {formatDate(payment.createdTime)}</span>
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
