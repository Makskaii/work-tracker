import { formatHours, formatMoney } from "../model/profitabilityUtils";
import {
	type ProjectSummaryFormState,
	numberOrNull,
	projectStatusOptions,
} from "../model/reportProjectForm";
import type {
	FinancialProjectSummary,
	ReportProjectStatus,
	ReportProjectType,
} from "../model/types";
import styles from "../SalesProfitabilityReport.module.scss";

type SummaryCardsProps = {
	form: ProjectSummaryFormState;
	onEditProject: () => void;
	projectTitle: string;
	projectStatus: ReportProjectStatus | null | undefined;
	projectType: ReportProjectType;
	areAutomaticHoursUnavailable?: boolean;
	summary: FinancialProjectSummary;
};

const formatSummaryDate = (value: string | null | undefined) => {
	if (!value) {
		return "—";
	}

	const [, month, day] = value.split("-");

	return day && month ? `${day}.${month}` : value;
};

const getProjectStatusClassName = (status: ReportProjectStatus) => {
	switch (status) {
		case "in_progress":
			return styles.dealSummaryProjectStatusInProgress;
		case "inactive":
			return styles.dealSummaryProjectStatusInactive;
		case "completed":
			return styles.dealSummaryProjectStatusCompleted;
		default:
			return styles.dealSummaryProjectStatusNotStarted;
	}
};

export const SummaryCards = ({
	form,
	onEditProject,
	projectTitle,
	projectStatus,
	projectType,
	summary,
}: SummaryCardsProps) => {
	const normalizedProjectStatus = projectStatus ?? "not_started";
	const purchasedHours = numberOrNull(form.summaryPurchasedHours);
	const projectStatusLabel =
		projectStatusOptions.find(
			(option) => option.value === normalizedProjectStatus,
		)?.label ?? "Не начат";

	return (
		<div className={styles.dealSummary}>
			<button
				type="button"
				className={styles.dealSummaryEditButton}
				onClick={onEditProject}
			>
				Изменить проект
			</button>
			<div className={styles.dealSummaryMain}>
				<span className={styles.dealSummaryEyebrow}>
					{projectType === "waterfall"
						? "Финансовый вотерфол проект"
						: projectType === "support"
							? "Проект техподдержки"
							: "Проект"}
				</span>
				<h3>{projectTitle}</h3>
			</div>
			<div className={styles.dealSummarySide}>
				<div className={styles.dealSummaryStats}>
					<div className={styles.dealSummaryStat}>
						<span className={styles.dealSummaryLabel}>Статус:</span>
						<strong
							className={`${styles.dealSummaryValue} ${styles.dealSummaryProjectStatus} ${getProjectStatusClassName(normalizedProjectStatus)}`}
						>
							{projectStatusLabel}
						</strong>
					</div>
					<div className={styles.dealSummaryStat}>
						<span className={styles.dealSummaryLabel}>Сумма проекта:</span>
						<strong
							className={`${styles.dealSummaryValue} ${styles.dealSummaryProjectAmount}`}
						>
							{formatMoney(summary.revenue)}
						</strong>
					</div>
					<div className={styles.dealSummaryStat}>
						<span className={styles.dealSummaryLabel}>Куплено:</span>
						<strong
							className={`${styles.dealSummaryValue} ${styles.dealSummaryPurchased}`}
						>
							{purchasedHours === null ? "Не заданы" : formatHours(purchasedHours)}
						</strong>
					</div>
					<div className={styles.dealSummaryStat}>
						<span className={styles.dealSummaryLabel}>Дата окончания по договору:</span>
						<strong
							className={`${styles.dealSummaryValue} ${styles.dealSummaryCompletionDate}`}
						>
							{formatSummaryDate(form.contractEndDate)}
						</strong>
					</div>
				</div>
			</div>
		</div>
	);
};
