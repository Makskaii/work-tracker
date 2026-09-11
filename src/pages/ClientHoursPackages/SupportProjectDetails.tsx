import { useState } from "react";
import {
	FiArchive,
	FiCalendar,
	FiChevronDown,
	FiChevronRight,
	FiClock,
	FiEdit3,
	FiFileText,
	FiPlus,
} from "react-icons/fi";
import styles from "./ClientHoursPackagesPage.module.scss";
import { SupportHoursReportDrawer } from "./SupportHoursReportDrawer";
import type { SupportProjectTask } from "./clientHoursPackages.api";
import type {
	ClientPackage,
	PackagePurchase,
	SupportProjectOption,
} from "./clientHoursPackages.types";

type SupportProjectDetailsProps = {
	project: SupportProjectOption | null;
	projectPackages: ClientPackage | null;
	projectTasks: SupportProjectTask[];
	selectedPurchaseId: number | null;
	onAddPackage: () => void;
	onEditPackage: (purchase: PackagePurchase) => void;
};

export type SupportHoursReportItem = {
	id: string;
	taskId: string | null;
	taskTitle: string | null;
	responsibleName: string | null;
	companyName: string | null;
	projectTitle: string | null;
	activityTitle: string | null;
	date: string;
	hours: number;
	title: string | null;
	description: string | null;
	allocations: { purchaseId: number; purchaseDate: string; hours: number }[];
};

type TaskGroup = {
	id: string;
	title: string;
	hours: number;
	reports: SupportHoursReportItem[];
};

const formatHours = (value: number) =>
	`${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(value)} ч`;
const formatDate = (value: string) =>
	new Intl.DateTimeFormat("ru-RU", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	}).format(new Date(value));

const collectReports = (purchases: PackagePurchase[]) => {
	const reports = new Map<string, SupportHoursReportItem>();
	purchases.forEach((purchase) =>
		purchase.consumptions.forEach((consumption) => {
			const current = reports.get(consumption.report.bitrixReportId);
			reports.set(consumption.report.bitrixReportId, {
				id: consumption.report.bitrixReportId,
				taskId: consumption.report.bitrixTaskId,
				taskTitle: consumption.report.taskTitle,
				responsibleName: consumption.report.responsibleName,
				companyName: consumption.report.companyName,
				projectTitle: consumption.report.projectTitle,
				activityTitle: consumption.report.activityTitle,
				date: consumption.report.reportDate,
				hours: (current?.hours ?? 0) + consumption.hours,
				title: consumption.report.reportTitle,
				description: consumption.report.reportDescription,
				allocations: [
					...(current?.allocations ?? []),
					{
						purchaseId: purchase.id,
						purchaseDate: purchase.date,
						hours: consumption.hours,
					},
				],
			});
		}),
	);
	return Array.from(reports.values()).toSorted(
		(first, second) =>
			new Date(second.date).getTime() - new Date(first.date).getTime(),
	);
};

const collectTasks = (
	purchases: PackagePurchase[],
	projectTasks: SupportProjectTask[],
) => {
	const tasks = new Map<string, TaskGroup>();
	collectReports(purchases).forEach((report) => {
		const id = report.taskId ?? `report-${report.id}`;
		const current = tasks.get(id);
		tasks.set(id, {
			id,
			title:
				report.taskTitle ||
				(report.taskId ? `Задача #${report.taskId}` : "Задача не указана"),
			hours: (current?.hours ?? 0) + report.hours,
			reports: [...(current?.reports ?? []), report],
		});
	});
	projectTasks.forEach((task) => {
		if (tasks.has(task.id)) return;
		tasks.set(task.id, { id: task.id, title: task.title, hours: 0, reports: [] });
	});
	return Array.from(tasks.values()).toSorted(
		(first, second) =>
			new Date(second.reports[0]?.date ?? 0).getTime() -
			new Date(first.reports[0]?.date ?? 0).getTime() ||
			first.title.localeCompare(second.title, "ru"),
	);
};

