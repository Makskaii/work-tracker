import { useEffect, useMemo, useState } from "react";
import {
	ProjectCodes,
	ReportCodes,
	ReportStageIds,
	TaskCodes,
} from "@/components/calendar/constants/const";
import type { ReportProps } from "@/components/calendar/types/types";
import { $api } from "@/shared/config";
import {
	Endpoints,
	EntityTypeIds,
	TASK_SELECT_FIELDS,
} from "@/shared/constants/const";
import { useBitrixSlider } from "@/shared/hooks/useBitrixSlider";
import type { ClientProjectProps, TaskProps, User } from "@/shared/types/types";
import { type Deal, DealCodes } from "../../types/deals.types";
import type { ActivityListItem } from "../../types/types";
import styles from "./SalesProfitabilityReport.module.scss";

type ProfitabilityProject = ClientProjectProps & {
	tasks: TaskProps[];
	reports: ReportProps[];
};

type CrmItemListResponse<T> = {
	result?: {
		items?: T[];
	};
	next?: number | null;
};

const PROJECT_SELECT_FIELDS = [
	"id",
	"title",
	"assignedById",
	"createdTime",
	"updatedTime",
	"stageId",
	ProjectCodes.company,
	ProjectCodes.parentproject,
] as const;

const REPORT_SELECT_FIELDS = [
	"id",
	"title",
	"begindate",
	ReportCodes.title,
	ReportCodes.timeSpent,
	ReportCodes.taskId,
	ReportCodes.parentId,
	ReportCodes.activityType,
	ReportCodes.company,
	ReportCodes.parentproject,
	"assignedById",
	"stageId",
] as const;

const MOCK_MARGIN_PERCENT = 53;

const fetchAllCrmItems = async <T,>({
	entityTypeId,
	select,
	filter,
	signal,
}: {
	entityTypeId: number;
	select: readonly string[];
	filter: Record<string, unknown>;
	signal?: AbortSignal;
}) => {
	const limit = 50;
	let start = 0;
	let next: number | null | undefined = 0;
	const items: T[] = [];

	while (next !== null) {
		const response = await $api.get<CrmItemListResponse<T>>(
			Endpoints.crmItems,
			{
				params: {
					entityTypeId,
					select,
					filter,
					start,
				},
				signal,
			},
		);

		items.push(...(response.data.result?.items ?? []));

		next = response.data.next ?? null;
		start = next ?? start + limit;
	}

	return items;
};

const toNumber = (value: unknown) => {
	const parsed = Number(String(value ?? "0").replace(",", "."));
	return Number.isFinite(parsed) ? parsed : 0;
};

const getDealProjectIds = (deal: Deal | null) => {
	const value = deal?.[DealCodes.parentProject];
	const values = Array.isArray(value) ? value : [value];

	return values.map((item) => String(item ?? "").trim()).filter(Boolean);
};

const formatHours = (value: number) => `${Number(value.toFixed(1))} ч`;

const formatMoney = (value: number) =>
	new Intl.NumberFormat("ru-RU", {
		style: "currency",
		currency: "RUB",
		maximumFractionDigits: 0,
	}).format(value);

const normalizeTaskType = (value: unknown): string => {
	if (value === null || value === undefined) return "";

	if (Array.isArray(value)) {
		return value.map(normalizeTaskType).join(" ");
	}

	return String(value).toLowerCase();
};

const getPaymentKindFromTaskType = (value: unknown) => {
	const normalized = normalizeTaskType(value);

	if (normalized.includes("company") || normalized.includes("ours")) {
		return "company";
	}

	if (normalized.includes("unpaid")) {
		return "unpaid";
	}

	return "client";
};

const getUserName = (users: User[], userId?: string | number | null) =>
	users.find((user) => String(user.id) === String(userId))?.title ??
	(userId ? `Сотрудник #${userId}` : "Не назначен");

const getActivityName = (
	activities: ActivityListItem[],
	activityId?: string | number | null,
) => {
	const normalizedId = String(activityId ?? "").trim();

	if (!normalizedId) return "Без активности";

	return (
		activities.find((activity) => String(activity.ID) === normalizedId)?.NAME ??
		normalizedId
	);
};

const getProjectPlanHours = (tasks: TaskProps[]) =>
	tasks.reduce((acc, task) => acc + toNumber(task[TaskCodes.estimateTime]), 0);

const getProjectFactHours = (reports: ReportProps[]) =>
	reports.reduce(
		(acc, report) => acc + toNumber(report[ReportCodes.timeSpent]),
		0,
	);

const buildTaskTypeMap = (tasks: TaskProps[]) =>
	new Map(tasks.map((task) => [String(task.id), task[TaskCodes.taskType]]));

const getReportTaskId = (report: ReportProps) =>
	String(report[ReportCodes.parentId] ?? report[ReportCodes.taskId] ?? "");

