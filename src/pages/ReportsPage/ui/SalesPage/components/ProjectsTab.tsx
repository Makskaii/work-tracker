import type { User } from "@/shared/types/types";
import type { ProfitabilityProject, ReportProject } from "../model/types";
import styles from "../SalesProfitabilityReport.module.scss";
import { AutonomousProjectGantt } from "./AutonomousProjectGantt";
import { DealProjectTeamCostTable } from "./DealProjectTeamCostTable";
import { DealWorkDensityChart } from "./DealWorkDensityChart";

type ProjectsTabProps = {
	bitrixProjects: ProfitabilityProject[];
	onPaymentsChanged?: () => void;
	projects: ReportProject[];
	selectedProjectId: string | null;
	users: User[];
};

export const ProjectsTab = ({
	bitrixProjects,
	onPaymentsChanged,
	projects,
	selectedProjectId,
	users,
}: ProjectsTabProps) => {
	const selectedProject =
		projects.find((project) => `db-${project.id}` === selectedProjectId) ??
		null;

	return (
		<div className={`${styles.tabContent} ${styles.projectsTabContent}`}>
			{selectedProject ? (
				<>
					<AutonomousProjectGantt
						onPaymentsChanged={onPaymentsChanged}
						project={selectedProject}
					/>
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
