import { useEffect, useMemo, useState } from "react";
import { EntityTypeIds } from "@/shared/constants/const";
import { useBitrixSlider } from "@/shared/hooks/useBitrixSlider";
import type { User } from "@/shared/types/types";
import type { Deal } from "../../types/deals.types";
import type { ActivityListItem } from "../../types/types";
import { DealTab } from "./components/DealTab";
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

export const SalesProfitabilityReport = ({
	activities,
	deals,
	users,
	loading,
}: SalesProfitabilityReportProps) => {
	const [selectedDealId, setSelectedDealId] = useState("");
	const [activeTab, setActiveTab] = useState<SalesProfitabilityTab>("deal");
	const { openTask } = useBitrixSlider();

	const selectedDeal = useMemo(() => {
		return deals.find((deal) => String(deal.id) === selectedDealId) ?? null;
	}, [deals, selectedDealId]);
	const { projects, isLoadingDetails } = useDealProjects(selectedDeal);

	useEffect(() => {
		if (!selectedDealId && deals.length) {
			setSelectedDealId(String(deals[0].id));
		}
	}, [deals, selectedDealId]);

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
			<div className={styles.toolbar}>
				<div className={styles.searchMock}>
					Поиск клиента, сделки или проекта
				</div>
				<select
					value={selectedDealId}
					onChange={(event) => setSelectedDealId(event.target.value)}
					disabled={loading || !deals.length}
				>
					{deals.length ? (
						deals.map((deal) => (
							<option key={deal.id} value={deal.id}>
								{deal.title}
							</option>
						))
					) : (
						<option value="">Сделок нет</option>
					)}
				</select>
				<button type="button" disabled>
					Гант по сделке
				</button>
			</div>

			<div className={styles.layout}>
				<aside className={styles.structure}>
					<div className={styles.structureHeader}>
						<h3>Структура</h3>
					</div>
					<div className={styles.dealsList}>
						{deals.map((deal) => (
							<button
								key={deal.id}
								type="button"
								className={`${styles.dealButton} ${
									String(deal.id) === selectedDealId ? styles.activeDeal : ""
								}`}
								onClick={() => setSelectedDealId(String(deal.id))}
							>
								<span className={styles.dealChevron}>›</span>
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
						))}
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
						<strong>Маржинальность</strong>
					</div>

					{isBusy ? (
						<ProfitabilitySkeleton />
					) : (
						<>
							<div className={styles.contentHeader}>
								<div>
									<span>Сделка</span>
									<h3>{selectedDeal?.title ?? "Сделка не выбрана"}</h3>
								</div>
								<div className={styles.contentMeta}>
									Всего: {projects.length} проектов, {allTasks.length} задач
								</div>
							</div>

							<SummaryCards summary={summary} />

							{activeTab === "deal" && (
								<DealTab
									projects={projects}
									summary={summary}
									selectedDeal={selectedDeal}
									users={users}
								/>
							)}

							{activeTab === "projects" && (
								<ProjectsTab
									projects={projects}
									purchasedHours={summary.purchasedHours}
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
