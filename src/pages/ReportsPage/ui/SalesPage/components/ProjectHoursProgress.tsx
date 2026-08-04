import type { ProjectSummaryFormState } from "../model/reportProjectForm";
import {
	getHoursProgress,
	getProjectAutomaticHours,
} from "../model/projectHours";
import type { ProfitabilityProject } from "../model/types";
import styles from "../SalesProfitabilityReport.module.scss";

type ProjectHoursProgressProps = {
	form: ProjectSummaryFormState;
	isEditing: boolean;
	onChange: (value: ProjectSummaryFormState) => void;
	projects: ProfitabilityProject[];
};

type EditableHoursField =
	| "tzPurchasedHours"
	| "tzPlanHours"
	| "tzFactHours"
	| "developmentPurchasedHours"
	| "educationPurchasedHours"
	| "educationPlanHours"
	| "educationFactHours";

type ProjectHoursRow = {
	id: string;
	label: string;
	purchased: number;
	purchasedField?: EditableHoursField;
	plan: number;
	planField?: EditableHoursField;
	fact: number;
	factField?: EditableHoursField;
};

const toHours = (value: string | number | null | undefined) => {
	const hours = Number(value);

	return Number.isFinite(hours) && hours >= 0 ? hours : 0;
};

const formatHours = (value: number) =>
	`${value.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} ч`;

const HoursInput = ({
	field,
	form,
	onChange,
}: {
	field: EditableHoursField;
	form: ProjectSummaryFormState;
	onChange: (value: ProjectSummaryFormState) => void;
}) => (
	<input
		className={styles.projectHoursInput}
		min="0"
		step="0.1"
		type="number"
		value={form[field]}
		onChange={(event) => {
			const nextValue = event.target.value;

			if (nextValue && Number(nextValue) < 0) {
				return;
			}

			onChange({ ...form, [field]: nextValue });
		}}
	/>
);

export const ProjectHoursProgress = ({
	form,
	isEditing,
	onChange,
	projects,
}: ProjectHoursProgressProps) => {
	const automaticHours = getProjectAutomaticHours(projects);
	const summaryPlanHours =
		toHours(form.summaryPlanHours) + automaticHours.developmentPlanHours;
	const summaryFactHours =
		toHours(form.summaryFactHours) + automaticHours.developmentFactHours;
	const rows: ProjectHoursRow[] = [
		{
			id: "summary",
			label: "Общее",
			purchased: toHours(form.summaryPurchasedHours),
			plan: summaryPlanHours,
			fact: summaryFactHours,
		},
		{
			id: "tz",
			label: "ТЗ",
			purchased: toHours(form.tzPurchasedHours),
			purchasedField: "tzPurchasedHours",
			plan: toHours(form.tzPlanHours),
			planField: "tzPlanHours",
			fact: toHours(form.tzFactHours),
			factField: "tzFactHours",
		},
		{
			id: "development",
			label: "Разработка",
			purchased: toHours(form.developmentPurchasedHours),
			purchasedField: "developmentPurchasedHours",
			plan: automaticHours.developmentPlanHours,
			fact: automaticHours.developmentFactHours,
		},
		{
			id: "education",
			label: "Обучение / Сдача",
			purchased: toHours(form.educationPurchasedHours),
			purchasedField: "educationPurchasedHours",
			plan: toHours(form.educationPlanHours),
			planField: "educationPlanHours",
			fact: toHours(form.educationFactHours),
			factField: "educationFactHours",
		},
	];

	return (
		<section className={styles.projectHoursSection}>
			<div className={styles.projectHoursHeader}>
				<div>
					<h3>Часы и прогресс проекта</h3>
					<p>План и факт разработки рассчитываются автоматически</p>
				</div>
			</div>

			<div className={styles.projectHoursTable}>
				<div className={styles.projectHoursTableHead}>
					<span>Раздел</span>
					<span>Куплено</span>
					<span>План</span>
					<span>Факт</span>
					<span>Прогресс</span>
				</div>
				{rows.map((row) => {
					const progress = getHoursProgress(row.plan, row.fact);
					const progressLabel = `${Math.round(progress)}%`;

					return (
						<div key={row.id} className={styles.projectHoursRow}>
							<strong>{row.label}</strong>
							<span>
								{isEditing && row.purchasedField ? (
									<HoursInput
										field={row.purchasedField}
										form={form}
										onChange={onChange}
									/>
								) : (
									formatHours(row.purchased)
								)}
							</span>
							<span>
								{isEditing && row.planField ? (
									<HoursInput
										field={row.planField}
										form={form}
										onChange={onChange}
									/>
								) : (
									formatHours(row.plan)
								)}
							</span>
							<span>
								{isEditing && row.factField ? (
									<HoursInput
										field={row.factField}
										form={form}
										onChange={onChange}
									/>
								) : (
									formatHours(row.fact)
								)}
							</span>
							<div className={styles.projectHoursProgress}>
								<div>
									<span style={{ width: `${Math.min(progress, 100)}%` }} />
								</div>
								<strong>{progressLabel}</strong>
							</div>
						</div>
					);
				})}
			</div>
		</section>
	);
};
