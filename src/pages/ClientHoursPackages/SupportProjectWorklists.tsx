import { useMemo, useState } from "react";
import {
	FiChevronDown,
	FiChevronRight,
	FiExternalLink,
	FiFileText,
	FiPlus,
	FiSearch,
} from "react-icons/fi";
import { EntityTypeIds } from "@/shared/constants/const";
import { useBitrixSlider } from "@/shared/hooks/useBitrixSlider";
import type { SupportProjectTask } from "./clientHoursPackages.api";
import styles from "./ClientHoursPackagesPage.module.scss";
import { SupportHoursReportDrawer } from "./SupportHoursReportDrawer";
import {
	collectSupportEntries,
	matchesSupportEntry,
	type SupportHoursReportItem,
	type TaskStatusFilter,
} from "./supportReportEntries";
import type { SupportProjectWorkspace } from "./supportWorkspace.api";
import {
	buildSupportWorkspaceLists,
	type SupportWorklistTab,
} from "./supportWorkspaceLists";

const hours = (value: number) =>
	`${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(value)} ч`;
const dateLabel = (value: string) =>
	new Intl.DateTimeFormat("ru-RU", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	}).format(new Date(value));
const reportSum = (reports: SupportHoursReportItem[]) =>
	reports.reduce((sum, report) => sum + report.hours, 0);
