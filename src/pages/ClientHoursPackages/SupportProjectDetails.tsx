import { useState } from "react";
import {
	FiArchive,
	FiCalendar,
	FiChevronDown,
	FiChevronRight,
	FiClock,
	FiEdit3,
	FiExternalLink,
	FiFileText,
	FiPlus,
	FiSearch,
} from "react-icons/fi";
import { EntityTypeIds } from "@/shared/constants/const";
import { useBitrixSlider } from "@/shared/hooks/useBitrixSlider";
import styles from "./ClientHoursPackagesPage.module.scss";
import { type SupportProjectTask } from "./clientHoursPackages.api";
import type {
	ClientPackage,
	PackagePurchase,
	SupportProjectOption,
} from "./clientHoursPackages.types";
import { SupportPackageReportPanel } from "./SupportPackageReportPanel";
import { SupportHoursReportDrawer } from "./SupportHoursReportDrawer";
import {
	collectSupportEntries,
	collectSupportReports,
	matchesSupportEntry,
	type SupportHoursReportItem,
	type TaskStatusFilter,
} from "./supportReportEntries";

type SupportProjectDetailsProps = {
	project: SupportProjectOption | null;
	projectPackages: ClientPackage | null;
	projectTasks: SupportProjectTask[];
	selectedPurchaseId: number | null;
	onAddPackage: () => void;
	onAddReport?: (taskId?: string) => void;
	onEditReport?: (reportId: string) => void;
	onCardClosed?: () => Promise<void>;
	refreshKey?: number;
	onEditPackage: (purchase: PackagePurchase) => void;
};

const formatHours = (value: number) =>
	`${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(value)} ч`;
const formatDate = (value: string) =>
	new Intl.DateTimeFormat("ru-RU", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	}).format(new Date(value));

const SupportReportRow = ({
	report,
	onOpen,
}: {
	report: SupportHoursReportItem;
	onOpen: () => void;
}) => (
	<button
		className={styles.supportReportRow}
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
				<time dateTime={report.date}>{formatDate(report.date)}</time>
				{report.responsibleName ? ` · ${report.responsibleName}` : ""}
			</small>
		</span>
		<b>{formatHours(report.hours)}</b>
		<FiChevronRight aria-hidden="true" />
	</button>
);