export const SupportProjectDetails = ({
	project,
	projectPackages,
	projectTasks,
	selectedPurchaseId,
	onAddPackage,
	onEditPackage,
}: SupportProjectDetailsProps) => {
	const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(new Set());
	const [selectedReport, setSelectedReport] =
		useState<SupportHoursReportItem | null>(null);
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
			: purchases.find((purchase) => purchase.id === effectivePurchaseId) ?? null;
	const displayedPurchaseDate = selectedPurchase
		? formatDate(selectedPurchase.date)
		: "Не указан";
	const scopedPurchases = selectedPurchase ? [selectedPurchase] : purchases;
	const tasks = collectTasks(scopedPurchases, projectTasks);
	const reports = collectReports(scopedPurchases);
	const visibleSelectedReport =
		reports.find((report) => report.id === selectedReport?.id) ?? null;
	const purchasedHours = scopedPurchases.reduce((sum, purchase) => sum + purchase.hours, 0);
	const consumedHours = scopedPurchases.reduce(
		(sum, purchase) =>
			sum + purchase.consumptions.reduce((total, consumption) => total + consumption.hours, 0),
		0,
	);
	const remainingHours = selectedPurchase
		? selectedPurchase.remaining
		: projectPackages?.remainingHours ?? 0;
	const reportCount = tasks.reduce((sum, task) => sum + task.reports.length, 0);
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
						{projectPackages ? <span className={styles.packageState}>{projectPackages.status}</span> : null}
					</div>
					<p>Управление пакетами часов и историей списаний по проекту</p>
				</div>
				<div className={styles.detailsActions}>
					<button className={styles.addPackageButton} type="button" onClick={onAddPackage}>
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
						<div><span>{selectedPurchase ? "Выбранный пакет" : "Все пакеты"}</span><strong>{selectedPurchase ? `Пакет от ${displayedPurchaseDate}` : "Все пакеты проекта"}</strong></div>
					</div>
					<div className={styles.packageMetric}><span>Куплено</span><strong>{formatHours(purchasedHours)}</strong></div>
					<div className={styles.packageMetric}><span>Списано</span><strong>{formatHours(consumedHours)}</strong></div>
					<div className={styles.packageMetric}><span>Остаток</span><strong className={styles[projectPackages.state]}>{formatHours(remainingHours)}</strong></div>
					<div className={styles.usageProgress}><div><span style={{ width: `${usagePercent}%` }} /></div><small>{usagePercent}% использования</small></div>
					<div className={styles.packageFacts}>
						<span><FiCalendar aria-hidden="true" /><i>Период пакета</i><b>с {displayedPurchaseDate}</b></span>
						<span><FiFileText aria-hidden="true" /><i>Количество отчётов</i><b>{reportCount}</b></span>
						<span><FiClock aria-hidden="true" /><i>Среднее списание</i><b>{formatHours(reportCount ? consumedHours / reportCount : 0)} на отчёт</b></span>
					</div>
				</section>
			) : (
				<section className={styles.packageOverviewEmpty}>
					<p>Для проекта ещё не добавлены пакеты часов.</p>
					<button className={styles.addPackageButton} type="button" onClick={onAddPackage}><FiPlus aria-hidden="true" /> Добавить пакет</button>
				</section>
			)}

			<div className={styles.reportingWorkspace}>
			<section className={styles.detailsSection}>
				<div className={styles.sectionHeading}>
					<h2>Списания по задачам и отчётам</h2>
					<span>{tasks.length}</span>
				</div>
				{tasks.length ? (
					<div className={styles.tasksList}>
						{tasks.map((task) => {
							const isExpanded = expandedTaskIds.has(task.id);
							return (
								<div className={styles.taskItem} key={task.id}>
									<button
										className={styles.taskToggle}
										type="button"
										onClick={() => toggleTask(task.id)}
										aria-expanded={isExpanded}
									>
										{isExpanded ? <FiChevronDown aria-hidden="true" /> : <FiChevronRight aria-hidden="true" />}
										<div>
											<strong>{task.title}</strong>
											<small>
												{task.reports.length
													? `${task.reports.length} отчётов`
													: "Списаний пока нет"}
											</small>
										</div>
										<b>{formatHours(task.hours)}</b>
									</button>
									{isExpanded && task.reports.length ? (
										<div className={styles.reportsList}>
											<div className={styles.reportColumns}>
												<span>Дата</span>
								<span>Активность</span>
												<span>Описание</span>
												<span>Часы</span>
											</div>
											{task.reports.map((report) => (
												<div className={styles.reportItem} key={report.id}>
													<button className={styles.reportToggle} type="button" onClick={() => setSelectedReport(report)}>
														<time>{formatDate(report.date)}</time>
									<strong>{report.activityTitle || "Активность не указана"}</strong>
														<span className={styles.reportPreview}>
															{report.description || "Описание не указано"}
														</span>
														<b>{formatHours(report.hours)}</b>
													</button>
												</div>
											))}
										</div>
									) : isExpanded ? (
										<p className={styles.sectionEmpty}>Списаний по этой задаче пока нет.</p>
									) : null}
								</div>
							);
						})}
					</div>
				) : (
					<p className={styles.sectionEmpty}>Задачи техпод-проекта пока не найдены.</p>
				)}
			</section>
			<SupportHoursReportDrawer
				report={visibleSelectedReport}
				onClose={() => setSelectedReport(null)}
			/>
			</div>
		</main>
	);
};