const getLossHours = (project: ProfitabilityProject) => {
	const taskTypeById = buildTaskTypeMap(project.tasks);

	return project.reports.reduce(
		(acc, report) => {
			const taskType = taskTypeById.get(getReportTaskId(report));
			const kind = getPaymentKindFromTaskType(taskType);
			const hours = toNumber(report[ReportCodes.timeSpent]);

			if (kind === "company") {
				acc.company += hours;
			}

			if (kind === "unpaid") {
				acc.unpaid += hours;
			}

			return acc;
		},
		{
			company: 0,
			unpaid: 0,
		},
	);
};

const getDealSummary = (
	projects: ProfitabilityProject[],
	deal: Deal | null,
) => {
	const planHours = projects.reduce(
		(acc, project) => acc + getProjectPlanHours(project.tasks),
		0,
	);
	const factHours = projects.reduce(
		(acc, project) => acc + getProjectFactHours(project.reports),
		0,
	);
	const losses = projects.reduce(
		(acc, project) => {
			const projectLosses = getLossHours(project);
			acc.company += projectLosses.company;
			acc.unpaid += projectLosses.unpaid;
			return acc;
		},
		{
			company: 0,
			unpaid: 0,
		},
	);
	const revenue = toNumber(deal?.opportunity);

	return {
		purchasedHours: toNumber(deal?.[DealCodes.purchasedHours]),
		revenue,
		planHours,
		factHours,
		lossHours: losses.company + losses.unpaid,
		companyHours: losses.company,
		unpaidHours: losses.unpaid,
		mockMarginPercent: MOCK_MARGIN_PERCENT,
		mockProfit: Math.round((revenue * MOCK_MARGIN_PERCENT) / 100),
	};
};

const getTaskTitle = (task: TaskProps) => task.title || `Задача #${task.id}`;

const getProjectStatus = (project: ProfitabilityProject) => {
	const planHours = getProjectPlanHours(project.tasks);
	const factHours = getProjectFactHours(project.reports);

	if (factHours > planHours) return "Риск";

	return "В норме";
};

type SalesProfitabilityReportProps = {
	activities: ActivityListItem[];
	deals: Deal[];
	users: User[];
	loading?: boolean;
};

