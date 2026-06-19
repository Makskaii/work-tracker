import type { User } from "@/shared/types/types";
import { getProjectAmount } from "../model/profitabilityUtils";
import type { ProfitabilityProject } from "../model/types";
import styles from "../SalesProfitabilityReport.module.scss";
import { DealProjectTeamCostTable } from "./DealProjectTeamCostTable";
import { DealWorkDensityChart } from "./DealWorkDensityChart";
import { ProjectGantt } from "./ProjectGantt";

type ProjectsTabProps = {
	projects: ProfitabilityProject[];
	selectedProjectId: string | null;
	users: User[];
};

export const ProjectsTab = ({
	projects,
	selectedProjectId,
	users,
}: ProjectsTabProps) => {
	const selectedProject =
		projects.find((project) => project.projectId === selectedProjectId) ??
		null;
	const selectedProjects = selectedProject ? [selectedProject] : [];
	const projectAmount = getProjectAmount(selectedProject);

	return (
		<div className={`${styles.tabContent} ${styles.projectsTabContent}`}>
			{selectedProject ? (
				<>
					<ProjectGantt dealAmount={projectAmount} project={selectedProject} />
					<DealWorkDensityChart
						projects={selectedProjects}
						title="Плотность работ по проекту"
						users={users}
					/>
					<DealProjectTeamCostTable
						projects={selectedProjects}
						users={users}
					/>
				</>
			) : (
				<div className={styles.emptyState}>Выберите проект</div>
			)}
		</div>
	);
};
