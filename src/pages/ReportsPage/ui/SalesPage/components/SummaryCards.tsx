import type { ReactNode } from "react";
import { formatHours, formatMoney } from "../model/profitabilityUtils";
import type { FinancialProjectSummary } from "../model/types";
import styles from "../SalesProfitabilityReport.module.scss";

type ProjectSummaryFormState = {
	projectAmount: string;
	summaryFactCompletionDate: string;
	summaryFactHours: string;
	summaryLossHours: string;
	summaryMarginPercent: string;
	summaryPlanCompletionDate: string;
	summaryPlanHours: string;
	summaryPurchasedHours: string;
};

type SummaryCardsProps = {
	form: ProjectSummaryFormState;
	isEditing: boolean;
	isSaving: boolean;
	onCancel: () => void;
	onChange: (value: ProjectSummaryFormState) => void;
	onEdit: () => void;
	onSave: () => void;
	projectTitle: string;
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
	saveError,
	summary,
}: SummaryCardsProps) => (
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
					<span className={styles.dealSummaryLabel}>Сумма проекта</span>
					{isEditing ? (
						<SummaryInlineValue className={styles.dealSummaryAmount} unit="₽">
							<SummaryInput
								className={styles.dealSummaryPrimaryInput}
								form={form}
								name="projectAmount"
								onChange={onChange}
								type="number"
							/>
						</SummaryInlineValue>
					) : (
						<strong className={styles.dealSummaryAmount}>
							{formatMoney(summary.revenue)}
						</strong>
					)}
				</div>
			</div>
		</div>
		<div className={styles.dealSummarySide}>
			<div className={styles.dealSummaryStats}>
				<div className={styles.dealSummaryStat}>
					<span className={styles.dealSummaryLabel}>Куплено:</span>
					{isEditing ? (
						<SummaryInlineValue className={styles.dealSummaryValue} unit="ч">
							<SummaryInput
								form={form}
								name="summaryPurchasedHours"
								onChange={onChange}
								type="number"
							/>
						</SummaryInlineValue>
					) : (
						<strong className={styles.dealSummaryValue}>
							{formatHours(summary.purchasedHours)}
						</strong>
					)}
				</div>
				<div className={styles.dealSummaryStat}>
					<span className={styles.dealSummaryLabel}>План:</span>
					{isEditing ? (
						<SummaryInlineValue className={styles.dealSummaryValue} unit="ч">
							<SummaryInput
								form={form}
								name="summaryPlanHours"
								onChange={onChange}
								type="number"
							/>
						</SummaryInlineValue>
					) : (
						<strong className={styles.dealSummaryValue}>
							{formatHours(summary.planHours)}
						</strong>
					)}
				</div>
				<div className={styles.dealSummaryStat}>
					<span className={styles.dealSummaryLabel}>Факт:</span>
					{isEditing ? (
						<SummaryInlineValue className={styles.dealSummaryValue} unit="ч">
							<SummaryInput
								form={form}
								name="summaryFactHours"
								onChange={onChange}
								type="number"
							/>
						</SummaryInlineValue>
					) : (
						<strong className={styles.dealSummaryValue}>
							{formatHours(summary.factHours)}
						</strong>
					)}
				</div>
				<div className={styles.dealSummaryStat}>
					<span className={styles.dealSummaryLabel}>Потери:</span>
					{isEditing ? (
						<SummaryInlineValue
							className={`${styles.dealSummaryValue} ${styles.dealSummaryDanger}`}
							unit="ч"
						>
							<SummaryInput
								form={form}
								name="summaryLossHours"
								onChange={onChange}
								type="number"
							/>
						</SummaryInlineValue>
					) : (
						<strong
							className={`${styles.dealSummaryValue} ${styles.dealSummaryDanger}`}
						>
							{formatHours(summary.lossHours)}
						</strong>
					)}
				</div>
				<div className={styles.dealSummaryStat}>
					<span className={styles.dealSummaryLabel}>План. заверш.:</span>
					{isEditing ? (
						<strong className={styles.dealSummaryValue}>
							<SummaryInput
								className={styles.dealSummaryDateInput}
								form={form}
								name="summaryPlanCompletionDate"
								onChange={onChange}
								type="date"
							/>
						</strong>
					) : (
						<strong className={styles.dealSummaryValue}>
							{formatSummaryDate(form.summaryPlanCompletionDate)}
						</strong>
					)}
				</div>
				<div className={styles.dealSummaryStat}>
					<span className={styles.dealSummaryLabel}>Факт. заверш.:</span>
					{isEditing ? (
						<strong className={styles.dealSummaryValue}>
							<SummaryInput
								className={styles.dealSummaryDateInput}
								form={form}
								name="summaryFactCompletionDate"
								onChange={onChange}
								type="date"
							/>
						</strong>
					) : (
						<strong className={styles.dealSummaryValue}>
							{formatSummaryDate(form.summaryFactCompletionDate)}
						</strong>
					)}
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
