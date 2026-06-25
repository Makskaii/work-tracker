import type { User } from "@/shared/types/types";
import type { ReportProject } from "../model/types";
import styles from "../SalesProfitabilityReport.module.scss";
import { AutonomousProjectGantt } from "./AutonomousProjectGantt";

type ProjectsTabProps = {
	onPaymentsChanged?: () => void;
	paymentsRefreshKey?: number;
	projects: ReportProject[];
	selectedProjectId: string | null;
	users: User[];
};

export const ProjectsTab = ({
	onPaymentsChanged,
	paymentsRefreshKey,
	projects,
	selectedProjectId,
	users,
}: ProjectsTabProps) => {
	const selectedProject =
		projects.find((project) => `db-${project.id}` === selectedProjectId) ??
		null;
	void users;

	return (
		<div className={`${styles.tabContent} ${styles.projectsTabContent}`}>
			{selectedProject ? (
				<AutonomousProjectGantt
					onPaymentsChanged={onPaymentsChanged}
					paymentsRefreshKey={paymentsRefreshKey}
					project={selectedProject}
				/>
			) : (
				<div className={styles.emptyState}>Выберите проект</div>
			)}
		</div>
	);
};
