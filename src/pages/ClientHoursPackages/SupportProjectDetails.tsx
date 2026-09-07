import { useState } from "react";
import { FaChevronDown, FaChevronRight, FaPen, FaPlus } from "react-icons/fa";
import styles from "./ClientHoursPackagesPage.module.scss";
import { SupportHoursReportDrawer } from "./SupportHoursReportDrawer";
import type {
	ClientPackage,
	PackagePurchase,
	SupportProjectOption,
} from "./clientHoursPackages.types";

type SupportProjectDetailsProps = {
	project: SupportProjectOption | null;
	projectPackages: ClientPackage | null;
	onAddPackage: () => void;
	onEditPackage: (purchase: PackagePurchase) => void;
};

export type SupportHoursReportItem = {
	id: string;
	taskId: string | null;
	taskTitle: string | null;
	responsibleName: string | null;
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

const collectTasks = (purchases: PackagePurchase[]) => {
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
	return Array.from(tasks.values()).toSorted(
		(first, second) =>
			new Date(second.reports[0].date).getTime() -
			new Date(first.reports[0].date).getTime(),
	);
};

export const SupportProjectDetails = ({
	project,
	projectPackages,
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
	const tasks = collectTasks(purchases);
	const purchasedHours = purchases.reduce((sum, purchase) => sum + purchase.hours, 0);
	const consumedHours = purchases.reduce(
		(sum, purchase) =>
			sum + purchase.consumptions.reduce((total, consumption) => total + consumption.hours, 0),
		0,
	);
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
					<span className={styles.eyebrow}>Техпод проект</span>
					<h1>{project.title}</h1>
					{projectPackages ? (
						<p className={styles.detailsStatus}>
							<b className={styles[projectPackages.state]}>
								{formatHours(projectPackages.remainingHours)}
							</b>
							<span>{projectPackages.status}</span>
						</p>
					) : (
						<p>Для проекта ещё не добавлены пакеты часов</p>
					)}
					{projectPackages ? (
						<div className={styles.detailsMetrics}>
							<span>
								Куплено <b>{formatHours(purchasedHours)}</b>
							</span>
							<span>
								Списано <b>{formatHours(consumedHours)}</b>
							</span>
							<span>
								Осталось{" "}
								<b className={styles[projectPackages.state]}>
									{formatHours(projectPackages.remainingHours)}
								</b>
							</span>
						</div>
					) : null}
				</div>
				<button
					className={styles.addPackageButton}
					type="button"
					onClick={onAddPackage}
				>
					<FaPlus aria-hidden="true" /> Новый пакет
				</button>
			</header>

			<section className={styles.detailsSection}>
				<div className={styles.sectionHeading}>
					<h2>Пакеты часов</h2>
					<span>{purchases.length}</span>
				</div>
				{purchases.length ? (
					<div className={styles.purchaseList}>
						{purchases.map((purchase) => (
							<div className={styles.purchaseItem} key={purchase.id}>
								<div>
									<strong>Пакет от {formatDate(purchase.date)}</strong>
									<small>{purchase.state}</small>
								</div>
								<div>
									<span>Куплено</span>
									<strong>{formatHours(purchase.hours)}</strong>
								</div>
								<div>
									<span>Остаток</span>
									<strong>{formatHours(purchase.remaining)}</strong>
								</div>
								<button
									type="button"
									onClick={() => onEditPackage(purchase)}
									aria-label={`Изменить пакет от ${formatDate(purchase.date)}`}
								>
									<FaPen aria-hidden="true" />
								</button>
							</div>
						))}
					</div>
				) : (
					<p className={styles.sectionEmpty}>
						Добавьте первый пакет, чтобы начать учитывать часы техподдержки.
					</p>
				)}
			</section>

			<section className={styles.detailsSection}>
				<div className={styles.sectionHeading}>
					<h2>Списания по отчётам</h2>
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
										{isExpanded ? <FaChevronDown aria-hidden="true" /> : <FaChevronRight aria-hidden="true" />}
										<div>
											<strong>{task.title}</strong>
											<small>{task.reports.length} отчётов</small>
										</div>
										<b>{formatHours(task.hours)}</b>
									</button>
									{isExpanded && (
										<div className={styles.reportsList}>
											<div className={styles.reportColumns}>
												<span>Дата</span>
												<span>Отчёт</span>
												<span>Описание</span>
												<span>Часы</span>
											</div>
											{task.reports.map((report) => (
												<div className={styles.reportItem} key={report.id}>
													<button className={styles.reportToggle} type="button" onClick={() => setSelectedReport(report)}>
														<time>{formatDate(report.date)}</time>
														<strong>{report.title || "Отчёт по техподдержке"}</strong>
														<span className={styles.reportPreview}>
															{report.description || "Описание не указано"}
														</span>
														<b>{formatHours(report.hours)}</b>
													</button>
												</div>
											))}
										</div>
									)}
								</div>
							);
						})}
					</div>
				) : (
					<p className={styles.sectionEmpty}>Списаний по отчётам пока нет.</p>
				)}
			</section>
			<SupportHoursReportDrawer
				report={selectedReport}
				onClose={() => setSelectedReport(null)}
			/>
		</main>
	);
};
