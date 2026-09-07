import { useState } from "react";
import { FaChevronDown, FaChevronRight, FaFileAlt, FaPen, FaPlus } from "react-icons/fa";
import styles from "./ClientHoursPackagesPage.module.scss";
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

type ReportRow = {
	id: string;
	taskId: string | null;
	taskTitle: string | null;
	date: string;
	hours: number;
	title: string | null;
	description: string | null;
};

type TaskGroup = {
	id: string;
	title: string;
	hours: number;
	reports: ReportRow[];
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
	const reports = new Map<string, ReportRow>();
	purchases.forEach((purchase) =>
		purchase.consumptions.forEach((consumption) => {
			const current = reports.get(consumption.report.bitrixReportId);
			reports.set(consumption.report.bitrixReportId, {
				id: consumption.report.bitrixReportId,
				taskId: consumption.report.bitrixTaskId,
				taskTitle: consumption.report.taskTitle,
				date: consumption.report.reportDate,
				hours: (current?.hours ?? 0) + consumption.hours,
				title: consumption.report.reportTitle,
				description: consumption.report.reportDescription,
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
											{task.reports.map((report) => (
												<div className={styles.reportItem} key={report.id}>
													<FaFileAlt aria-hidden="true" />
													<div>
														<strong>{report.title || "Отчёт по техподдержке"}</strong>
														<small>{report.description || "Описание не указано"}</small>
													</div>
													<time>{formatDate(report.date)}</time>
													<b>{formatHours(report.hours)}</b>
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
		</main>
	);
};
