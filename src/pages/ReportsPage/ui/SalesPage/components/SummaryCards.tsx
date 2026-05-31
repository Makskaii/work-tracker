import {
	formatHours,
	formatMoney,
} from "../model/profitabilityUtils";
import type { DealSummary } from "../model/types";
import styles from "../SalesProfitabilityReport.module.scss";
import { MetricCard } from "./MetricCard";

type SummaryCardsProps = {
	summary: DealSummary;
};

export const SummaryCards = ({ summary }: SummaryCardsProps) => (
	<div className={styles.summaryGrid}>
		<MetricCard
			title="Куплено часов"
			value={formatHours(summary.purchasedHours)}
		/>
		<MetricCard
			title="Сумма сделки"
			value={formatMoney(summary.revenue)}
			accent
		/>
		<MetricCard title="План из задач" value={formatHours(summary.planHours)} />
		<MetricCard
			title="Факт по отчётам"
			value={formatHours(summary.factHours)}
		/>
		<MetricCard
			title="Потери всего"
			value={formatHours(summary.lossHours)}
			danger
		/>
		<MetricCard
			title="Маржа"
			value={`${summary.mockMarginPercent}%`}
			success
			muted
		/>
	</div>
);
