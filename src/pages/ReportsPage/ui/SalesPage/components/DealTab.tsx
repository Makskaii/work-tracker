import type { User } from "@/shared/types/types";
import type { Deal } from "../../../types/deals.types";
import { formatHours } from "../model/profitabilityUtils";
import type { DealSummary, ProfitabilityProject } from "../model/types";
import styles from "../SalesProfitabilityReport.module.scss";
import { MetricCard } from "./MetricCard";
import { ProjectsTable } from "./ProjectsTable";

type DealTabProps = {
	projects: ProfitabilityProject[];
	summary: DealSummary;
	selectedDeal: Deal | null;
	users: User[];
};

export const DealTab = ({
	projects,
	summary,
	selectedDeal,
	users,
}: DealTabProps) => (
	<div className={styles.tabContent}>
		<ProjectsTable
			projects={projects}
			purchasedHours={summary.purchasedHours}
			users={users}
		/>
		<div className={styles.detailCard}>
			<div className={styles.detailTitle}>
				{selectedDeal?.title ?? "Сделка"} · детализация
			</div>
			<div className={styles.detailStats}>
				<MetricCard
					title="Куплено из сделки"
					value={formatHours(summary.purchasedHours)}
				/>
				<MetricCard
					title="План из задач"
					value={formatHours(summary.planHours)}
				/>
				<MetricCard
					title="Факт отчётов"
					value={formatHours(summary.factHours)}
				/>
				<MetricCard
					title="Unpaid / Company paid"
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
		</div>
	</div>
);
