import type { User } from "@/shared/types/types";
import type { ProjectSummaryFormState } from "../model/reportProjectForm";
import type { ProfitabilityProject, ReportProject } from "../model/types";
import styles from "../SalesProfitabilityReport.module.scss";
import { DealProjectTeamCostTable } from "./DealProjectTeamCostTable";
import { DealWorkDensityChart } from "./DealWorkDensityChart";
import { ProjectPlanningWorkspace } from "./ProjectPlanningWorkspace";

type ProjectsTabProps = {
	bitrixProjects: ProfitabilityProject[];
	form: ProjectSummaryFormState;
	onPaymentsChanged?: () => void;
	projects: ReportProject[];
	selectedProjectId: string | null;
	users: User[];
	reportsError?: string | null;
	reportsLoading?: boolean;
	onRetryReports?: () => void;
	retryReportsLabel?: string;
};

export const ProjectsTab = ({
	bitrixProjects,
	onPaymentsChanged,
	projects,
	selectedProjectId,
	reportsError,
	reportsLoading = false,
	onRetryReports,
	retryReportsLabel = "Повторить загрузку",
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
					{!isSupportProject && (
						<ProjectPlanningWorkspace
							key={selectedProject.id}
							showProgress={isWaterfallProject}
							onPaymentsChanged={onPaymentsChanged}
							project={selectedProject}
						/>
					)}
					{reportsLoading ? (
						<div role="status" aria-busy="true" className={styles.emptyState}>
							Загружаем задачи, ежедневные отчёты и сотрудников…
						</div>
					) : reportsError ? (
						<div role="alert" className={styles.emptyState}>
							<p>{reportsError}</p>
							<button
								type="button"
								className={styles.filterButton}
								onClick={onRetryReports}
							>
								{retryReportsLabel}
							</button>
						</div>
					) : (
						<>
							<DealWorkDensityChart
								projects={bitrixProjects}
								title="Плотность работ по проекту"
								users={users}
							/>
							<DealProjectTeamCostTable
								projects={bitrixProjects}
								users={users}
							/>
						</>
					)}
				</>
			) : (
				<div className={styles.emptyState}>Выберите проект</div>
			)}
		</div>
	);
};
