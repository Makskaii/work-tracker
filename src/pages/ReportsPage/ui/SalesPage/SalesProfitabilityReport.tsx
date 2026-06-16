import { useMemo, useState } from "react";
import { EntityTypeIds } from "@/shared/constants/const";
import { useBitrixSlider } from "@/shared/hooks/useBitrixSlider";
import type { User } from "@/shared/types/types";
import type { Deal } from "../../types/deals.types";
import type { ActivityListItem } from "../../types/types";
import { DealTab } from "./components/DealTab";
import { MarginalityTab } from "./components/MarginalityTab";
import { ProfitabilitySkeleton } from "./components/ProfitabilitySkeleton";
import { ProjectsTab } from "./components/ProjectsTab";
import { ReportsTab } from "./components/ReportsTab";
import { SummaryCards } from "./components/SummaryCards";
import { TasksTab } from "./components/TasksTab";
import {
	formatMoney,
	getDealSummary,
	toNumber,
} from "./model/profitabilityUtils";
import type { SalesProfitabilityTab } from "./model/types";
import { useDealProjects } from "./model/useDealProjects";
import styles from "./SalesProfitabilityReport.module.scss";

type SalesProfitabilityReportProps = {
	activities: ActivityListItem[];
	deals: Deal[];
	users: User[];
	loading?: boolean;
};

const tabs: Array<{ id: SalesProfitabilityTab; title: string }> = [
	{ id: "deal", title: "Сделка" },
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
	const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
	const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
		null,
	);
	const [activeTab, setActiveTab] = useState<SalesProfitabilityTab>("deal");
	const [isStructureCollapsed, setIsStructureCollapsed] = useState(false);
	const { openTask } = useBitrixSlider();

	const selectedDeal = useMemo(() => {
		if (!deals.length) return null;

		if (selectedDealId) {
			const selectedDeal =
				deals.find((deal) => String(deal.id) === selectedDealId) ?? null;

			if (selectedDeal) return selectedDeal;
		}

		return deals[0];
	}, [deals, selectedDealId]);
	const { projects, isLoadingDetails } = useDealProjects(selectedDeal);
	const activeDealId = selectedDeal ? String(selectedDeal.id) : "";

	const selectDeal = (dealId: string) => {
		setSelectedDealId(dealId);
		setSelectedProjectId(null);
	};

	const effectiveSelectedProjectId = useMemo(() => {
		const projectIds = projects.map((project) => project.projectId);

		if (!projectIds.length) {
			return null;
		}

		if (selectedProjectId && projectIds.includes(selectedProjectId)) {
			return selectedProjectId;
		}

		return projectIds[0];
	}, [projects, selectedProjectId]);

	const summary = getDealSummary(projects, selectedDeal);
	const isBusy = loading || isLoadingDetails;
	const allTasks = projects.flatMap((project) =>
		project.tasks.map((task) => ({ task, project })),
	);
	const allReports = projects.flatMap((project) =>
		project.reports.map((report) => ({ report, project })),
	);

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
						{deals.map((deal) => {
							const isActiveDeal = String(deal.id) === activeDealId;

							return (
								<div key={deal.id} className={styles.dealGroup}>
									<button
										type="button"
										title={deal.title}
										className={`${styles.dealButton} ${
											isActiveDeal ? styles.activeDeal : ""
										}`}
										onClick={() => selectDeal(String(deal.id))}
									>
										<span className={styles.dealChevron}>
											{deal.title.trim().charAt(0)}
										</span>
										<span>
											<strong>{deal.title}</strong>
											<small>CRM-сделка</small>
										</span>
										<em>
											{toNumber(deal.opportunity)
												? formatMoney(toNumber(deal.opportunity))
												: `#${deal.id}`}
										</em>
									</button>

									{isActiveDeal && (isLoadingDetails || projects.length) ? (
										<div className={styles.dealProjectsList}>
											{isLoadingDetails ? (
												<ProjectListSkeleton />
											) : (
												projects.map((project) => {
													const projectId = project.projectId;
													const isActiveProject =
														projectId === effectiveSelectedProjectId;

													return (
														<button
															key={projectId}
															type="button"
															title={project.title}
															className={`${styles.dealProjectButton} ${
																isActiveProject ? styles.activeProject : ""
															}`}
															onClick={() => setSelectedProjectId(projectId)}
														>
															<span className={styles.dealProjectIcon}>
																{project.title.trim().charAt(0)}
															</span>
															<span>
																<strong>{project.title}</strong>
																<small>
																	{project.tasks.length} задач ·{" "}
																	{project.reports.length} отчётов
																</small>
															</span>
														</button>
													);
												})
											)}
										</div>
									) : null}
								</div>
							);
						})}
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
								<>
									<div className={styles.contentHeader}>
										<div>
											<span>Сделка</span>
											<h3>{selectedDeal?.title ?? "Сделка не выбрана"}</h3>
										</div>
									</div>

									<SummaryCards summary={summary} />
								</>
							)}

							{activeTab === "marginality" && (
								<MarginalityTab
									deals={deals}
									projects={projects}
									selectedDeal={selectedDeal}
									selectedProjectId={effectiveSelectedProjectId}
								/>
							)}

							{activeTab === "deal" && (
								<DealTab
									onProjectSelect={(projectId) => {
										setSelectedProjectId(projectId);
										setActiveTab("projects");
									}}
									projects={projects}
									selectedProjectId={effectiveSelectedProjectId}
									summary={summary}
									users={users}
								/>
							)}

							{activeTab === "projects" && (
								<ProjectsTab
									projects={projects}
									selectedDeal={selectedDeal}
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
