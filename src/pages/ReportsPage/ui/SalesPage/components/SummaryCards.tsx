import { formatHours, formatMoney } from "../model/profitabilityUtils";
import type { FinancialProjectSummary } from "../model/types";
import styles from "../SalesProfitabilityReport.module.scss";

type SummaryCardsProps = {
	projectTitle: string;
	summary: FinancialProjectSummary;
};

export const SummaryCards = ({ projectTitle, summary }: SummaryCardsProps) => (
	<div className={styles.dealSummary}>
		<div className={styles.dealSummaryMain}>
			<span className={styles.dealSummaryEyebrow}>Финансовый вотерфол проект</span>
			<h3>{projectTitle}</h3>
			<div className={styles.dealSummaryPrimaryStats}>
				<div>
					<span className={styles.dealSummaryLabel}>Сумма проекта</span>
					<strong className={styles.dealSummaryAmount}>
						{formatMoney(summary.revenue)}
					</strong>
				</div>
				<div>
					<span className={styles.dealSummaryLabel}>Маржа</span>
					<strong className={styles.dealSummaryMargin}>
						{summary.mockMarginPercent}%
					</strong>
					<small>mock / disabled</small>
				</div>
			</div>
		</div>
		<div className={styles.dealSummarySide}>
			<div className={styles.dealSummaryStats}>
				<div className={styles.dealSummaryStat}>
					<span className={styles.dealSummaryLabel}>Куплено:</span>
					<strong className={styles.dealSummaryValue}>
						{formatHours(summary.purchasedHours)}
					</strong>
				</div>
				<div className={styles.dealSummaryStat}>
					<span className={styles.dealSummaryLabel}>План:</span>
					<strong className={styles.dealSummaryValue}>
						{formatHours(summary.planHours)}
					</strong>
				</div>
				<div className={styles.dealSummaryStat}>
					<span className={styles.dealSummaryLabel}>Факт:</span>
					<strong className={styles.dealSummaryValue}>
						{formatHours(summary.factHours)}
					</strong>
				</div>
				<div className={styles.dealSummaryStat}>
					<span className={styles.dealSummaryLabel}>Потери:</span>
					<strong
						className={`${styles.dealSummaryValue} ${styles.dealSummaryDanger}`}
					>
						{formatHours(summary.lossHours)}
					</strong>
				</div>
				<div className={styles.dealSummaryStat}>
					<span className={styles.dealSummaryLabel}>План. заверш.:</span>
					<strong className={styles.dealSummaryValue}>—</strong>
				</div>
				<div className={styles.dealSummaryStat}>
					<span className={styles.dealSummaryLabel}>Факт. заверш.:</span>
					<strong className={styles.dealSummaryValue}>—</strong>
				</div>
			</div>
		</div>
	</div>
);
