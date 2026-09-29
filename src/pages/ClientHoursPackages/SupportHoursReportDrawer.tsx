import {
	FiActivity,
	FiBriefcase,
	FiCalendar,
	FiClock,
	FiExternalLink,
	FiFileText,
	FiFolder,
	FiUser,
} from "react-icons/fi";
import Modal from "@/components/modal/Modal";
import { EntityTypeIds } from "@/shared/constants/const";
import { useBitrixSlider } from "@/shared/hooks/useBitrixSlider";
import styles from "./ClientHoursPackagesPage.module.scss";
import type { SupportHoursReportItem } from "./supportReportEntries";

type SupportHoursReportDrawerProps = {
	report: SupportHoursReportItem | null;
	onClose: () => void;
	embedded?: boolean;
	onCardClosed?: () => Promise<void>;
	onEdit?: (reportId: string) => void;
};

const formatHours = (value: number) =>
	`${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(value)} ч`;
const formatDate = (value: string) =>
	new Intl.DateTimeFormat("ru-RU", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	}).format(new Date(value));

export const SupportHoursReportDrawer = ({
	report,
	onClose,
	embedded = false,
	onCardClosed,
	onEdit,
}: SupportHoursReportDrawerProps) => {
	const { openTask } = useBitrixSlider();
	const content = report ? (
		<article className={`${styles.reportDrawer} ${styles.reportDrawerPanel}`}>
			<header>
				<span className={styles.eyebrow}>Детали отчёта</span>
				<div className={styles.reportDrawerTitleLine}>
					<h2>{report.title || "Отчёт по техподдержке"}</h2>
					<span className={styles.reportDrawerStatus}>Списано</span>
				</div>
			</header>
			<dl className={styles.reportDrawerFacts}>
				<div>
					<dt>
						<FiCalendar aria-hidden="true" />
						Дата
					</dt>
					<dd>{formatDate(report.date)}</dd>
				</div>
				<div>
					<dt>
						<FiUser aria-hidden="true" />
						Ответственный
					</dt>
					<dd>{report.responsibleName || "Не указан"}</dd>
				</div>
				<div>
					<dt>
						<FiClock aria-hidden="true" />
						Списано часов
					</dt>
					<dd className={styles.reportDrawerHoursValue}>
						{formatHours(report.hours)}
					</dd>
				</div>
				<div>
					<dt>
						<FiBriefcase aria-hidden="true" />
						Компания
					</dt>
					<dd>{report.companyName || "Не указана"}</dd>
				</div>
				<div>
					<dt>
						<FiFolder aria-hidden="true" />
						Проект
					</dt>
					<dd>{report.projectTitle || "Не указан"}</dd>
				</div>
				<div>
					<dt>
						<FiActivity aria-hidden="true" />
						Активность
					</dt>
					<dd>{report.activityTitle || "Не указана"}</dd>
				</div>
				{report.taskId ? (
					<div>
						<dt>
							<FiFileText aria-hidden="true" />
							Задача
						</dt>
						<dd>
							<button
								className={styles.linkedTaskButton}
								type="button"
								onClick={async () => {
									if (report.taskId) {
										await openTask(report.taskId, EntityTypeIds.tasks);
										await onCardClosed?.();
									}
								}}
								aria-label={`Открыть связанную задачу: ${report.taskTitle || `#${report.taskId}`}`}
							>
								{report.taskTitle || `Задача #${report.taskId}`}{" "}
								<FiExternalLink aria-hidden="true" />
							</button>
						</dd>
					</div>
				) : null}
			</dl>
			<section className={styles.reportDrawerSection}>
				<h3>Пакеты списания</h3>
				{report.allocations.map((allocation) => (
					<div className={styles.reportAllocation} key={allocation.purchaseId}>
						<span>Пакет от {formatDate(allocation.purchaseDate)}</span>
						<b>{formatHours(allocation.hours)}</b>
					</div>
				))}
			</section>
			<section className={styles.reportDrawerSection}>
				<h3>Описание отчёта</h3>
				<p className={styles.reportDrawerDescription}>
					{report.description || "Описание не указано"}
				</p>
			</section>
			{onEdit && (
				<button
					className={styles.packageReportButton}
					type="button"
					onClick={() => onEdit(report.id)}
				>
					Изменить отчёт
				</button>
			)}
			<button
				className={styles.openBitrixButton}
				type="button"
				onClick={async () => {
					await openTask(report.id, EntityTypeIds.reports);
					await onCardClosed?.();
				}}
			>
				<FiExternalLink aria-hidden="true" /> Открыть отчёт в Битрикс
			</button>
		</article>
	) : (
		<article
			className={`${styles.reportDrawer} ${styles.reportDrawerPanel} ${styles.reportDrawerEmpty}`}
		>
			<span className={styles.eyebrow}>Детали отчёта</span>
			<p>Выберите отчёт в списке, чтобы посмотреть его данные.</p>
		</article>
	);

	if (embedded) return content;

	return (
		<Modal
			isOpen={Boolean(report)}
			onClose={onClose}
			position="right"
			size="full"
			innerScroll
		>
			{content}
		</Modal>
	);
};