export const SupportProjectDetails = ({
	project,
	projectPackages,
	projectTasks,
	selectedPurchaseId,
	onAddPackage,
	onAddReport,
	onEditReport,
	onCardClosed,
	refreshKey,
	onEditPackage,
}: SupportProjectDetailsProps) => {
	const { openTask } = useBitrixSlider();
	const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(
		new Set(),
	);
	const [selectedReport, setSelectedReport] =
		useState<SupportHoursReportItem | null>(null);
	const [taskQuery, setTaskQuery] = useState("");
	const [taskStatusFilter, setTaskStatusFilter] =
		useState<TaskStatusFilter>("all");
	if (!project)
		return (
			<main className={styles.projectDetails}>
				<p className={styles.detailsEmpty}>
					Выберите техпод-проект в списке слева
				</p>
			</main>
		);

	const purchases = projectPackages?.purchases ?? [];
	const effectivePurchaseId =
		selectedPurchaseId != null &&
		purchases.some((purchase) => purchase.id === selectedPurchaseId)
			? selectedPurchaseId
			: null;
	const selectedPurchase =
		effectivePurchaseId == null
			? null
			: (purchases.find((purchase) => purchase.id === effectivePurchaseId) ??
				null);
	const reportPurchase =
		selectedPurchase ?? (purchases.length === 1 ? purchases[0] : null);

	const periodPurchase =
		selectedPurchase ??
		purchases.toSorted(
			(first, second) =>
				new Date(first.date).getTime() - new Date(second.date).getTime(),
		)[0] ??
		null;
	const displayedPurchaseDate = periodPurchase
		? formatDate(periodPurchase.date)
		: "Не указан";
	const scopedPurchases = selectedPurchase ? [selectedPurchase] : purchases;
	const reports = collectSupportReports(scopedPurchases);
	const entries = collectSupportEntries(reports, projectTasks);
	const visibleEntries = entries.filter((entry) =>
		matchesSupportEntry(entry, taskQuery, taskStatusFilter),
	);
	const visibleSelectedReport =
		reports.find((report) => report.id === selectedReport?.id) ?? null;
	const purchasedHours = scopedPurchases.reduce(
		(sum, purchase) => sum + purchase.hours,
		0,
	);
	const consumedHours = scopedPurchases.reduce(
		(sum, purchase) =>
			sum +
			purchase.consumptions.reduce(
				(total, consumption) => total + consumption.hours,
				0,
			),
		0,
	);
	const remainingHours = selectedPurchase
		? selectedPurchase.remaining
		: (projectPackages?.remainingHours ?? 0);
	const reportCount = reports.length;
	const usagePercent = purchasedHours
		? Math.min(100, Math.round((consumedHours / purchasedHours) * 100))
		: 0;
	const toggleTask = (taskId: string) => {
		setExpandedTaskIds((current) => {
			const next = new Set(current);
			if (next.has(taskId)) next.delete(taskId);
			else next.add(taskId);
			return next;
		});
	};

	return (
		<main className={styles.projectDetails}>
			<header className={styles.detailsHeader}>
				<div>
					<div className={styles.projectTitleLine}>
						<h1>{project.title}</h1>
						{projectPackages ? (
							<span className={styles.packageState}>
								{projectPackages.status}
							</span>
						) : null}
					</div>
					<p>Управление пакетами часов и историей списаний по проекту</p>
				</div>
				<div className={styles.detailsActions}>
					{onAddReport && (
						<button
							className={styles.packageReportButton}
							type="button"
							onClick={() => onAddReport()}
						>
							<FiPlus aria-hidden="true" />
							Добавить отчёт
						</button>
					)}

					<button
						className={styles.addPackageButton}
						type="button"
						onClick={onAddPackage}
					>
						<FiPlus aria-hidden="true" /> Новый пакет
					</button>
					{selectedPurchase ? (
						<button
							className={styles.editPackageButton}
							type="button"
							onClick={() => onEditPackage(selectedPurchase)}
							aria-label={`Изменить пакет от ${displayedPurchaseDate}`}
						>
							<FiEdit3 aria-hidden="true" />
						</button>
					) : null}
				</div>
			</header>
			{projectPackages ? (
				<section className={styles.packageOverview}>
					<div className={styles.currentPackage}>
						<FiArchive aria-hidden="true" />
						<div>
							<span>{selectedPurchase ? "Выбранный пакет" : "Все пакеты"}</span>
							<strong>
								{selectedPurchase
									? `Пакет от ${displayedPurchaseDate}`
									: "Все пакеты проекта"}
							</strong>
						</div>
					</div>
					<div className={styles.packageMetric}>
						<span>Куплено</span>
						<strong>{formatHours(purchasedHours)}</strong>
					</div>
					<div className={styles.packageMetric}>
						<span>Списано</span>
						<strong>{formatHours(consumedHours)}</strong>
					</div>
					<div className={styles.packageMetric}>
						<span>Остаток</span>
						<strong className={styles[projectPackages.state]}>
							{formatHours(remainingHours)}
						</strong>
					</div>
					<div className={styles.usageProgress}>
						<div>
							<span style={{ width: `${usagePercent}%` }} />
						</div>
						<small>{usagePercent}% использования</small>
					</div>
					<div className={styles.packageFacts}>
						<span>
							<FiCalendar aria-hidden="true" />
							<i>Период пакета</i>
							<b>с {displayedPurchaseDate}</b>
						</span>
						<span>
							<FiFileText aria-hidden="true" />
							<i>Количество отчётов</i>
							<b>{reportCount}</b>
						</span>
						<span>
							<FiClock aria-hidden="true" />
							<i>Среднее списание</i>
							<b>
								{formatHours(reportCount ? consumedHours / reportCount : 0)} на
								отчёт
							</b>
						</span>
					</div>
				</section>
			) : (
				<section className={styles.packageOverviewEmpty}>
					<p>Для проекта ещё не добавлены пакеты часов.</p>
				</section>
			)}

			<SupportPackageReportPanel
				packageId={reportPurchase?.id ?? null}
				hasPackages={purchases.length > 0}
				refreshKey={refreshKey}
				onCardClosed={onCardClosed}
			/>
			<div className={styles.reportingWorkspace}>
				<section className={styles.detailsSection}>
					<div className={styles.sectionHeading}>
						<h2>Списания по задачам и отчётам</h2>
						<span>{visibleEntries.length}</span>
					</div>
					<div className={styles.taskFilters}>
						<label className={styles.taskSearch}>
							<FiSearch aria-hidden="true" />
							<input
								type="search"
								value={taskQuery}
								onChange={(event) => setTaskQuery(event.target.value)}
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
											value === taskStatusFilter
												? styles.taskFilterButtonActive
												: styles.taskFilterButton
										}
										type="button"
										key={value}
										onClick={() => setTaskStatusFilter(value)}
										aria-pressed={value === taskStatusFilter}
									>
										{label}
									</button>
								))}
							</div>
						</div>
					</div>
					{taskStatusFilter !== "all" ? (
						<p className={styles.filterHint}>
							Фильтр статуса применяется к задачам. Отдельные отчёты остаются в
							списке.
						</p>
					) : null}
					{visibleEntries.length ? (
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
												onOpen={() => setSelectedReport(entry.report)}
											/>
										</div>
									);
								const isExpanded = expandedTaskIds.has(entry.id);
								return (
									<div className={styles.taskItem} key={`task-${entry.id}`}>
										<div className={styles.taskHeader}>
											<button
												className={styles.taskToggle}
												type="button"
												onClick={() => toggleTask(entry.id)}
												aria-expanded={isExpanded}
												aria-label={`Отчёты по задаче: ${entry.title}`}
											>
												{isExpanded ? (
													<FiChevronDown aria-hidden="true" />
												) : (
													<FiChevronRight aria-hidden="true" />
												)}
												<span className={styles.taskSummary}>
													<strong>{entry.title}</strong>
													<small>Отчётов: {entry.reports.length}</small>
												</span>
												<b>{formatHours(entry.hours)}</b>
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
												onClick={async () => {
													await openTask(entry.id, EntityTypeIds.tasks);
													await onCardClosed?.();
												}}
												aria-label={`Открыть задачу: ${entry.title}`}
												title="Открыть задачу в Битрикс"
											>
												<FiExternalLink aria-hidden="true" />
												<span>Открыть задачу</span>
											</button>
										</div>
										{isExpanded ? (
											<div className={styles.reportsList}>
												{entry.reports.map((report) => (
													<SupportReportRow
														key={report.id}
														report={report}
														onOpen={() => setSelectedReport(report)}
													/>
												))}
											</div>
										) : null}
									</div>
								);
							})}
						</div>
					) : (
						<p className={styles.sectionEmpty}>
							{entries.length
								? "Задачи и отчёты по выбранным фильтрам не найдены."
								: "Списаний за выбранный период пока нет."}
						</p>
					)}
				</section>
				<SupportHoursReportDrawer
					report={visibleSelectedReport}
					onClose={() => setSelectedReport(null)}
					onCardClosed={onCardClosed}
					onEdit={
						onEditReport
							? (reportId) => {
									setSelectedReport(null);
									onEditReport(reportId);
								}
							: undefined
					}
				/>
			</div>
		</main>
	);
};
