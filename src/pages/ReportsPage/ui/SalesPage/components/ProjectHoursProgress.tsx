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

const formatDeviationHours = (value: number) =>
	`${value > 0 ? "+" : ""}${formatHours(value)}`;

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
	const [summaryRow, ...stageRows] = rows;
	const summaryDeviation = summaryRow.fact - summaryRow.plan;

	return (
		<section className={styles.projectHoursSection}>
			<div className={styles.projectHoursOverview}>
				<div className={styles.projectHoursHeading}>
					<span>Итог</span>
					<h3>Часы и прогресс проекта</h3>
					<p>План и факт разработки рассчитываются автоматически</p>
				</div>
				<div className={styles.projectHoursSummaryMetrics}>
					<div>
						<span>План</span>
						<strong>{formatHours(summaryRow.plan)}</strong>
					</div>
					<div>
						<span>Факт</span>
						<strong>{formatHours(summaryRow.fact)}</strong>
					</div>
					<div>
						<span>Отклонение</span>
						<strong
							className={
								summaryDeviation > 0
									? styles.projectHoursDeviationOver
									: summaryDeviation < 0
										? styles.projectHoursDeviationWithin
										: styles.projectHoursDeviationNeutral
							}
						>
							{formatDeviationHours(summaryDeviation)}
						</strong>
					</div>
				</div>
			</div>

			<div className={styles.projectHoursOverallProgress}>
				<div className={styles.projectHoursProgressLabel}>
					<span>Покрытие плана фактическими интервалами</span>
					<strong>
						{summaryRow.progress.toLocaleString("ru-RU", {
							minimumFractionDigits: 1,
							maximumFractionDigits: 1,
						})}
						%
					</strong>
				</div>
				<div className={styles.projectHoursOverallProgressBar}>
					<span style={{ width: `${summaryRow.progress}%` }} />
				</div>
				<p>
					Процент рассчитывается из тех же плановых и фактических полос,
					что показаны ниже.
				</p>
			</div>

			<div className={styles.projectHoursStageCards}>
				{stageRows.map((row) => {
					const deviation = row.fact - row.plan;
					const progressLabel = `${row.progress.toLocaleString("ru-RU", {
						minimumFractionDigits: 1,
						maximumFractionDigits: 1,
					})}%`;

					return (
						<article key={row.id} className={styles.projectHoursStageCard}>
							<div className={styles.projectHoursStageCardHeader}>
								<strong>{row.label}</strong>
								<span>{progressLabel}</span>
							</div>
							<div className={styles.projectHoursStageProgressBar}>
								<span style={{ width: `${row.progress}%` }} />
							</div>
							<div className={styles.projectHoursStageMetrics}>
								<div>
									<span>План</span>
									<strong>{formatHours(row.plan)}</strong>
								</div>
								<div>
									<span>Факт</span>
									<strong>{formatHours(row.fact)}</strong>
								</div>
								<div>
									<span>Отклонение</span>
									<strong
										className={
											deviation > 0
												? styles.projectHoursDeviationOver
												: deviation < 0
													? styles.projectHoursDeviationWithin
													: styles.projectHoursDeviationNeutral
										}
									>
										{formatDeviationHours(deviation)}
									</strong>
								</div>
							</div>
						</article>
					);
				})}
			</div>
		</section>
	);
};
