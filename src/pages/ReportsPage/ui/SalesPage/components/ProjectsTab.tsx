import { useState } from "react";
import type { User } from "@/shared/types/types";
import type { ProjectSummaryFormState } from "../model/reportProjectForm";
import type { ProfitabilityProject, ReportProject } from "../model/types";
import styles from "../SalesProfitabilityReport.module.scss";
import { AutonomousProjectGantt } from "./AutonomousProjectGantt";
import { DealProjectTeamCostTable } from "./DealProjectTeamCostTable";
import { DealWorkDensityChart } from "./DealWorkDensityChart";
import { ProjectHoursProgress } from "./ProjectHoursProgress";

type ProjectsTabProps = {
	bitrixProjects: ProfitabilityProject[];
	form: ProjectSummaryFormState;
	isEditing: boolean;
	onFormChange: (value: ProjectSummaryFormState) => void;
	onPaymentsChanged?: () => void;
	projects: ReportProject[];
	selectedProjectId: string | null;
	users: User[];
};

type SupportHoursScale = "week" | "month" | "halfYear";

const supportHoursScales: Array<{ label: string; value: SupportHoursScale }> = [
	{ label: "Недели", value: "week" },
	{ label: "Месяцы", value: "month" },
	{ label: "Полгода", value: "halfYear" },
];

const supportBarClasses = [
	styles.paymentPaid,
	styles.paymentDue,
	styles.paymentPlanned,
	styles.paymentPaid,
	styles.paymentDue,
	styles.paymentPlanned,
	styles.paymentPaid,
	styles.paymentDue,
];

const formatHours = (hours: number) => `${hours.toLocaleString("ru-RU")} ч`;

const getSupportHoursBuckets = (
	purchasedHours: number,
	scale: SupportHoursScale,
) => {
	const baseHours = purchasedHours > 0 ? purchasedHours : 40;
	const scaleWeights: Record<SupportHoursScale, number[]> = {
		halfYear: [0.42, 0.58],
		month: [0.12, 0.18, 0.1, 0.24, 0.14, 0.22],
		week: [0.07, 0.04, 0.13, 0.08, 0.18, 0.1, 0.16, 0.24],
	};
	const labelByScale: Record<SupportHoursScale, string> = {
		halfYear: "Период",
		month: "Месяц",
		week: "Неделя",
	};

	return scaleWeights[scale].map((weight, index) => ({
		hours: Math.max(1, Math.round(baseHours * weight)),
		label: `${labelByScale[scale]} ${index + 1}`,
	}));
};

const SupportPurchasedHoursChart = ({
	project,
}: {
	project: ReportProject;
}) => {
	const [scale, setScale] = useState<SupportHoursScale>("week");
	const purchasedHours = project.summaryPurchasedHours ?? 0;
	const buckets = getSupportHoursBuckets(purchasedHours, scale);
	const usedHours = Math.min(
		purchasedHours,
		Math.round((purchasedHours || 40) * 0.64),
	);
	const remainingHours = Math.max(purchasedHours - usedHours, 0);
	const averageHours = buckets.length ? Math.round(usedHours / buckets.length) : 0;
	const maxBucketHours = Math.max(...buckets.map((bucket) => bucket.hours), 1);

	return (
		<section className={styles.chartCard}>
			<div className={styles.chartHeader}>
				<div>
					<h3 className={styles.chartTitle}>Купленные часы</h3>
					<p className={styles.chartSubtitle}>
						Шкала купленных часов и ключевые показатели техпод-проекта
					</p>
				</div>
				<div className={styles.filters}>
					{supportHoursScales.map((item) => (
						<button
							key={item.value}
							type="button"
							className={`${styles.filterButton} ${
								scale === item.value ? styles.filterButtonActive : ""
							}`}
							onClick={() => setScale(item.value)}
						>
							{item.label}
						</button>
					))}
				</div>
			</div>

			<div className={styles.metricsGrid}>
				<div className={styles.metric}>
					<span>Куплено часов </span>
					<strong>{formatHours(purchasedHours)}</strong>
				</div>
				<div className={styles.metric}>
					<span>Использовано </span>
					<strong>{formatHours(usedHours)}</strong>
				</div>
				<div className={styles.metric}>
					<span>Остаток </span>
					<strong>{formatHours(remainingHours)}</strong>
				</div>
				<div className={styles.metric}>
					<span>Среднее за период </span>
					<strong>{formatHours(averageHours)}</strong>
				</div>
			</div>

			<div className={styles.paymentChart}>
				<div className={`${styles.chartPlot} ${styles.supportHoursPlot}`}>
					<span className={styles.chartAxisLabel}>Тестовая шкала часов</span>
					{buckets.map((bucket, index) => {
						const height = 42 + Math.round((bucket.hours / maxBucketHours) * 230);
						const segmentHeight = Math.max(24, height);

						return (
							<div
								key={bucket.label}
								className={`${styles.periodColumn} ${styles.supportHoursColumn}`}
							>
								<div className={styles.periodHeader}>
									<strong>{bucket.label}</strong>
									<small>{formatHours(bucket.hours)}</small>
								</div>
								<div
									className={`${styles.stackedBar} ${styles.supportHoursBar}`}
									style={{
										height: `${height}px`,
									}}
								>
									<span
										className={`${styles.paymentSegment} ${
											supportBarClasses[index % supportBarClasses.length]
										}`}
										style={{ height: `${segmentHeight}px` }}
									>
										{formatHours(bucket.hours)}
									</span>
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</section>
	);
};

export const ProjectsTab = ({
	bitrixProjects,
	form,
	isEditing,
	onFormChange,
	onPaymentsChanged,
	projects,
	selectedProjectId,
	users,
}: ProjectsTabProps) => {
	const selectedProject =
		projects.find((project) => `db-${project.id}` === selectedProjectId) ??
		null;
	const isSupportProject = selectedProject?.projectType === "support";
	const isWaterfallProject = selectedProject?.projectType === "waterfall";

	return (
		<div className={`${styles.tabContent} ${styles.projectsTabContent}`}>
			{selectedProject ? (
				<>
					{isSupportProject ? (
						<SupportPurchasedHoursChart project={selectedProject} />
					) : (
						<AutonomousProjectGantt
							onPaymentsChanged={onPaymentsChanged}
							project={selectedProject}
						/>
					)}
					{isWaterfallProject && (
						<ProjectHoursProgress
							form={form}
							isEditing={isEditing}
							onChange={onFormChange}
							projects={bitrixProjects}
						/>
					)}
					<DealWorkDensityChart
						projects={bitrixProjects}
						title="Плотность работ по проекту"
						users={users}
					/>
					<DealProjectTeamCostTable projects={bitrixProjects} users={users} />
				</>
			) : (
				<div className={styles.emptyState}>Выберите проект</div>
			)}
		</div>
	);
};
