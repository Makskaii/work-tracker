import type { User } from "@/shared/types/types";
import type { ProfitabilityProject } from "../model/types";
import styles from "../SalesProfitabilityReport.module.scss";
import { ProjectsTable } from "./ProjectsTable";

type ProjectsTabProps = {
	projects: ProfitabilityProject[];
	purchasedHours: number;
	users: User[];
};

export const ProjectsTab = ({
	projects,
	purchasedHours,
	users,
}: ProjectsTabProps) => (
	<div className={styles.tabContent}>
		<ProjectsTable
			projects={projects}
			purchasedHours={purchasedHours}
			users={users}
		/>
	</div>
);
