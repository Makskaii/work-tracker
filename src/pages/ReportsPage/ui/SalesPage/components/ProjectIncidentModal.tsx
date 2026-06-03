import Modal from "@/components/modal/Modal";
import {
	ProjectIncidentCodes,
	type ProjectIncident,
} from "../model/api";
import styles from "./ProjectIncidentModal.module.scss";

const getIncidentValue = (incident: ProjectIncident, code: string) => {
	const value = incident[code];

	if (Array.isArray(value)) {
		return value.filter(Boolean).map(String).join(", ");
	}

	return value ? String(value) : "—";
};

export const ProjectIncidentModal = ({
	incidents,
	isLoading,
	isOpen,
	onClose,
	onIncidentOpen,
}: {
	incidents: ProjectIncident[];
	isLoading: boolean;
	isOpen: boolean;
	onClose: () => void;
	onIncidentOpen: (incidentId: string | number) => void;
}) => (
	<Modal isOpen={isOpen} onClose={onClose} size="small" innerScroll>
		<div className={styles.modal}>
			<div className={styles.header}>
				<span>Gantt incident</span>
				<h3>Информация о просрочке / инциденте</h3>
			</div>

			{isLoading ? (
				<div className={styles.empty}>Загружаем инциденты...</div>
			) : incidents.length ? (
				<div className={styles.list}>
					{incidents.map((incident) => (
						<article key={incident.id} className={styles.card}>
							<div className={styles.cardHeader}>
								<div>
									<span>Инцидент #{incident.id}</span>
									<strong>{incident.title ?? "Без названия"}</strong>
								</div>
								<button
									type="button"
									className={styles.openButton}
									onClick={() => onIncidentOpen(incident.id)}
								>
									Открыть в Bitrix
								</button>
							</div>

							<div className={styles.fields}>
								<div>
									<span>Комментарий</span>
									<p>{getIncidentValue(incident, ProjectIncidentCodes.comment)}</p>
								</div>
								<div>
									<span>Информация по инциденту</span>
									<p>{getIncidentValue(incident, ProjectIncidentCodes.info)}</p>
								</div>
								<div>
									<span>Даты инцидента</span>
									<p>
										{getIncidentValue(
											incident,
											ProjectIncidentCodes.incidentDates,
										)}
									</p>
								</div>
							</div>
						</article>
					))}
				</div>
			) : (
				<div className={styles.empty}>
					Инциденты по этой просрочке не найдены
				</div>
			)}
		</div>
	</Modal>
);
