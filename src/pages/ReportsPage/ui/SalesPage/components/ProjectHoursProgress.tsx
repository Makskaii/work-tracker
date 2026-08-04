import type { ProjectSummaryFormState } from "../model/reportProjectForm";
import { getProjectAutomaticHours } from "../model/projectHours";
import type { ProfitabilityProject } from "../model/types";
import styles from "../SalesProfitabilityReport.module.scss";

type ProjectHoursProgressProps = {
	form: ProjectSummaryFormState;
	projects: ProfitabilityProject[];
};

type ProjectHoursRow = {
	id: string;
	label: string;
	purchased: number;
	plan: number;
	fact: number;
	progress: number;
};

const toHours = (value: string | number | null | undefined) => {
	const hours = Number(value);

	return Number.isFinite(hours) && hours >= 0 ? hours : 0;
};

const formatHours = (value: number) =>
	`${value.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} ч`;

export const ProjectHoursProgress = ({
	form,
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
			purchased: automaticHours.developmentPurchasedHours,
			plan: summaryPlanHours,
			fact: summaryFactHours,
			progress: automaticHours.overallTaskProgress,
		},
		{
			id: "tz",
			label: "ТЗ",
			purchased: toHours(form.tzPurchasedHours),
			plan: toHours(form.tzPlanHours),
			fact: toHours(form.tzFactHours),
			progress: automaticHours.overallTaskProgress,
		},
		{
			id: "development",
			label: "Разработка",
			purchased: automaticHours.developmentPurchasedHours,
			plan: automaticHours.developmentPlanHours,
			fact: automaticHours.developmentFactHours,
			progress: automaticHours.developmentTaskProgress,
		},
		{
			id: "education",
			label: "Обучение / Сдача",
			purchased: toHours(form.educationPurchasedHours),
			plan: toHours(form.educationPlanHours),
			fact: toHours(form.educationFactHours),
			progress: automaticHours.overallTaskProgress,
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
					const progressLabel = `${row.progress.toLocaleString("ru-RU", {
						minimumFractionDigits: 1,
						maximumFractionDigits: 1,
					})}%`;

					return (
						<div key={row.id} className={styles.projectHoursRow}>
							<strong>{row.label}</strong>
							<span>{formatHours(row.purchased)}</span>
							<span>
								{formatHours(row.plan)}
							</span>
							<span>
								{formatHours(row.fact)}
							</span>
							<div className={styles.projectHoursProgress}>
								<div>
									<span style={{ width: `${row.progress}%` }} />
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
