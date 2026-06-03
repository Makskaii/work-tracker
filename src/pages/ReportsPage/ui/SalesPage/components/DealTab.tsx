import type { User } from "@/shared/types/types";
import type { Deal } from "../../../types/deals.types";
import type { DealSummary, ProfitabilityProject } from "../model/types";
import styles from "../SalesProfitabilityReport.module.scss";
import { DealProjectTeamCostTable } from "./DealProjectTeamCostTable";
import { DealWorkDensityChart } from "./DealWorkDensityChart";
import { ProjectsTable } from "./ProjectsTable";

type DealTabProps = {
	onProjectSelect: (projectId: string) => void;
	projects: ProfitabilityProject[];
	selectedProjectId: string | null;
	summary: DealSummary;
	selectedDeal: Deal | null;
	users: User[];
};

export const DealTab = ({
	onProjectSelect,
	projects,
	selectedProjectId,
	summary,
	selectedDeal,
	users,
}: DealTabProps) => (
	<div className={styles.tabContent}>
		<DealWorkDensityChart projects={projects} users={users} />
		<ProjectsTable
			onProjectSelect={onProjectSelect}
			projects={projects}
			purchasedHours={summary.purchasedHours}
			selectedProjectId={selectedProjectId}
			users={users}
		/>
		<DealProjectTeamCostTable
			projects={projects}
			selectedDeal={selectedDeal}
			users={users}
		/>
	</div>
);
