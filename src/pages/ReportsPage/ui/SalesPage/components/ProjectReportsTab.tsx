import { useEffect, useState } from "react";
import Modal from "@/components/modal/Modal";
import projectReportsStyles from "../../ProjectReports/ProjectsReports.module.scss";
import type {
	ProjectReportEntry,
	ProjectReportEntryFile,
	ReportProject,
	UpdateProjectReportEntryPayload,
} from "../model/types";
import {
	formatFileSize,
	formatProjectReportDate,
} from "../model/reportProjectFormat";
import styles from "../SalesProfitabilityReport.module.scss";

export const ProjectReportsTab = ({
	authorName,
	error,
	fileDrafts,
	isLoading,
	isModalOpen,
	isSaving,
	nextReportDate,
	onAuthorNameChange,
	onCloseModal,
	onCreate,
	onFileDelete,
	onFileDownload,
	onFilesChange,
	onNextReportDateChange,
	onOpenModal,
	onTextChange,
	onUpdate,
	project,
	reports,
	text,
}: {
	authorName: string;
	error: string | null;
	fileDrafts: File[];
	isLoading: boolean;
	isModalOpen: boolean;
	isSaving: boolean;
	nextReportDate: string;
	onAuthorNameChange: (value: string) => void;
	onCloseModal: () => void;
	onCreate: () => void;
	onFileDelete: (
		reportEntry: ProjectReportEntry,
		file: ProjectReportEntryFile,
	) => void;
	onFileDownload: (
		reportEntry: ProjectReportEntry,
		file: ProjectReportEntryFile,
	) => void;
	onFilesChange: (files: File[]) => void;
	onNextReportDateChange: (value: string) => void;
	onOpenModal: () => void;
	onTextChange: (value: string) => void;
	onUpdate: (
		reportEntry: ProjectReportEntry,
		payload: UpdateProjectReportEntryPayload,
	) => Promise<void>;
	project: ReportProject | null;
	reports: ProjectReportEntry[];
	text: string;
}) => {
	const [selectedReportEntryId, setSelectedReportEntryId] = useState<
		number | null
	>(null);
	const selectedReportEntry =
		reports.find((reportEntry) => reportEntry.id === selectedReportEntryId) ??
		null;

	if (!project) {
		return (
			<div className={styles.projectReportEmptyState}>
				Выберите проект, чтобы посмотреть и добавить отчёты.
			</div>
		);
	}

	return (
		<section className={styles.projectReportsPanel}>
			<div className={styles.projectReportsHeader}>
				<div>
					<h3>Отчёты по проекту</h3>
					<span>{project.title}</span>
				</div>
				<button
					type="button"
					className={styles.projectReportCreateButton}
					onClick={onOpenModal}
				>
					Создать отчёт
				</button>
			</div>

			<ProjectReportCreateModal
				authorName={authorName}
				error={error}
				fileDrafts={fileDrafts}
				isOpen={isModalOpen}
				isSaving={isSaving}
				nextReportDate={nextReportDate}
				onAuthorNameChange={onAuthorNameChange}
				onClose={onCloseModal}
				onCreate={onCreate}
				onFilesChange={onFilesChange}
				onNextReportDateChange={onNextReportDateChange}
				onTextChange={onTextChange}
				text={text}
			/>

			<div className={styles.projectReportList}>
				{isLoading ? (
					<div className={styles.projectReportEmptyState}>
						Загружаем отчёты...
					</div>
				) : null}
				{!isLoading && !reports.length ? (
					<div className={styles.projectReportEmptyState}>
						Отчётов по проекту пока нет.
					</div>
				) : null}
				{reports.length ? (
					<div className={styles.projectReportTableWrap}>
						<div className={styles.projectReportTable}>
							<div className={styles.projectReportTableHead}>
								<span>Автор</span>
								<span>Дата отчёта</span>
								<span>Следующий отчёт</span>
								<span>Текст</span>
								<span>Файлы</span>
							</div>
							{reports.map((reportEntry) => (
								<button
									key={reportEntry.id}
									type="button"
									className={styles.projectReportTableRow}
									onClick={() => setSelectedReportEntryId(reportEntry.id)}
								>
									<span className={styles.projectReportAuthor}>
										{reportEntry.authorName}
									</span>
									<span className={styles.projectReportDate}>
										{formatProjectReportDate(reportEntry.reportDate)}
									</span>
									<span className={styles.projectReportDate}>
										{formatProjectReportDate(reportEntry.nextReportDate)}
									</span>
									<span className={styles.projectReportTextPreview}>
										{reportEntry.text}
									</span>
									<span className={styles.projectReportFilesCount}>
										{reportEntry.files.length
											? `${reportEntry.files.length} файл.`
											: "Нет файлов"}
									</span>
								</button>
							))}
						</div>
					</div>
				) : null}
			</div>
			<ProjectReportViewModal
				reportEntry={selectedReportEntry}
				onClose={() => setSelectedReportEntryId(null)}
				onFileDelete={onFileDelete}
				onFileDownload={onFileDownload}
				onUpdate={onUpdate}
			/>
		</section>
	);
};

