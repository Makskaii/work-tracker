import {
	FiArchive,
	FiCalendar,
	FiClock,
	FiEdit3,
	FiFileText,
	FiPlus,
} from "react-icons/fi";
import styles from "./ClientHoursPackagesPage.module.scss";
import { type SupportProjectTask } from "./clientHoursPackages.api";
import type {
	ClientPackage,
	PackagePurchase,
	SupportProjectOption,
} from "./clientHoursPackages.types";
import { SupportPackageReportPanel } from "./SupportPackageReportPanel";
import { collectSupportReports } from "./supportReportEntries";
import type { SupportProjectWorkspace } from "./supportWorkspace.api";
import { SupportProjectWorklists } from "./SupportProjectWorklists";
import { SupportPackageBalances } from "./SupportPackageBalances";
import type { SupportTransferCallbacks } from "./supportTransfer.model";

type SupportProjectDetailsProps = SupportTransferCallbacks & {
	project: SupportProjectOption | null;
	projectPackages: ClientPackage | null;
	projectTasks: SupportProjectTask[];
	workspace?: SupportProjectWorkspace | null;
	workspaceLoading?: boolean;
	workspaceError?: string | null;
	onRetryWorkspace?: () => void;
	onSelectPackage?: (id: number | null) => void;
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

export const SupportProjectDetails = ({
	project,
	projectPackages,
	projectTasks,
	workspace,
	workspaceLoading,
	workspaceError,
	onRetryWorkspace,
	onSelectPackage,
	selectedPurchaseId,
	onAddPackage,
	onAddReport,
	onEditReport,
	onCardClosed,
	refreshKey,
	onEditPackage,
	onPreviewTransfer,
	onTransfer,
}: SupportProjectDetailsProps) => {
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

			{onSelectPackage && (
				<SupportPackageBalances
					purchases={purchases}
					selectedPurchaseId={effectivePurchaseId}
					onSelectPackage={onSelectPackage}
					onEditPackage={onEditPackage}
				/>
			)}
			<SupportPackageReportPanel
				packageId={reportPurchase?.id ?? null}
				hasPackages={purchases.length > 0}
				refreshKey={refreshKey}
				onCardClosed={onCardClosed}
			/>
			<SupportProjectWorklists
				projectId={project.id}
				projectTitle={project.title}
				selectedPurchaseId={effectivePurchaseId}
				purchases={purchases}
				onSelectPackage={onSelectPackage}
				onPreviewTransfer={onPreviewTransfer}
				onTransfer={onTransfer}
				allocatedReports={reports}
				projectTasks={projectTasks}
				workspace={workspace}
				workspaceLoading={workspaceLoading}
				workspaceError={workspaceError}
				onRetryWorkspace={onRetryWorkspace}
				onAddPackage={onAddPackage}
				onAddReport={onAddReport}
				onEditReport={onEditReport}
				onCardClosed={onCardClosed}
			/>
		</main>
	);
};
