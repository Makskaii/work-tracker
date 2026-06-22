import { useMemo, useState } from "react";
import { EntityTypeIds } from "@/shared/constants/const";
import { useBitrixSlider } from "@/shared/hooks/useBitrixSlider";
import type { User } from "@/shared/types/types";
import type { Deal } from "../../types/deals.types";
import type { ActivityListItem } from "../../types/types";
import { MarginalityTab } from "./components/MarginalityTab";
import { ProfitabilitySkeleton } from "./components/ProfitabilitySkeleton";
import { ProjectsTab } from "./components/ProjectsTab";
import { ReportsTab } from "./components/ReportsTab";
import { SummaryCards } from "./components/SummaryCards";
import { TasksTab } from "./components/TasksTab";
import {
	buildCompanyProjectGroups,
	getFinancialProjectSummary,
} from "./model/profitabilityUtils";
import type { SalesProfitabilityTab } from "./model/types";
import { useCompanyProjects } from "./model/useCompanyProjects";
import styles from "./SalesProfitabilityReport.module.scss";

type SalesProfitabilityReportProps = {
	activities: ActivityListItem[];
	deals: Deal[];
	users: User[];
	loading?: boolean;
};

const tabs: Array<{ id: SalesProfitabilityTab; title: string }> = [
	{ id: "projects", title: "Проекты" },
	{ id: "tasks", title: "Задачи" },
	{ id: "reports", title: "Отчёты сотрудников" },
];

const ProjectListSkeleton = () => (
	<>
		{Array.from({ length: 1 }, (_, index) => (
			<div
				key={index}
				className={styles.dealProjectSkeleton}
				aria-hidden="true"
			>
				<span className={styles.dealProjectSkeletonIcon} />
				<span className={styles.dealProjectSkeletonText}>
					<span />
					<span />
				</span>
			</div>
		))}
	</>
);

export const SalesProfitabilityReport = ({
	activities,
	deals,
	users,
	loading,
}: SalesProfitabilityReportProps) => {
	const [selectedFinancialGroupId, setSelectedFinancialGroupId] = useState<
		string | null
	>(null);
	const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
		null,
	);
	const [activeTab, setActiveTab] = useState<SalesProfitabilityTab>("projects");
	const [isStructureCollapsed, setIsStructureCollapsed] = useState(false);
	const { openTask } = useBitrixSlider();
	const { companyTitleById, projects, isLoadingDetails } = useCompanyProjects();
	const companyGroups = useMemo(
		() => buildCompanyProjectGroups(projects, companyTitleById),
		[companyTitleById, projects],
	);
	const financialGroups = useMemo(
		() => companyGroups.flatMap((company) => company.financialGroups),
		[companyGroups],
	);
	const activeFinancialGroup =
		financialGroups.find(
			(group) => group.id === selectedFinancialGroupId,
		) ??
		financialGroups[0] ??
		null;
	const activeProjects = activeFinancialGroup?.projects ?? [];

	const effectiveSelectedProjectId = useMemo(() => {
		const projectIds = activeProjects.map((project) => project.projectId);

		if (!projectIds.length) {
			return null;
		}

		if (selectedProjectId && projectIds.includes(selectedProjectId)) {
			return selectedProjectId;
		}

		return projectIds[0];
	}, [activeProjects, selectedProjectId]);

	const summary = getFinancialProjectSummary(activeProjects);
	const isBusy = loading || isLoadingDetails;
	const allTasks = activeProjects.flatMap((project) =>
		project.tasks.map((task) => ({ task, project })),
	);
	const allReports = activeProjects.flatMap((project) =>
		project.reports.map((report) => ({ report, project })),
	);

	const selectFinancialGroup = (groupId: string, projectId: string) => {
		setSelectedFinancialGroupId(groupId);
		setSelectedProjectId(projectId);
	};

	return (
		<section className={styles.section}>
			<div
				className={`${styles.layout} ${
					isStructureCollapsed ? styles.layoutCollapsed : ""
				}`}
			>
				<aside className={styles.structure}>
					<div className={styles.structureHeader}>
						<button
							type="button"
							className={styles.structureToggle}
							onClick={() => setIsStructureCollapsed((prev) => !prev)}
							title={
								isStructureCollapsed
									? "Развернуть структуру"
									: "Свернуть структуру"
							}
						>
							{isStructureCollapsed ? "⇥" : "⇤"}
						</button>
						<h3>Структура</h3>
					</div>
					<div className={styles.dealsList}>
						{isLoadingDetails ? (
							<ProjectListSkeleton />
						) : (
							financialGroups.map((group) => {
								const projectId = group.parentProject.projectId ?? group.id;
								const isActiveGroup = group.id === activeFinancialGroup?.id;

								return (
									<div key={group.id} className={styles.dealGroup}>
										<button
											type="button"
											title={group.title}
											className={`${styles.dealProjectButton} ${
												isActiveGroup ? styles.activeProject : ""
											}`}
											onClick={() => selectFinancialGroup(group.id, projectId)}
										>
											<span className={styles.dealProjectIcon}>
												{group.title.trim().charAt(0)}
											</span>
											<span>
												<strong>{group.title}</strong>
												<small>Проект</small>
											</span>
										</button>

									</div>
								);
							})
						)}
					</div>
				</aside>

				<div className={styles.content}>
					<div className={styles.tabs}>
						{tabs.map((tab) => (
							<button
								key={tab.id}
								type="button"
								className={activeTab === tab.id ? styles.activeTab : ""}
								onClick={() => setActiveTab(tab.id)}
							>
								{tab.title}
							</button>
						))}
						<button
							type="button"
							className={`${styles.marginalityTabButton} ${
								activeTab === "marginality" ? styles.activeTab : ""
							}`}
							onClick={() => setActiveTab("marginality")}
						>
							Список оплат
						</button>
					</div>

					{isBusy ? (
						<ProfitabilitySkeleton />
					) : (
						<>
							{activeTab !== "marginality" && (
								<SummaryCards
									projectTitle={
										activeFinancialGroup?.title ??
										"Проект не выбран"
									}
									summary={summary}
								/>
							)}

							{activeTab === "marginality" && (
								<MarginalityTab
									deals={deals}
									projects={projects}
									selectedProjectId={effectiveSelectedProjectId}
								/>
							)}

							{activeTab === "projects" && (
								<ProjectsTab
									projects={activeProjects}
									selectedProjectId={effectiveSelectedProjectId}
									users={users}
								/>
							)}

							{activeTab === "tasks" && (
								<TasksTab
									items={allTasks}
									users={users}
									openTask={(id) => openTask(id, EntityTypeIds.tasks)}
								/>
							)}

							{activeTab === "reports" && (
								<ReportsTab
									activities={activities}
									items={allReports}
									users={users}
									openReport={(id) => openTask(id, EntityTypeIds.reports)}
								/>
							)}
						</>
					)}
				</div>
			</div>
		</section>
	);
};
