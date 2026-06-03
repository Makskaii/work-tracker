import type { User } from "@/shared/types/types";
import type { Deal } from "../../../types/deals.types";
import type { ProfitabilityProject } from "../model/types";
import styles from "../SalesProfitabilityReport.module.scss";
import { DealProjectTeamCostTable } from "./DealProjectTeamCostTable";
import { DealWorkDensityChart } from "./DealWorkDensityChart";
import { ProjectGantt } from "./ProjectGantt";

type ProjectsTabProps = {
	projects: ProfitabilityProject[];
	selectedDeal: Deal | null;
	selectedProjectId: string | null;
	users: User[];
};

const getProjectId = (project: ProfitabilityProject) =>
	String(project.projectId ?? project.id);

export const ProjectsTab = ({
	projects,
	selectedDeal,
	selectedProjectId,
	users,
}: ProjectsTabProps) => {
	const selectedProject =
		projects.find((project) => getProjectId(project) === selectedProjectId) ??
		null;
	const selectedProjects = selectedProject ? [selectedProject] : [];

	return (
		<div className={`${styles.tabContent} ${styles.projectsTabContent}`}>
			{selectedProject ? (
				<>
					<ProjectGantt project={selectedProject} />
					<DealWorkDensityChart
						projects={selectedProjects}
						title="Плотность работ по проекту"
						users={users}
					/>
					<DealProjectTeamCostTable
						projects={selectedProjects}
						selectedDeal={selectedDeal}
						users={users}
					/>
				</>
			) : (
				<div className={styles.emptyState}>Выберите проект</div>
			)}
		</div>
	);
};
