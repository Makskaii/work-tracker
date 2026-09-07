import { FaExternalLinkAlt, FaFileAlt } from "react-icons/fa";
import Modal from "@/components/modal/Modal";
import { EntityTypeIds } from "@/shared/constants/const";
import { useBitrixSlider } from "@/shared/hooks/useBitrixSlider";
import styles from "./ClientHoursPackagesPage.module.scss";
import type { SupportHoursReportItem } from "./SupportProjectDetails";

type SupportHoursReportDrawerProps = {
	report: SupportHoursReportItem | null;
	onClose: () => void;
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
}: SupportHoursReportDrawerProps) => {
	const { openTask } = useBitrixSlider();

	return (
		<Modal
			isOpen={Boolean(report)}
			onClose={onClose}
			position="right"
			size="full"
			innerScroll
		>
			{report ? (
				<article className={styles.reportDrawer}>
					<header>
						<span className={styles.eyebrow}>Списание часов</span>
						<h2>{report.title || "Отчёт по техподдержке"}</h2>
						<p>{formatDate(report.date)}</p>
					</header>
					<div className={styles.reportDrawerHours}>
						<FaFileAlt aria-hidden="true" />
						<div>
							<span>Списано</span>
							<strong>{formatHours(report.hours)}</strong>
						</div>
					</div>
					<dl className={styles.reportDrawerFacts}>
						<div><dt>Задача</dt><dd>{report.taskTitle || (report.taskId ? `Задача #${report.taskId}` : "Не указана")}</dd></div>
						<div><dt>Ответственный</dt><dd>{report.responsibleName || "Не указан"}</dd></div>
						<div><dt>Дата отчёта</dt><dd>{formatDate(report.date)}</dd></div>
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
					<button
						className={styles.openBitrixButton}
						type="button"
						onClick={() => openTask(report.id, EntityTypeIds.reports)}
					>
						<FaExternalLinkAlt aria-hidden="true" /> Открыть в Битрикс
					</button>
				</article>
			) : null}
		</Modal>
	);
};
