import type { User } from "@/shared/types/types";
import type { FinancialProjectSummary, ProfitabilityProject } from "../model/types";
import styles from "../SalesProfitabilityReport.module.scss";
import { ProjectsTable } from "./ProjectsTable";

type DealTabProps = {
	onProjectSelect: (projectId: string) => void;
	projects: ProfitabilityProject[];
	selectedProjectId: string | null;
	summary: FinancialProjectSummary;
	users: User[];
};

export const DealTab = ({
	onProjectSelect,
	projects,
	selectedProjectId,
	summary,
	users,
}: DealTabProps) => (
	<div className={styles.tabContent}>
		<ProjectsTable
			onProjectSelect={onProjectSelect}
			projects={projects}
			purchasedHours={summary.purchasedHours}
			selectedProjectId={selectedProjectId}
			users={users}
		/>
	</div>
);
