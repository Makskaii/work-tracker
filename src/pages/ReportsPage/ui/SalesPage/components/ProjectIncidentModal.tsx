import Modal from "@/components/modal/Modal";
import { ProjectCodes } from "@/components/calendar/constants/const";
import { type ProjectIncident } from "../model/api";
import { formatDateFull } from "../model/ganttUtils";
import styles from "./ProjectIncidentModal.module.scss";

type NormalizedFile = {
	name: string;
	url: string | null;
	isImage: boolean;
};

const formatIncidentDate = (value: unknown) => {
	const date = new Date(String(value));

	if (Number.isNaN(date.getTime())) {
		return String(value);
	}

	return formatDateFull(date);
};

const formatIncidentDates = (value: unknown) => {
	if (!value) {
		return "—";
	}

	const dates = Array.isArray(value) ? value : [value];
	const formattedDates = dates.filter(Boolean).map(formatIncidentDate);

	return formattedDates.length ? formattedDates.join(" — ") : "—";
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

const getStringField = (value: Record<string, unknown>, keys: string[]) => {
	for (const key of keys) {
		const field = value[key];

		if (typeof field === "string" && field.trim()) {
			return field;
		}
	}

	return null;
};

const normalizeIncidentFiles = (value: unknown) => {
	if (!value) {
		return {
			files: [] as NormalizedFile[],
			hasUnrecognizedFile: false,
		};
	}

	const values = Array.isArray(value) ? value : [value];
	const files: NormalizedFile[] = [];
	let hasUnrecognizedFile = false;

	values.filter(Boolean).forEach((item, index) => {
		if (typeof item === "string") {
			files.push({
				name: `Файл ${index + 1}`,
				url: item,
				isImage: /\.(png|jpe?g|gif|webp|svg)$/i.test(item),
			});
			return;
		}

		if (!isRecord(item)) {
			hasUnrecognizedFile = true;
			return;
		}

		const url = getStringField(item, [
			"url",
			"downloadUrl",
			"showUrl",
			"src",
			"link",
		]);
		const name =
			getStringField(item, ["name", "fileName", "title", "originalName"]) ??
			`Файл ${index + 1}`;
		const type = getStringField(item, ["type", "mimeType", "contentType"]) ?? "";
		const isImage =
			type.startsWith("image/") ||
			(url ? /\.(png|jpe?g|gif|webp|svg)$/i.test(url) : false);

		if (url) {
			files.push({ name, url, isImage });
			return;
		}

		hasUnrecognizedFile = true;
	});

	return {
		files,
		hasUnrecognizedFile,
	};
};

const getTextValue = (incident: ProjectIncident, code: string) => {
	const value = incident[code];

	if (!value) {
		return "—";
	}

	if (Array.isArray(value)) {
		const textValues = value.filter(
			(item) => typeof item === "string" || typeof item === "number",
		);

		return textValues.length ? textValues.join(", ") : "—";
	}

	if (isRecord(value)) {
		return "—";
	}

	return String(value);
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
	onIncidentOpen: (incidentId: string) => void;
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
					{incidents.map((incident) => {
						const incidentFiles = normalizeIncidentFiles(
							incident[ProjectCodes.info],
						);

						return (
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
										<p>
											{getTextValue(incident, ProjectCodes.comment)}
										</p>
									</div>
									<div>
										<span>Информация по инциденту / файл</span>
										{incidentFiles.files.length ? (
											<div className={styles.filesList}>
												{incidentFiles.files.map((file) => (
													<a
														key={`${file.name}-${file.url}`}
														href={file.url ?? undefined}
														target="_blank"
														rel="noreferrer"
														className={styles.fileLink}
													>
														{file.isImage && file.url ? (
															<img src={file.url} alt={file.name} />
														) : null}
														<span>Открыть файл</span>
														<small>{file.name}</small>
													</a>
												))}
											</div>
										) : (
											<p>
												{incidentFiles.hasUnrecognizedFile
													? "Файл прикреплён, но формат не распознан"
													: "Файл не прикреплён"}
											</p>
										)}
									</div>
									<div>
										<span>Даты инцидента</span>
										<p>
											{formatIncidentDates(
												incident[ProjectCodes.incidentDates],
											)}
										</p>
									</div>
								</div>
							</article>
						);
					})}
				</div>
			) : (
				<div className={styles.empty}>
					Инциденты по этой просрочке не найдены
				</div>
			)}
		</div>
	</Modal>
);