const ProjectReportViewModal = ({
	onClose,
	onFileDelete,
	onFileDownload,
	onUpdate,
	reportEntry,
}: {
	onClose: () => void;
	onFileDelete: (
		reportEntry: ProjectReportEntry,
		file: ProjectReportEntryFile,
	) => void;
	onFileDownload: (
		reportEntry: ProjectReportEntry,
		file: ProjectReportEntryFile,
	) => void;
	onUpdate: (
		reportEntry: ProjectReportEntry,
		payload: UpdateProjectReportEntryPayload,
	) => Promise<void>;
	reportEntry: ProjectReportEntry | null;
}) => {
	const [isEditing, setIsEditing] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [draft, setDraft] = useState({
		authorName: "",
		nextReportDate: "",
		text: "",
	});

	useEffect(() => {
		if (!reportEntry) {
			return;
		}

		setDraft({
			authorName: reportEntry.authorName,
			nextReportDate: reportEntry.nextReportDate ?? "",
			text: reportEntry.text,
		});
		setError(null);
		setIsEditing(false);
	}, [reportEntry]);

	const handleSubmit = async () => {
		if (!reportEntry) {
			return;
		}

		const authorName = draft.authorName.trim();
		const text = draft.text.trim();

		if (!authorName || !text) {
			setError("Заполните автора и текст отчёта");
			return;
		}

		setIsSaving(true);
		setError(null);

		try {
			await onUpdate(reportEntry, {
				authorName,
				nextReportDate: draft.nextReportDate || null,
				text,
			});
			setIsEditing(false);
		} catch {
			setError("Не удалось сохранить отчёт");
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<Modal isOpen={Boolean(reportEntry)} onClose={onClose} size="covered">
			{reportEntry ? (
				<div className={`${styles.ganttFormModal} ${styles.projectReportModal}`}>
					<div className={styles.projectReportViewHeader}>
						<h3>Отчёт по проекту</h3>
						<button
							type="button"
							disabled={isSaving}
							onClick={() => setIsEditing((prev) => !prev)}
						>
							{isEditing ? "Отменить" : "Редактировать"}
						</button>
					</div>
					{isEditing ? (
						<div className={styles.projectReportEditForm}>
							<label>
								<span>Автор</span>
								<input
									type="text"
									value={draft.authorName}
									onChange={(event) =>
										setDraft((prev) => ({
											...prev,
											authorName: event.target.value,
										}))
									}
								/>
							</label>
							<label>
								<span>Дата следующего отчёта</span>
								<input
									type="date"
									value={draft.nextReportDate}
									onClick={(event) => event.currentTarget.showPicker?.()}
									onChange={(event) =>
										setDraft((prev) => ({
											...prev,
											nextReportDate: event.target.value,
										}))
									}
								/>
							</label>
							<label>
								<span>Текст отчёта</span>
								<textarea
									value={draft.text}
									onChange={(event) =>
										setDraft((prev) => ({
											...prev,
											text: event.target.value,
										}))
									}
								/>
							</label>
							{error ? <p className={styles.ganttFormError}>{error}</p> : null}
							<div className={styles.ganttFormActions}>
								<button
									type="button"
									disabled={isSaving}
									onClick={() => setIsEditing(false)}
								>
									Отмена
								</button>
								<button type="button" disabled={isSaving} onClick={handleSubmit}>
									{isSaving ? "Сохранение..." : "Сохранить"}
								</button>
							</div>
						</div>
					) : (
						<>
							<div className={styles.projectReportDetails}>
								<div>
									<span>Автор</span>
									<strong>{reportEntry.authorName}</strong>
								</div>
								<div>
									<span>Дата отчёта</span>
									<strong>
										{formatProjectReportDate(reportEntry.reportDate)}
									</strong>
								</div>
								<div>
									<span>Следующий отчёт</span>
									<strong>
										{formatProjectReportDate(reportEntry.nextReportDate)}
									</strong>
								</div>
							</div>
							<div className={styles.projectReportFullText}>
								<span>Текст отчёта</span>
								<p>{reportEntry.text}</p>
							</div>
						</>
					)}
					<div className={styles.projectReportFiles}>
						<strong>Файлы</strong>
						{reportEntry.files.length ? (
							reportEntry.files.map((file) => (
								<div key={file.id} className={styles.projectReportFileItem}>
									<span>
										{file.originalName}
										<small>{formatFileSize(file.size)}</small>
									</span>
									<div className={styles.projectReportFileActions}>
										<button
											type="button"
											onClick={() => onFileDownload(reportEntry, file)}
										>
											Скачать
										</button>
										<button
											type="button"
											onClick={() => onFileDelete(reportEntry, file)}
										>
											Удалить
										</button>
									</div>
								</div>
							))
						) : (
							<small>Файлы не прикреплены</small>
						)}
					</div>
				</div>
			) : null}
		</Modal>
	);
};

const ProjectReportCreateModal = ({
	authorName,
	error,
	fileDrafts,
	isOpen,
	isSaving,
	nextReportDate,
	onAuthorNameChange,
	onClose,
	onCreate,
	onFilesChange,
	onNextReportDateChange,
	onTextChange,
	text,
}: {
	authorName: string;
	error: string | null;
	fileDrafts: File[];
	isOpen: boolean;
	isSaving: boolean;
	nextReportDate: string;
	onAuthorNameChange: (value: string) => void;
	onClose: () => void;
	onCreate: () => void;
	onFilesChange: (files: File[]) => void;
	onNextReportDateChange: (value: string) => void;
	onTextChange: (value: string) => void;
	text: string;
}) => (
	<Modal isOpen={isOpen} onClose={onClose} size="small">
		<div className={`${styles.ganttFormModal} ${styles.projectReportModal}`}>
			<h3>Создать отчёт по проекту</h3>
			<div className={styles.projectReportComposer}>
				<label>
					<span>Автор отчёта</span>
					<input
						type="text"
						value={authorName}
						onChange={(event) => onAuthorNameChange(event.target.value)}
					/>
				</label>
				<label>
					<span>Текст отчёта</span>
					<textarea
						className={styles.projectReportTextarea}
						value={text}
						onChange={(event) => onTextChange(event.target.value)}
					/>
				</label>
				<div className={styles.projectReportMetaRow}>
					<label>
						<span>Дата следующего отчёта</span>
						<input
							type="date"
							value={nextReportDate}
							onClick={(event) => event.currentTarget.showPicker?.()}
							onChange={(event) =>
								onNextReportDateChange(event.target.value)
							}
						/>
					</label>
					<div className={styles.projectReportFilePicker}>
						<span>Файлы</span>
						<label className={projectReportsStyles.projectFileField}>
							<input
								type="file"
								multiple
								className={projectReportsStyles.projectFileInput}
								onChange={(event) =>
									onFilesChange(Array.from(event.target.files ?? []))
								}
							/>
							<strong className={projectReportsStyles.projectFileButton}>
								Выбрать файлы
							</strong>
							<em className={projectReportsStyles.projectFileName}>
								{fileDrafts.length
									? `Выбрано файлов: ${fileDrafts.length}`
									: "Файлы не выбраны"}
							</em>
						</label>
					</div>
				</div>
				{error ? <p className={styles.ganttFormError}>{error}</p> : null}
				<div className={styles.ganttFormActions}>
					<button type="button" disabled={isSaving} onClick={onClose}>
						Отмена
					</button>
					<button type="button" disabled={isSaving} onClick={onCreate}>
						{isSaving ? "Создание..." : "Создать отчёт"}
					</button>
				</div>
			</div>
		</div>
	</Modal>
);
