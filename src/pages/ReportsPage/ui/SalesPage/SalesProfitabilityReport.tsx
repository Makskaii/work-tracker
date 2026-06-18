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
	buildCompanyFinancialGroups,
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
	{ id: "deal", title: "Финансовая группа" },
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

const getDealCompanyId = (deal: Deal) => String(deal.companyId ?? "").trim();

const getDealCompanyTitle = (deal: Deal) =>
	String(deal.companyTitle ?? "").trim() || `Компания #${deal.companyId}`;

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

	const companies = useMemo(() => {
		const result = new Map<string, Deal>();

		deals.forEach((deal) => {
			const companyId = getDealCompanyId(deal) || String(deal.id);

			if (!result.has(companyId)) {
				result.set(companyId, deal);
			}
		});

		return Array.from(result.values());
	}, [deals]);
	const selectedDeal = useMemo(() => {
		if (!companies.length) return null;

		if (selectedDealId) {
			const selectedDeal =
				companies.find((deal) => String(deal.id) === selectedDealId) ?? null;

			if (selectedDeal) return selectedDeal;
		}

		return companies[0];
	}, [companies, selectedDealId]);
	const { projects, isLoadingDetails } = useDealProjects(selectedDeal);
	const activeCompanyId = selectedDeal ? getDealCompanyId(selectedDeal) : "";
	const financialGroups = useMemo(
		() => buildCompanyFinancialGroups(projects),
		[projects],
	);

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
	const activeFinancialGroup =
		financialGroups.find((group) =>
			group.projects.some(
				(project) => project.projectId === effectiveSelectedProjectId,
			),
		) ??
		financialGroups[0] ??
		null;
	const activeProjects = activeFinancialGroup?.projects ?? projects;

	const summary = getDealSummary(activeProjects, selectedDeal);
	const isBusy = loading || isLoadingDetails;
	const allTasks = activeProjects.flatMap((project) =>
		project.tasks.map((task) => ({ task, project })),
	);
	const allReports = activeProjects.flatMap((project) =>
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
						{companies.map((deal) => {
							const companyId = getDealCompanyId(deal) || String(deal.id);
							const companyTitle = getDealCompanyTitle(deal);
							const isActiveDeal = companyId === activeCompanyId;

							return (
								<div key={companyId} className={styles.dealGroup}>
									<button
										type="button"
										title={companyTitle}
										className={`${styles.dealButton} ${
											isActiveDeal ? styles.activeDeal : ""
										}`}
										onClick={() => selectDeal(String(deal.id))}
									>
										<span className={styles.dealChevron}>
											{companyTitle.trim().charAt(0)}
										</span>
										<span>
											<strong>{companyTitle}</strong>
											<small>Компания</small>
										</span>
										<em>
											{toNumber(deal.opportunity)
												? formatMoney(toNumber(deal.opportunity))
												: `#${companyId}`}
										</em>
									</button>

									{isActiveDeal && (isLoadingDetails || financialGroups.length) ? (
										<div className={styles.dealProjectsList}>
											{isLoadingDetails ? (
												<ProjectListSkeleton />
											) : (
												financialGroups.map((group) => {
													const projectId =
														group.parentProject?.projectId ??
														group.projects[0]?.projectId ??
														group.id;
													const isActiveProject =
														group.id === activeFinancialGroup?.id;

													return (
														<div key={group.id} className={styles.dealGroup}>
															<button
																type="button"
																title={group.title}
																className={`${styles.dealProjectButton} ${
																	isActiveProject ? styles.activeProject : ""
																}`}
																onClick={() => setSelectedProjectId(projectId)}
															>
																<span className={styles.dealProjectIcon}>
																	{group.title.trim().charAt(0)}
																</span>
																<span>
																	<strong>{group.title}</strong>
																	<small>{group.projects.length} проектов</small>
																</span>
															</button>

															{group.projects.length > 1 ? (
																<div className={styles.dealProjectsList}>
																	{group.projects.map((project) => (
																		<button
																			key={project.projectId}
																			type="button"
																			title={project.title}
																			className={`${styles.dealProjectButton} ${
																				project.projectId === effectiveSelectedProjectId
																					? styles.activeProject
																					: ""
																			}`}
																			onClick={() =>
																				setSelectedProjectId(project.projectId)
																			}
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
																	))}
																</div>
															) : null}
														</div>
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
								<SummaryCards
									dealTitle={
										activeFinancialGroup?.title ??
										(selectedDeal
											? getDealCompanyTitle(selectedDeal)
											: "Компания не выбрана")
									}
									summary={summary}
								/>
							)}

							{activeTab === "marginality" && (
								<MarginalityTab
									deals={deals}
									projects={activeProjects}
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
									projects={activeProjects}
									selectedProjectId={effectiveSelectedProjectId}
									summary={summary}
									users={users}
								/>
							)}

							{activeTab === "projects" && (
								<ProjectsTab
									projects={activeProjects}
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