export const SalesProfitabilityReport = ({
	activities,
	deals,
	users,
	loading,
}: SalesProfitabilityReportProps) => {
	const [selectedDealId, setSelectedDealId] = useState("");
	const [projects, setProjects] = useState<ProfitabilityProject[]>([]);
	const [isLoadingDetails, setIsLoadingDetails] = useState(false);
	const [activeTab, setActiveTab] = useState<
		"deal" | "projects" | "tasks" | "reports"
	>("deal");
	const { openTask } = useBitrixSlider();

	const selectedDeal = useMemo(() => {
		return deals.find((deal) => String(deal.id) === selectedDealId) ?? null;
	}, [deals, selectedDealId]);

	useEffect(() => {
		if (!selectedDealId && deals.length) {
			setSelectedDealId(String(deals[0].id));
		}
	}, [deals, selectedDealId]);

	useEffect(() => {
		if (!selectedDeal) {
			setProjects([]);
			return;
		}

		const controller = new AbortController();
		const projectIds = getDealProjectIds(selectedDeal);

		const fetchDealProjects = async () => {
			if (!projectIds.length) {
				setProjects([]);
				return;
			}

			setIsLoadingDetails(true);

			try {
				const dealProjects = await fetchAllCrmItems<ClientProjectProps>({
					entityTypeId: EntityTypeIds.projects,
					select: PROJECT_SELECT_FIELDS,
					filter:
						projectIds.length === 1
							? { id: projectIds[0] }
							: { "@id": projectIds },
					signal: controller.signal,
				});

				const preparedProjects = await Promise.all(
					dealProjects.map(async (project) => {
						const projectId = String(project.projectId ?? project.id);
						const companyId = String(
							project[ProjectCodes.company] ?? "",
						).trim();

						const [tasks, reports] = await Promise.all([
							fetchAllCrmItems<TaskProps>({
								entityTypeId: EntityTypeIds.tasks,
								select: TASK_SELECT_FIELDS,
								filter: {
									[TaskCodes.parentproject]: projectId,
									...(companyId ? { [TaskCodes.company]: companyId } : {}),
								},
								signal: controller.signal,
							}),
							fetchAllCrmItems<ReportProps>({
								entityTypeId: EntityTypeIds.reports,
								select: REPORT_SELECT_FIELDS,
								filter: {
									[ReportCodes.parentproject]: projectId,
									...(companyId ? { [ReportCodes.company]: companyId } : {}),
									stageId: ReportStageIds.confirmed,
								},
								signal: controller.signal,
							}),
						]);

						return {
							...project,
							projectId,
							tasks,
							reports,
						};
					}),
				);

				if (!controller.signal.aborted) {
					setProjects(preparedProjects);
				}
			} catch (error) {
				if (!controller.signal.aborted) {
					console.error("Failed to fetch deal profitability data", error);
					setProjects([]);
				}
			} finally {
				if (!controller.signal.aborted) {
					setIsLoadingDetails(false);
				}
			}
		};

		fetchDealProjects();

		return () => {
			controller.abort();
		};
	}, [selectedDeal]);

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
						<button
							type="button"
							className={activeTab === "deal" ? styles.activeTab : ""}
							onClick={() => setActiveTab("deal")}
						>
							Сделка
						</button>
						<button
							type="button"
							className={activeTab === "projects" ? styles.activeTab : ""}
							onClick={() => setActiveTab("projects")}
						>
							Проекты
						</button>
						<button
							type="button"
							className={activeTab === "tasks" ? styles.activeTab : ""}
							onClick={() => setActiveTab("tasks")}
						>
							Задачи
						</button>
						<button
							type="button"
							className={activeTab === "reports" ? styles.activeTab : ""}
							onClick={() => setActiveTab("reports")}
						>
							Отчёты сотрудников
						</button>
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

const SummaryCards = ({
	summary,
}: {
	summary: ReturnType<typeof getDealSummary>;
}) => (
	<div className={styles.summaryGrid}>
		<MetricCard
			title="Куплено часов"
			value={formatHours(summary.purchasedHours)}
		/>
		<MetricCard
			title="Сумма сделки"
			value={formatMoney(summary.revenue)}
			accent
		/>
		<MetricCard title="План из задач" value={formatHours(summary.planHours)} />
		<MetricCard
			title="Факт по отчётам"
			value={formatHours(summary.factHours)}
		/>
		<MetricCard
			title="Потери всего"
			value={formatHours(summary.lossHours)}
			danger
		/>
		<MetricCard
			title="Маржа"
			value={`${summary.mockMarginPercent}%`}
			success
			muted
		/>
	</div>
);

const MetricCard = ({
	title,
	value,
	accent,
	danger,
	success,
	muted,
}: {
	title: string;
	value: string;
	accent?: boolean;
	danger?: boolean;
	success?: boolean;
	muted?: boolean;
}) => (
	<div
		className={`${styles.metricCard} ${accent ? styles.accentMetric : ""} ${
			danger ? styles.dangerMetric : ""
		} ${success ? styles.successMetric : ""} ${muted ? styles.mockMetric : ""}`}
	>
		<span>{title}</span>
		<strong>{value}</strong>
		{muted ? <small>mock / disabled</small> : null}
	</div>
);

const DealTab = ({
	projects,
	summary,
	selectedDeal,
	users,
}: {
	projects: ProfitabilityProject[];
	summary: ReturnType<typeof getDealSummary>;
	selectedDeal: Deal | null;
	users: User[];
}) => (
	<div className={styles.tabContent}>
		<div className={styles.notice}>Гант по сделке временно отключён.</div>
		<ProjectsTable
			projects={projects}
			purchasedHours={summary.purchasedHours}
			users={users}
		/>
		<div className={styles.detailCard}>
			<div className={styles.detailTitle}>
				{selectedDeal?.title ?? "Сделка"} · детализация
			</div>
			<div className={styles.detailStats}>
				<MetricCard
					title="Куплено из сделки"
					value={formatHours(summary.purchasedHours)}
				/>
				<MetricCard
					title="План из задач"
					value={formatHours(summary.planHours)}
				/>
				<MetricCard
					title="Факт отчётов"
					value={formatHours(summary.factHours)}
				/>
				<MetricCard
					title="Unpaid / Company paid"
					value={formatHours(summary.lossHours)}
					danger
				/>
				<MetricCard
					title="Маржа"
					value={`${summary.mockMarginPercent}%`}
					success
					muted
				/>
			</div>
		</div>
	</div>
);

const ProjectsTab = ({
	projects,
	purchasedHours,
	users,
}: {
	projects: ProfitabilityProject[];
	purchasedHours: number;
	users: User[];
}) => (
	<div className={styles.tabContent}>
		<ProjectsTable
			projects={projects}
			purchasedHours={purchasedHours}
			users={users}
		/>
	</div>
);

const ProjectsTable = ({
	projects,
	purchasedHours,
	users,
}: {
	projects: ProfitabilityProject[];
	purchasedHours: number;
	users: User[];
}) => (
	<div className={styles.tableCard}>
		<div className={styles.tableTitle}>Проекты внутри сделки</div>
		<div className={styles.projectTable}>
			<div className={styles.tableHead}>
				<span>Проект</span>
				<span>Ответственный</span>
				<span>Куплено</span>
				<span>План</span>
				<span>Факт</span>
				<span>Потери</span>
				<span>Маржа</span>
				<span>Статус</span>
			</div>
			{projects.length ? (
				projects.map((project) => {
					const planHours = getProjectPlanHours(project.tasks);
					const factHours = getProjectFactHours(project.reports);
					const losses = getLossHours(project);
					const status = getProjectStatus(project);

					return (
						<div key={project.id} className={styles.projectRow}>
							<strong>
								{project.title}
								<small>Всего: {project.tasks.length} задач</small>
							</strong>
							<span>{getUserName(users, project.assignedById)}</span>
							<span className={styles.mutedValue}>
								{formatHours(purchasedHours)}
							</span>
							<span>{formatHours(planHours)}</span>
							<span>{formatHours(factHours)}</span>
							<span>
								<em>сверх {formatHours(Math.max(factHours - planHours, 0))}</em>
								<em className={styles.warningPill}>
									{formatHours(losses.company + losses.unpaid)} unpaid/company
								</em>
							</span>
							<span className={styles.mockPill}>
								mock {MOCK_MARGIN_PERCENT}%
							</span>
							<span
								className={
									status === "В норме" ? styles.successPill : styles.dangerPill
								}
							>
								{status}
							</span>
						</div>
					);
				})
			) : (
				<div className={styles.emptyState}>
					Проект не найден по PARENT_ID_1092 этой сделки
				</div>
			)}
		</div>
	</div>
);

const TasksTab = ({
	items,
	users,
	openTask,
}: {
	items: Array<{ task: TaskProps; project: ProfitabilityProject }>;
	users: User[];
	openTask: (id: string | number) => void;
}) => (
	<div className={styles.tableCard}>
		<div className={styles.tableTitle}>Задачи ({items.length})</div>
		<div className={styles.tasksTable}>
			<div className={styles.tasksHead}>
				<span>Задача</span>
				<span>Ответственный</span>
				<span>Проект</span>
				<span>План</span>
				<span>Факт</span>
				<span>Тип оплаты</span>
				<span>Статус</span>
			</div>
			{items.length ? (
				items.map(({ task, project }) => (
					<button
						key={task.id}
						type="button"
						className={styles.taskRow}
						onClick={() => openTask(task.id)}
					>
						<strong>{getTaskTitle(task)}</strong>
						<span>{getUserName(users, task.assignedById)}</span>
						<span>{project.title}</span>
						<span>{formatHours(toNumber(task[TaskCodes.estimateTime]))}</span>
						<span>{formatHours(toNumber(task[TaskCodes.timeSpent]))}</span>
						<span className={styles.paymentPill}>
							{getPaymentKindFromTaskType(task[TaskCodes.taskType])}
						</span>
						<span className={styles.successPill}>{task.stageId}</span>
					</button>
				))
			) : (
				<div className={styles.emptyState}>
					Задачи по проектам сделки не найдены
				</div>
			)}
		</div>
	</div>
);

const ReportsTab = ({
	activities,
	items,
	users,
	openReport,
}: {
	activities: ActivityListItem[];
	items: Array<{ report: ReportProps; project: ProfitabilityProject }>;
	users: User[];
	openReport: (id: string | number) => void;
}) => (
	<div className={styles.tableCard}>
		<div className={styles.tableTitle}>
			Все отчёты сотрудников ({items.length})
		</div>
		<div className={styles.reportsTable}>
			<div className={styles.reportsHead}>
				<span>Дата</span>
				<span>Сотрудник</span>
				<span>Проект</span>
				<span>Задача</span>
				<span>Активность</span>
				<span>Часы</span>
				<span>Клиентский отчёт</span>
			</div>
			{items.length ? (
				items.map(({ report, project }) => (
					<button
						key={report.id}
						type="button"
						className={styles.reportRow}
						onClick={() => openReport(report.id)}
					>
						<span>
							{new Date(report.begindate).toLocaleDateString("ru-RU")}
						</span>
						<span>{getUserName(users, report.assignedById)}</span>
						<span>{project.title}</span>
						<span>{report[ReportCodes.title]}</span>
						<span>
							{getActivityName(activities, report[ReportCodes.activityType])}
						</span>
						<strong>
							{formatHours(toNumber(report[ReportCodes.timeSpent]))}
						</strong>
						<span className={styles.paymentPill}>Показывать</span>
					</button>
				))
			) : (
				<div className={styles.emptyState}>
					Отчёты по проектам сделки не найдены
				</div>
			)}
		</div>
	</div>
);

const ProfitabilitySkeleton = () => (
	<div className={styles.skeletonWrap}>
		<div className={styles.skeletonCards}>
			{Array.from({ length: 6 }, (_, index) => (
				<span key={index} />
			))}
		</div>
		<div className={styles.skeletonTable}>
			{Array.from({ length: 5 }, (_, index) => (
				<span key={index} />
			))}
		</div>
	</div>
);
