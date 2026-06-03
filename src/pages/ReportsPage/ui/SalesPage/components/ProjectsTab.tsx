import type { User } from "@/shared/types/types";
import type { Deal } from "../../../types/deals.types";
import type { ProfitabilityProject } from "../model/types";
import styles from "../SalesProfitabilityReport.module.scss";
import { DealProjectTeamCostTable } from "./DealProjectTeamCostTable";
import { DealWorkDensityChart } from "./DealWorkDensityChart";
import { ProjectGantt } from "./ProjectGantt";

type ProjectsTabProps = {
	onProjectSelect: (projectId: string) => void;
	projects: ProfitabilityProject[];
	selectedDeal: Deal | null;
	selectedProjectId: string | null;
	users: User[];
};

const getProjectId = (project: ProfitabilityProject) =>
	String(project.projectId ?? project.id);

export const ProjectsTab = ({
	onProjectSelect,
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
			<div className={styles.projectSelectCard}>
				<label
					className={styles.projectSelectLabel}
					htmlFor="profitability-project-select"
				>
					Выбор проекта
				</label>
				<select
					id="profitability-project-select"
					className={styles.projectSelect}
					disabled={!projects.length}
					onChange={(event) => onProjectSelect(event.target.value)}
					value={selectedProjectId ?? ""}
				>
					{projects.length ? (
						projects.map((project) => {
							const projectId = getProjectId(project);

							return (
								<option key={projectId} value={projectId}>
									{project.title}
								</option>
							);
						})
					) : (
						<option value="">Проектов нет</option>
					)}
				</select>
			</div>

			{selectedProject ? (
				<>
					<ProjectGantt project={selectedProject} />
					<DealWorkDensityChart projects={selectedProjects} users={users} />
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
