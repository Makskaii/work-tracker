import type { ReactNode } from "react";
import { formatHours, formatMoney } from "../model/profitabilityUtils";
import {
	projectStatusOptions,
	type ProjectSummaryFormState,
} from "../model/reportProjectForm";
import type {
	FinancialProjectSummary,
	ReportProjectStatus,
} from "../model/types";
import styles from "../SalesProfitabilityReport.module.scss";

type SummaryCardsProps = {
	form: ProjectSummaryFormState;
	isEditing: boolean;
	isSaving: boolean;
	onCancel: () => void;
	onChange: (value: ProjectSummaryFormState) => void;
	onEdit: () => void;
	onSave: () => void;
	projectTitle: string;
	projectStatus: ReportProjectStatus | null | undefined;
	saveError: string | null;
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

const SummaryInput = ({
	className,
	form,
	name,
	onChange,
	type = "text",
}: {
	className?: string;
	form: ProjectSummaryFormState;
	name: keyof ProjectSummaryFormState;
	onChange: (value: ProjectSummaryFormState) => void;
	type?: "date" | "number" | "text";
}) => (
	<input
		type={type}
		value={form[name]}
		className={className}
		placeholder={type === "date" ? "дд.мм.гггг" : "—"}
		onClick={(event) => {
			if (type === "date") {
				event.currentTarget.showPicker?.();
			}
		}}
		onChange={(event) =>
			onChange({
				...form,
				[name]: event.target.value,
			})
		}
	/>
);

const SummaryInlineValue = ({
	children,
	className,
	unit,
}: {
	children: ReactNode;
	className?: string;
	unit?: string;
}) => (
	<strong className={className}>
		{children}
		{unit ? <span className={styles.dealSummaryUnit}>{unit}</span> : null}
	</strong>
);

export const SummaryCards = ({
	form,
	isEditing,
	isSaving,
	onCancel,
	onChange,
	onEdit,
	onSave,
	projectTitle,
	projectStatus,
	saveError,
	summary,
}: SummaryCardsProps) => {
	const normalizedProjectStatus = projectStatus ?? "not_started";
	const projectStatusLabel =
		projectStatusOptions.find(
			(option) => option.value === normalizedProjectStatus,
		)?.label ?? "Не начат";

	return (
		<div
		className={`${styles.dealSummary} ${
			isEditing ? styles.dealSummaryEditing : ""
		}`}
	>
		<button
			type="button"
			className={styles.dealSummaryEditButton}
			disabled={isSaving}
			onClick={isEditing ? onCancel : onEdit}
			aria-label={
				isEditing ? "Отменить редактирование метрик" : "Редактировать метрики проекта"
			}
		>
			✎
		</button>
		<div className={styles.dealSummaryMain}>
			<span className={styles.dealSummaryEyebrow}>
				Финансовый вотерфол проект
			</span>
			<h3>{projectTitle}</h3>
			<div className={styles.dealSummaryPrimaryStats}>
				<div>
					<span className={styles.dealSummaryLabel}>Дата завершения</span>
					{isEditing ? (
						<strong
							className={`${styles.dealSummaryAmount} ${styles.dealSummaryCompletionDate}`}
						>
							<SummaryInput
								className={styles.dealSummaryDateInput}
								form={form}
								name="summaryPlanCompletionDate"
								onChange={onChange}
								type="date"
							/>
						</strong>
					) : (
						<strong
							className={`${styles.dealSummaryAmount} ${styles.dealSummaryCompletionDate}`}
						>
							{formatSummaryDate(form.summaryPlanCompletionDate)}
						</strong>
					)}
				</div>
			</div>
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
					{isEditing ? (
						<SummaryInlineValue
							className={`${styles.dealSummaryValue} ${styles.dealSummaryProjectAmount}`}
							unit="₽"
						>
							<SummaryInput
								className={styles.dealSummaryPrimaryInput}
								form={form}
								name="projectAmount"
								onChange={onChange}
								type="number"
							/>
						</SummaryInlineValue>
					) : (
						<strong
							className={`${styles.dealSummaryValue} ${styles.dealSummaryProjectAmount}`}
						>
							{formatMoney(summary.revenue)}
						</strong>
					)}
				</div>
				<div className={styles.dealSummaryStat}>
					<span className={styles.dealSummaryLabel}>Куплено:</span>
					<strong
						className={`${styles.dealSummaryValue} ${styles.dealSummaryPurchased}`}
					>
						{formatHours(summary.purchasedHours)}
					</strong>
				</div>
				<div className={styles.dealSummaryStat}>
					<span className={styles.dealSummaryLabel}>Факт:</span>
					<strong
						className={`${styles.dealSummaryValue} ${
							summary.factHours > summary.planHours
								? styles.dealSummaryFactOverPlan
								: styles.dealSummaryFactWithinPlan
						}`}
					>
						{formatHours(summary.factHours)}
					</strong>
				</div>
			</div>
			{saveError ? <p className={styles.dealSummaryError}>{saveError}</p> : null}
			{isEditing ? (
				<div className={styles.dealSummaryActions}>
					<button type="button" disabled={isSaving} onClick={onSave}>
						{isSaving ? "Сохранение..." : "Сохранить"}
					</button>
				</div>
			) : null}
		</div>
		</div>
	);
};
