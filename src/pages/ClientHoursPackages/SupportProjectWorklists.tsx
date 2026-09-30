import { useRef, useState, type DragEvent } from "react";
import {
	FiArrowLeft,
	FiArrowRight,
	FiChevronDown,
	FiChevronRight,
	FiExternalLink,
	FiFileText,
	FiMove,
	FiPlus,
	FiSearch,
} from "react-icons/fi";
import { EntityTypeIds } from "@/shared/constants/const";
import { useBitrixSlider } from "@/shared/hooks/useBitrixSlider";
import type { SupportProjectTask } from "./clientHoursPackages.api";
import type { PackagePurchase } from "./clientHoursPackages.types";
import styles from "./ClientHoursPackagesPage.module.scss";
import { SupportHoursReportDrawer } from "./SupportHoursReportDrawer";
import { SupportTransferDialog } from "./SupportTransferDialog";
import {
	collectSupportEntries,
	matchesSupportEntry,
	type SupportHoursReportItem,
	type SupportReportEntry,
} from "./supportReportEntries";
import {
	getTasksWithoutReports,
	getTransferReports,
	type SupportTransferCallbacks,
	type SupportTransferDraft,
} from "./supportTransfer.model";
import type { SupportProjectWorkspace } from "./supportWorkspace.api";

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
type MoveSelection = {
	projectId: number;
	fromPurchaseId: number | null;
	reports: SupportHoursReportItem[];
	taskId?: string;
	title: string;
};
type DraftDialog = { draft: SupportTransferDraft; title: string };
type Props = SupportTransferCallbacks & {
	projectId: number;
	projectTitle: string;
	selectedPurchaseId: number | null;
	purchases: PackagePurchase[];
	allocatedReports: SupportHoursReportItem[];
	projectTasks: SupportProjectTask[];
	workspace?: SupportProjectWorkspace | null;
	workspaceLoading?: boolean;
	workspaceError?: string | null;
	onRetryWorkspace?: () => void;
	onSelectPackage?: (id: number | null) => void;
	onAddPackage: () => void;
	onAddReport?: (taskId?: string) => void;
	onEditReport?: (reportId: string) => void;
	onCardClosed?: () => Promise<void>;
};
export const SupportProjectWorklists = ({
	projectId,
	projectTitle,
	selectedPurchaseId,
	purchases,
	allocatedReports,
	projectTasks,
	workspace,
	workspaceLoading = false,
	workspaceError,
	onRetryWorkspace,
	onSelectPackage,
	onAddPackage,
	onAddReport,
	onEditReport,
	onCardClosed,
	onPreviewTransfer,
	onTransfer,
}: Props) => {
	const { openTask } = useBitrixSlider();
	const [source, setSource] = useState<{
		projectId: number;
		purchaseId: number | null;
	}>({ projectId, purchaseId: null });
	const sourcePurchaseId =
		source.projectId === projectId &&
		source.purchaseId !== selectedPurchaseId &&
		purchases.some((purchase) => purchase.id === source.purchaseId)
			? source.purchaseId
			: null;
	const [expanded, setExpanded] = useState<Set<string>>(new Set());
	const [selectedReport, setSelectedReport] = useState<{
		projectId: number;
		report: SupportHoursReportItem;
	} | null>(null);
	const [query, setQuery] = useState("");
	const [draftDialog, setDraftDialog] = useState<DraftDialog | null>(null);
	const [dropSide, setDropSide] = useState<"left" | "right" | null>(null);
	const dragSelection = useRef<MoveSelection | null>(null);
	const currentWorkspace =
		workspace?.projectId === projectId ? workspace : null;
	const isFresh = !!currentWorkspace && !workspaceLoading && !workspaceError;
	const tasks = currentWorkspace?.tasks ?? projectTasks;
	const leftReports =
		currentWorkspace && selectedPurchaseId !== null
			? getTransferReports(currentWorkspace, projectTitle, selectedPurchaseId)
			: allocatedReports;
	const rightReports = currentWorkspace
		? getTransferReports(currentWorkspace, projectTitle, sourcePurchaseId)
		: [];
	const emptyTasks = currentWorkspace
		? getTasksWithoutReports(currentWorkspace)
		: [];
	const selectedPackage = purchases.find(
		(purchase) => purchase.id === selectedPurchaseId,
	);
	const sourcePackage = purchases.find(
		(purchase) => purchase.id === sourcePurchaseId,
	);
	const packageLabel = (purchase: PackagePurchase) =>
		`№${purchase.id} · ${dateLabel(purchase.date)} · остаток ${hours(purchase.remaining)}`;
	const taskBinding = (
		task: SupportProjectTask & { purchaseId?: number | null },
	) => task.purchaseId ?? null;
	const entriesFor = (
		reports: SupportHoursReportItem[],
		purchaseId: number | null,
		includeEmpty: boolean,
	): SupportReportEntry[] =>
		[
			...collectSupportEntries(reports, tasks),
			...(includeEmpty
				? emptyTasks
						.filter((task) => taskBinding(task) === purchaseId)
						.map(
							(task): SupportReportEntry => ({
								...task,
								kind: "task",
								hours: 0,
								reports: [],
							}),
						)
				: []),
		].filter((entry) => matchesSupportEntry(entry, query, "all"));
	const openTaskCard = async (taskId: string) => {
		await openTask(taskId, EntityTypeIds.tasks);
		await onCardClosed?.();
	};
	const toggleTask = (key: string) =>
		setExpanded((current) => {
			const next = new Set(current);
			if (next.has(key)) next.delete(key);
			else next.add(key);
			return next;
		});
	const beginTransfer = (
		selection: MoveSelection,
		toPurchaseId: number | null,
	) => {
		if (
			!isFresh ||
			selection.projectId !== projectId ||
			selection.fromPurchaseId === toPurchaseId ||
			(!selection.taskId &&
				!selection.reports.some((report) => report.hours > 0))
		)
			return;
		setDraftDialog({
			title: selection.title,
			draft: {
				projectId,
				fromPurchaseId: selection.fromPurchaseId,
				toPurchaseId,
				items: selection.reports
					.filter((report) => report.hours > 0)
					.map((report) => ({
						reportId: report.id,
						hours: report.hours,
					})),
				...(selection.taskId ? { taskId: selection.taskId } : {}),
			},
		});
	};
	const dragStart = (event: DragEvent, selection: MoveSelection) => {
		if (
			!isFresh ||
			(!selection.taskId &&
				!selection.reports.some((report) => report.hours > 0))
		) {
			event.preventDefault();
			return;
		}
		dragSelection.current = selection;
		event.dataTransfer.effectAllowed = "move";
		event.dataTransfer.setData(
			"application/x-work-tracker-transfer",
			JSON.stringify({
				projectId,
				reportIds: selection.reports.map((report) => report.id),
				taskId: selection.taskId,
			}),
		);
	};
	const drop = (event: DragEvent, side: "left" | "right") => {
		event.preventDefault();
		const selection = dragSelection.current;
		dragSelection.current = null;
		setDropSide(null);
		if (!selection || (side === "left" && selectedPurchaseId === null)) return;
		beginTransfer(
			selection,
			side === "left" ? selectedPurchaseId : sourcePurchaseId,
		);
	};
	const endDrag = () => {
		dragSelection.current = null;
		setDropSide(null);
	};
	const transferButton = (selection: MoveSelection, side: "left" | "right") => (
		<button
			type="button"
			className={styles.transferButton}
			disabled={
				!isFresh ||
				selectedPurchaseId === null ||
				(!selection.taskId &&
					!selection.reports.some((report) => report.hours > 0))
			}
			onClick={() =>
				beginTransfer(
					selection,
					side === "right" ? selectedPurchaseId : sourcePurchaseId,
				)
			}
			aria-label={`Перенести ${selection.taskId ? "задачу" : "отчёт"}: ${selection.title} ${side === "right" ? "в выбранный пакет" : sourcePurchaseId === null ? "в нераспределённое" : `в пакет №${sourcePurchaseId}`}`}
			title={
				selectedPurchaseId === null
					? "Сначала выберите пакет слева"
					: "Перенести"
			}
		>
			{side === "right" ? (
				<FiArrowLeft aria-hidden="true" />
			) : (
				<FiArrowRight aria-hidden="true" />
			)}
		</button>
	);
	const reportRow = (
		report: SupportHoursReportItem,
		side: "left" | "right",
		fromPurchaseId: number | null,
	) => {
		const selection: MoveSelection = {
			projectId,
			fromPurchaseId,
			reports: [report],
			title: report.description || report.title || `Отчёт #${report.id}`,
		};
		return (
			<div
				key={report.id}
				className={styles.transferReportRow}
				draggable={isFresh && selectedPurchaseId !== null && report.hours > 0}
				onDragStart={(event) => {
					event.stopPropagation();
					dragStart(event, selection);
				}}
				onDragEnd={endDrag}
			>
				<span className={styles.dragHandle} title="Перетащить отчёт">
					<FiMove aria-hidden="true" />
				</span>
				<button
					className={styles.supportReportRow}
					type="button"
					onClick={() => setSelectedReport({ projectId, report })}
					aria-label={`Посмотреть отчёт: ${selection.title}`}
				>
					<FiFileText aria-hidden="true" />
					<span className={styles.supportReportSummary}>
						<strong>{selection.title}</strong>
						<small>
							<time dateTime={report.date}>{dateLabel(report.date)}</time>
							{report.responsibleName ? ` · ${report.responsibleName}` : ""}
						</small>
						<small>
							{report.includeInPackage === false && (
								<span className={styles.transferUnchecked}>
									Не учитывается в пакете
								</span>
							)}
							{report.totalHours != null && report.totalHours !== report.hours
								? `Всего по отчёту ${hours(report.totalHours)}`
								: ""}
						</small>
					</span>
					<b>{hours(report.hours)}</b>
				</button>
				{transferButton(selection, side)}
			</div>
		);
	};
	const renderEntries = (
		side: "left" | "right",
		reports: SupportHoursReportItem[],
		fromPurchaseId: number | null,
	) => {
		const entries = entriesFor(
			reports,
			fromPurchaseId,
			side === "right" || selectedPurchaseId !== null,
		);
		if (!entries.length)
			return (
				<p className={styles.transferEmpty}>
					{query.trim()
						? "По вашему запросу ничего не найдено."
						: side === "left"
							? "В этом пакете пока нет работ. Перенесите их из списка справа."
							: sourcePurchaseId === null
								? "Нет нераспределённых отчётов и задач."
								: "В этом пакете нет работ для переноса."}
				</p>
			);
		return entries.map((entry) => {
			if (entry.kind === "report")
				return reportRow(entry.report, side, fromPurchaseId);
			const key = `${side}-${entry.id}`;
			const isExpanded = expanded.has(key);
			const selection: MoveSelection = {
				projectId,
				fromPurchaseId,
				reports: entry.reports,
				taskId: entry.id,
				title: entry.title,
			};
			return (
				<div className={styles.transferTask} key={entry.id}>
					<div
						className={styles.transferTaskHeader}
						draggable={isFresh && selectedPurchaseId !== null}
						onDragStart={(event) => dragStart(event, selection)}
						onDragEnd={endDrag}
					>
						<span className={styles.dragHandle} title="Перетащить задачу">
							<FiMove aria-hidden="true" />
						</span>
						<button
							className={styles.taskToggle}
							type="button"
							onClick={() => toggleTask(key)}
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
								<small>
									{entry.reports.length
										? `Отчётов: ${entry.reports.length}`
										: "Отчётов пока нет"}
								</small>
							</span>
							{entry.reports.length > 0 && <b>{hours(entry.hours)}</b>}
						</button>
						{transferButton(selection, side)}
					</div>
					<div className={styles.transferTaskActions}>
						<button
							className={styles.inlineAction}
							type="button"
							onClick={() => void openTaskCard(entry.id)}
							aria-label={`Открыть задачу: ${entry.title}`}
						>
							<FiExternalLink aria-hidden="true" />
							Открыть
						</button>
						{onAddReport && (
							<button
								className={styles.inlineAction}
								type="button"
								onClick={() => onAddReport(entry.id)}
								aria-label={`Добавить отчёт по задаче: ${entry.title}`}
							>
								<FiPlus aria-hidden="true" />
								Добавить отчёт
							</button>
						)}
					</div>
					{isExpanded && (
						<div className={styles.transferNestedReports}>
							{entry.reports.map((report) =>
								reportRow(report, side, fromPurchaseId),
							)}
						</div>
					)}
				</div>
			);
		});
	};
	const renderColumn = (side: "left" | "right") => {
		const isLeft = side === "left";
		const reports = isLeft ? leftReports : rightReports;
		const packageId = isLeft ? selectedPurchaseId : sourcePurchaseId;
		// Keep the current snapshot mounted during refresh so scroll and expanded
		// rows survive. Transfers still require fresh data through isFresh.
		const canDisplay =
			!!currentWorkspace ||
			(isLeft && !currentWorkspace && !workspaceLoading && !workspaceError);
		return (
			<section
				className={`${styles.transferColumn} ${dropSide === side ? styles.transferColumnDrop : ""}`}
				aria-label={isLeft ? "Выбранный пакет" : "Источник работ"}
				onDragOver={(event) => {
					if (
						!dragSelection.current ||
						!isFresh ||
						selectedPurchaseId === null ||
						dragSelection.current.fromPurchaseId === packageId
					)
						return;
					event.preventDefault();
					event.dataTransfer.dropEffect = "move";
					setDropSide(side);
				}}
				onDragLeave={(event) => {
					if (!event.currentTarget.contains(event.relatedTarget as Node | null))
						setDropSide(null);
				}}
				onDrop={(event) => drop(event, side)}
			>
				<header className={styles.transferColumnHeader}>
					<label>
						<span>{isLeft ? "Выбранный пакет" : "Откуда переносить"}</span>
						<select
							aria-label={isLeft ? "Пакет для распределения" : "Источник работ"}
							value={packageId ?? "unallocated"}
							disabled={isLeft && !onSelectPackage}
							onChange={(event) => {
								const value =
									event.target.value === "unallocated"
										? null
										: Number(event.target.value);
								if (isLeft) onSelectPackage?.(value);
								else setSource({ projectId, purchaseId: value });
							}}
						>
							<option value="unallocated">
								{isLeft ? "Выберите пакет" : "Нераспределённое"}
							</option>
							{purchases
								.filter(
									(purchase) => isLeft || purchase.id !== selectedPurchaseId,
								)
								.map((purchase) => (
									<option key={purchase.id} value={purchase.id}>
										{packageLabel(purchase)}
									</option>
								))}
						</select>
					</label>
					{canDisplay && (
						<div className={styles.transferColumnCount} role="status">
							{workspaceLoading ? (
								"Обновляем данные…"
							) : (
								<>
									{reports.length} отчётов · <b>{hours(reportSum(reports))}</b>
								</>
							)}
						</div>
					)}
				</header>
				{isLeft && selectedPurchaseId === null && (
					<p className={styles.transferColumnHint}>
						Выберите пакет для переноса. Сейчас показаны списания всех пакетов.
					</p>
				)}
				{!isLeft && sourcePurchaseId === null && (
					<p className={styles.transferColumnHint}>
						Все отчёты вне пакетов, включая те, у которых выключен учёт, и
						задачи без отчётов.
					</p>
				)}
				{(isLeft ? selectedPackage : sourcePackage) && (
					<p className={styles.transferColumnHint}>
						Остаток пакета:{" "}
						{hours((isLeft ? selectedPackage : sourcePackage)?.remaining ?? 0)}
					</p>
				)}
				<div className={styles.transferList}>
					{canDisplay ? (
						renderEntries(side, reports, packageId)
					) : (
						<p
							className={styles.transferEmpty}
							role={workspaceError ? undefined : "status"}
						>
							{workspaceError
								? "Список временно недоступен."
								: workspaceLoading
									? "Загружаем работы проекта…"
									: "Загрузите данные проекта, чтобы увидеть работы."}
						</p>
					)}
				</div>
			</section>
		);
	};
	return (
		<section className={styles.transferWorkspace}>
			<div className={styles.transferWorkspaceHeading}>
				<div>
					<h2>Распределение работ по пакетам</h2>
					<p>
						Перетащите задачу или отчёт между списками либо нажмите стрелку.
						Перед сохранением покажем результат переноса.
					</p>
				</div>
				{purchases.length === 0 && (
					<button
						className={styles.packageReportButton}
						type="button"
						onClick={onAddPackage}
					>
						<FiPlus aria-hidden="true" />
						Добавить пакет
					</button>
				)}
			</div>
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
			{workspaceError && (
				<div className={styles.workspaceError} role="alert">
					<span>
						{workspaceError}
						{currentWorkspace &&
							" Показаны последние загруженные данные. Переносы будут доступны после обновления."}
					</span>
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
			<div className={styles.transferColumns}>
				{renderColumn("left")}
				{renderColumn("right")}
			</div>
			<SupportHoursReportDrawer
				report={
					selectedReport?.projectId === projectId ? selectedReport.report : null
				}
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
			{draftDialog?.draft.projectId === projectId && (
				<SupportTransferDialog
					key={JSON.stringify(draftDialog.draft)}
					draft={draftDialog.draft}
					title={draftDialog.title}
					onClose={() => setDraftDialog(null)}
					onPreviewTransfer={onPreviewTransfer}
					onTransfer={onTransfer}
				/>
			)}
		</section>
	);
};