const titles: Record<SupportWorklistTab, string> = {
	allocated: "В пакетах",
	unallocated: "Без пакета",
	excluded: "Не учитываются",
	tasks: "Задачи без отчётов",
};
const emptyText: Record<SupportWorklistTab, string> = {
	allocated: "Списаний за выбранный период пока нет.",
	unallocated: "Нет отчётов, ожидающих распределения по пакетам.",
	excluded: "Нет отчётов с выключенным учётом в пакете.",
	tasks: "У всех задач проекта уже есть отчёты.",
};
const SupportReportRow = ({
	report,
	onOpen,
}: {
	report: SupportHoursReportItem;
	onOpen: () => void;
}) => (
	<button
		className={`${styles.supportReportRow} ${report.hourScope === "excluded" ? styles.excludedReportRow : report.hourScope === "unallocated" ? styles.unallocatedReportRow : ""}`}
		type="button"
		onClick={onOpen}
		aria-label={`Посмотреть отчёт: ${report.description || report.title || `#${report.id}`}`}
	>
		<FiFileText aria-hidden="true" />
		<span className={styles.supportReportSummary}>
			<strong>
				{report.description || report.title || `Отчёт #${report.id}`}
			</strong>
			<small>
				<time dateTime={report.date}>{dateLabel(report.date)}</time>
				{report.responsibleName ? ` · ${report.responsibleName}` : ""}
				{report.totalHours != null && report.totalHours !== report.hours
					? ` · Всего по отчёту ${hours(report.totalHours)}`
					: ""}
			</small>
		</span>
		<b>{hours(report.hours)}</b>
		<FiChevronRight aria-hidden="true" />
	</button>
);

type Props = {
	projectId: number;
	projectTitle: string;
	selectedPurchaseId: number | null;
	allocatedReports: SupportHoursReportItem[];
	projectTasks: SupportProjectTask[];
	workspace?: SupportProjectWorkspace | null;
	workspaceLoading?: boolean;
	workspaceError?: string | null;
	onRetryWorkspace?: () => void;
	onAddPackage: () => void;
	onAddReport?: (taskId?: string) => void;
	onEditReport?: (reportId: string) => void;
	onCardClosed?: () => Promise<void>;
};
export const SupportProjectWorklists = ({
	projectId,
	projectTitle,
	selectedPurchaseId,
	allocatedReports,
	projectTasks,
	workspace,
	workspaceLoading = false,
	workspaceError,
	onRetryWorkspace,
	onAddPackage,
	onAddReport,
	onEditReport,
	onCardClosed,
}: Props) => {
	const { openTask } = useBitrixSlider();
	const [selection, setSelection] = useState<{
		projectId: number;
		tab: SupportWorklistTab;
	}>({ projectId, tab: "allocated" });
	const activeTab =
		selection.projectId === projectId ? selection.tab : "allocated";
	const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(
		new Set(),
	);
	const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
	const [query, setQuery] = useState("");
	const [status, setStatus] = useState<TaskStatusFilter>("all");
	const currentWorkspace =
		workspace?.projectId === projectId ? workspace : null;
	const lists = useMemo(
		() =>
			currentWorkspace
				? buildSupportWorkspaceLists(currentWorkspace, projectTitle)
				: null,
		[currentWorkspace, projectTitle],
	);
	const reports =
		activeTab === "allocated"
			? allocatedReports
			: activeTab === "unallocated"
				? (lists?.unallocated ?? [])
				: activeTab === "excluded"
					? (lists?.excluded ?? [])
					: [];
	const entries = collectSupportEntries(
		reports,
		currentWorkspace?.tasks ?? projectTasks,
	);
	const visibleEntries = entries.filter((entry) =>
		matchesSupportEntry(entry, query, status),
	);
	const tasks = (lists?.tasks ?? []).filter((task) =>
		matchesSupportEntry(
			{ kind: "task", ...task, hours: 0, reports: [] },
			query,
			status,
		),
	);
	const selectedReport =
		reports.find((report) => report.id === selectedReportId) ?? null;
	const hasFreshWorkspace = !!lists && !workspaceLoading && !workspaceError;
	const tabDetails = (tab: SupportWorklistTab) => {
		if (tab === "allocated")
			return `${allocatedReports.length} · ${hours(reportSum(allocatedReports))}`;
		if (!hasFreshWorkspace || !lists) return "—";
		if (tab === "tasks") return String(lists.tasks.length);
		return `${lists[tab].length} · ${hours(reportSum(lists[tab]))}`;
	};
	const changeTab = (tab: SupportWorklistTab) => {
		setSelection({ projectId, tab });
		setSelectedReportId(null);
	};
	const toggleTask = (taskId: string) =>
		setExpandedTaskIds((current) => {
			const next = new Set(current);
			if (next.has(taskId)) next.delete(taskId);
			else next.add(taskId);
			return next;
		});
	const openTaskCard = async (taskId: string) => {
		await openTask(taskId, EntityTypeIds.tasks);
		await onCardClosed?.();
	};
	const canShowList = activeTab === "allocated" || hasFreshWorkspace;
	return (
		<div className={styles.reportingWorkspace}>
			<section className={styles.detailsSection}>
				<div className={styles.sectionHeading}>
					<h2>Задачи и отчёты проекта</h2>
				</div>
				<div
					className={styles.worklistTabs}
					role="group"
					aria-label="Списки проекта"
				>
					{(Object.keys(titles) as SupportWorklistTab[]).map((tab) => (
						<button
							className={
								activeTab === tab
									? styles.worklistTabActive
									: styles.worklistTab
							}
							type="button"
							key={tab}
							onClick={() => changeTab(tab)}
							aria-pressed={activeTab === tab}
							aria-label={`${titles[tab]} ${tabDetails(tab)}`}
						>
							<span>{titles[tab]}</span>
							<b>{tabDetails(tab)}</b>
						</button>
					))}
				</div>
				<p className={styles.worklistScope}>
					{activeTab === "allocated"
						? selectedPurchaseId == null
							? "Списания по всем пакетам проекта. Часы учитываются в остатках пакетов."
							: `Списания по пакету №${selectedPurchaseId}. Показана только часть часов, списанная с этого пакета.`
						: "Весь проект · выбор пакета не ограничивает этот список."}
				</p>
				{workspaceError && (
					<div className={styles.workspaceError} role="alert">
						<span>{workspaceError}</span>
						{onRetryWorkspace && (
							<button
								className={styles.inlineAction}
								type="button"
								onClick={onRetryWorkspace}
							>
								Повторить загрузку списка
							</button>
						)}
					</div>
				)}
				{activeTab === "unallocated" && hasFreshWorkspace && (
					<div className={styles.worklistNotice}>
						<p>
							Здесь отчёты с включённым учётом, часы которых пока не
							распределены по пакетам. После добавления пакета распределение
							выполнится автоматически.
						</p>
						{lists && lists.unallocated.length > 0 && (
							<button
								className={styles.packageReportButton}
								type="button"
								onClick={onAddPackage}
							>
								<FiPlus aria-hidden="true" />
								Добавить пакет часов
							</button>
						)}
					</div>
				)}
				{activeTab === "excluded" && hasFreshWorkspace && (
					<p className={styles.worklistScope}>
						Эти часы не списываются и не попадают в клиентский PDF. Чтобы
						включить работу, откройте отчёт, нажмите «Изменить отчёт» и включите
						«Учитывать в пакете».
					</p>
				)}
				{activeTab === "tasks" && hasFreshWorkspace && (
					<p className={styles.worklistScope}>
						У этих задач нет ни одного отчёта, в том числе исключённого из
						учёта. Задача сама по себе не списывает часы.
					</p>
				)}
				{!canShowList ? (
					!workspaceError && (
						<div className={styles.workspaceLoading} role="status">
							<p>
								{workspaceLoading
									? "Загружаем отчёты и задачи всего проекта…"
									: "Данные всего проекта ещё не загружены."}
							</p>
							{!workspaceLoading && onRetryWorkspace && (
								<button
									className={styles.inlineAction}
									type="button"
									onClick={onRetryWorkspace}
								>
									Загрузить список
								</button>
							)}
						</div>
					)
				) : (
					<>
						<div className={styles.taskFilters}>
							<label className={styles.taskSearch}>
								<FiSearch aria-hidden="true" />
								<input
									type="search"
									value={query}
									onChange={(event) => setQuery(event.target.value)}
									placeholder="Поиск по задачам и отчётам"
									aria-label="Поиск по задачам и отчётам"
								/>
							</label>
							<div className={styles.taskFilterField}>
								<span>Статус задачи</span>
								<div
									className={styles.taskFilterGroup}
									aria-label="Фильтр по статусу задачи"
								>
									{(
										[
											["all", "Все статусы"],
											["open", "Открытые"],
											["closed", "Завершённые"],
										] as const
									).map(([value, label]) => (
										<button
											className={
												value === status
													? styles.taskFilterButtonActive
													: styles.taskFilterButton
											}
											type="button"
											key={value}
											onClick={() => setStatus(value)}
											aria-pressed={value === status}
										>
											{label}
										</button>
									))}
								</div>
							</div>
						</div>
						{status !== "all" && activeTab !== "tasks" && (
							<p className={styles.filterHint}>
								Фильтр статуса применяется к задачам. Отдельные отчёты остаются
								в списке.
							</p>
						)}
						{activeTab === "tasks" ? (
							tasks.length ? (
								<div className={styles.tasksList}>
									{tasks.map((task) => (
										<div className={styles.emptyTaskRow} key={task.id}>
											<div>
												<strong>{task.title}</strong>
												<small>Отчётов пока нет</small>
											</div>
											<div className={styles.emptyTaskActions}>
												{onAddReport && (
													<button
														className={styles.openTaskButton}
														type="button"
														onClick={() => onAddReport(task.id)}
														aria-label={`Добавить отчёт по задаче: ${task.title}`}
													>
														<FiPlus aria-hidden="true" />
														<span>Добавить отчёт</span>
													</button>
												)}
												<button
													className={styles.openTaskButton}
													type="button"
													onClick={() => void openTaskCard(task.id)}
													aria-label={`Открыть задачу: ${task.title}`}
												>
													<FiExternalLink aria-hidden="true" />
													<span>Открыть задачу</span>
												</button>
											</div>
										</div>
									))}
								</div>
							) : (
								<p className={styles.sectionEmpty}>
									{query.trim() || status !== "all"
										? "Задачи по выбранным фильтрам не найдены."
										: emptyText.tasks}
								</p>
							)
						) : visibleEntries.length ? (
							<div className={styles.tasksList}>
								{visibleEntries.map((entry) => {
									if (entry.kind === "report")
										return (
											<div
												className={styles.standaloneReport}
												key={`report-${entry.id}`}
											>
												<SupportReportRow
													report={entry.report}
													onOpen={() => setSelectedReportId(entry.report.id)}
												/>
											</div>
										);
									const expanded = expandedTaskIds.has(entry.id);
									return (
										<div className={styles.taskItem} key={`task-${entry.id}`}>
											<div className={styles.taskHeader}>
												<button
													className={styles.taskToggle}
													type="button"
													onClick={() => toggleTask(entry.id)}
													aria-expanded={expanded}
													aria-label={`Отчёты по задаче: ${entry.title}`}
												>
													{expanded ? (
														<FiChevronDown aria-hidden="true" />
													) : (
														<FiChevronRight aria-hidden="true" />
													)}
													<span className={styles.taskSummary}>
														<strong>{entry.title}</strong>
														<small>Отчётов: {entry.reports.length}</small>
													</span>
													<b
														className={
															activeTab === "excluded"
																? styles.excludedHours
																: undefined
														}
													>
														{hours(entry.hours)}
													</b>
												</button>
												{onAddReport && (
													<button
														className={styles.openTaskButton}
														type="button"
														onClick={() => onAddReport(entry.id)}
														aria-label={`Добавить отчёт по задаче: ${entry.title}`}
													>
														<FiPlus aria-hidden="true" />
														<span>Добавить отчёт</span>
													</button>
												)}
												<button
													className={styles.openTaskButton}
													type="button"
													onClick={() => void openTaskCard(entry.id)}
													aria-label={`Открыть задачу: ${entry.title}`}
													title="Открыть задачу в Битрикс"
												>
													<FiExternalLink aria-hidden="true" />
													<span>Открыть задачу</span>
												</button>
											</div>
											{expanded && (
												<div className={styles.reportsList}>
													{entry.reports.map((report) => (
														<SupportReportRow
															key={report.id}
															report={report}
															onOpen={() => setSelectedReportId(report.id)}
														/>
													))}
												</div>
											)}
										</div>
									);
								})}
							</div>
						) : (
							<p className={styles.sectionEmpty}>
								{entries.length || query.trim() || status !== "all"
									? "Задачи и отчёты по выбранным фильтрам не найдены."
									: emptyText[activeTab]}
							</p>
						)}
					</>
				)}
			</section>
			<SupportHoursReportDrawer
				report={selectedReport}
				onClose={() => setSelectedReportId(null)}
				onCardClosed={onCardClosed}
				onEdit={
					onEditReport
						? (reportId) => {
								setSelectedReportId(null);
								onEditReport(reportId);
							}
						: undefined
				}
			/>
		</div>
	);
};
