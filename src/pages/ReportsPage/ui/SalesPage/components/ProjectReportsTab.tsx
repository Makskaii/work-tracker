import { useEffect, useState } from "react";
import Modal from "@/components/modal/Modal";
import type { User } from "@/shared/types/types";
import projectReportsStyles from "../../ProjectReports/ProjectsReports.module.scss";
import {
	formatFileSize,
	formatProjectReportDate,
} from "../model/reportProjectFormat";
import type {
	ProjectReportEntry,
	ProjectReportEntryFile,
	ReportProject,
	UpdateProjectReportEntryPayload,
} from "../model/types";
import styles from "../SalesProfitabilityReport.module.scss";
import { getUserAutocompleteOptions } from "./ReportProjectFileInput";

export const ProjectReportsTab = ({
	authorName,
	error,
	fileDrafts,
	isLoading,
	isModalOpen,
	isSaving,
	nextReportDate,
	onAuthorChange,
	onCloseModal,
	onCreate,
	onDelete,
	onFileDelete,
	onFileDownload,
	onFileUpload,
	onFilesChange,
	onNextReportDateChange,
	onOpenModal,
	onRefreshReports,
	onTextChange,
	onUpdate,
	project,
	reports,
	text,
	users,
}: {
	authorName: string;
	error: string | null;
	fileDrafts: File[];
	isLoading: boolean;
	isModalOpen: boolean;
	isSaving: boolean;
	nextReportDate: string;
	onAuthorChange: (authorName: string, authorId: string | null) => void;
	onCloseModal: () => void;
	onCreate: () => void;
	onDelete: (reportEntry: ProjectReportEntry) => Promise<void>;
	onFileDelete: (
		reportEntry: ProjectReportEntry,
		file: ProjectReportEntryFile,
	) => void;
	onFileDownload: (
		reportEntry: ProjectReportEntry,
		file: ProjectReportEntryFile,
	) => void;
	onFileUpload: (
		reportEntry: ProjectReportEntry,
		files: File[],
	) => Promise<void>;
	onFilesChange: (files: File[]) => void;
	onNextReportDateChange: (value: string) => void;
	onOpenModal: () => void;
	onRefreshReports: () => Promise<void>;
	onTextChange: (value: string) => void;
	onUpdate: (
		reportEntry: ProjectReportEntry,
		payload: UpdateProjectReportEntryPayload,
	) => Promise<void>;
	project: ReportProject | null;
	reports: ProjectReportEntry[];
	text: string;
	users: User[];
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
				onAuthorChange={onAuthorChange}
				onClose={onCloseModal}
				onCreate={onCreate}
				onFilesChange={onFilesChange}
				onNextReportDateChange={onNextReportDateChange}
				onTextChange={onTextChange}
				text={text}
				users={users}
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
									onClick={() => {
										void (async () => {
											await onRefreshReports();
											setSelectedReportEntryId(reportEntry.id);
										})();
									}}
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
				onDelete={async (reportEntry) => {
					await onDelete(reportEntry);
					setSelectedReportEntryId(null);
				}}
				onFileDelete={onFileDelete}
				onFileDownload={onFileDownload}
				onFileUpload={onFileUpload}
				onUpdate={onUpdate}
				users={users}
			/>
		</section>
	);
};

const ProjectReportViewModal = ({
	onClose,
	onDelete,
	onFileDelete,
	onFileDownload,
	onFileUpload,
	onUpdate,
	reportEntry,
	users,
}: {
	onClose: () => void;
	onDelete: (reportEntry: ProjectReportEntry) => Promise<void>;
	onFileDelete: (
		reportEntry: ProjectReportEntry,
		file: ProjectReportEntryFile,
	) => void;
	onFileDownload: (
		reportEntry: ProjectReportEntry,
		file: ProjectReportEntryFile,
	) => void;
	onFileUpload: (
		reportEntry: ProjectReportEntry,
		files: File[],
	) => Promise<void>;
	onUpdate: (
		reportEntry: ProjectReportEntry,
		payload: UpdateProjectReportEntryPayload,
	) => Promise<void>;
	reportEntry: ProjectReportEntry | null;
	users: User[];
}) => {
	const [isEditing, setIsEditing] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [isFileUploading, setIsFileUploading] = useState(false);
	const [deleteConfirmationId, setDeleteConfirmationId] = useState<
		number | null
	>(null);
	const [error, setError] = useState<string | null>(null);
	const [draft, setDraft] = useState({
		authorId: null as string | null,
		authorName: "",
		nextReportDate: "",
		text: "",
	});

	useEffect(() => {
		if (!reportEntry) {
			return;
		}

		setDraft({
			authorId: reportEntry.authorId,
			authorName: reportEntry.authorName,
			nextReportDate: reportEntry.nextReportDate ?? "",
			text: reportEntry.text,
		});
		setError(null);
		setIsEditing(false);
		setDeleteConfirmationId(null);
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
				authorId: draft.authorId,
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

	const handleDelete = async () => {
		if (!reportEntry) {
			return;
		}

		if (deleteConfirmationId !== reportEntry.id) {
			setDeleteConfirmationId(reportEntry.id);
			return;
		}

		setIsDeleting(true);
		setError(null);

		try {
			await onDelete(reportEntry);
			setDeleteConfirmationId(null);
		} catch {
			setError("Не удалось удалить отчёт");
		} finally {
			setIsDeleting(false);
		}
	};

	const handleFilesChange = async (files: File[]) => {
		if (!reportEntry || !files.length) {
			return;
		}

		setIsFileUploading(true);
		setError(null);

		try {
			await onFileUpload(reportEntry, files);
		} catch {
			setError("Не удалось загрузить файлы");
		} finally {
			setIsFileUploading(false);
		}
	};

	const handleEditCancel = () => {
		if (!reportEntry) {
			return;
		}

		setDraft({
			authorId: reportEntry.authorId,
			authorName: reportEntry.authorName,
			nextReportDate: reportEntry.nextReportDate ?? "",
			text: reportEntry.text,
		});
		setError(null);
		setIsEditing(false);
	};

	let deleteButtonText = "Удалить";

	if (isDeleting) {
		deleteButtonText = "Удаление...";
	} else if (deleteConfirmationId === reportEntry?.id) {
		deleteButtonText = "Подтвердить удаление";
	}

	const authorOptions = getUserAutocompleteOptions(users);

	return (
		<Modal isOpen={Boolean(reportEntry)} onClose={onClose} size="covered">
			{reportEntry ? (
				<div
					className={`${styles.ganttFormModal} ${styles.projectReportModal}`}
				>
					<div className={styles.projectReportViewHeader}>
						<h3>Отчёт по проекту</h3>
						<button
							type="button"
							className={
								isEditing ? styles.projectReportHiddenAction : undefined
							}
							disabled={isSaving || isDeleting || isEditing}
							onClick={() => setIsEditing(true)}
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
									list="project-report-edit-author-options"
									value={draft.authorName}
									onChange={(event) => {
										const value = event.target.value;
										const selectedAuthor = authorOptions.find(
											(option) => option.title === value,
										);

										setDraft((prev) => ({
											...prev,
											authorId: selectedAuthor?.id ?? null,
											authorName: value,
										}));
									}}
								/>
								<datalist id="project-report-edit-author-options">
									{authorOptions.map((option) => (
										<option key={option.id} value={option.title} />
									))}
								</datalist>
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
							<div className={styles.projectReportFilePicker}>
								<span>Файлы</span>
								<label
									className={`${projectReportsStyles.projectFileField} ${styles.projectReportCreateFileField}`}
								>
									<input
										type="file"
										multiple
										className={projectReportsStyles.projectFileInput}
										disabled={isSaving || isDeleting || isFileUploading}
										onChange={(event) => {
											const selectedFiles = Array.from(
												event.target.files ?? [],
											);

											event.target.value = "";
											void handleFilesChange(selectedFiles);
										}}
									/>
									<strong className={projectReportsStyles.projectFileButton}>
										{isFileUploading ? "Загрузка..." : "Выбрать файлы"}
									</strong>
									<em className={projectReportsStyles.projectFileName}>
										Можно добавить новые файлы к отчёту
									</em>
								</label>
							</div>
							{error ? <p className={styles.ganttFormError}>{error}</p> : null}
							<div className={styles.ganttFormActions}>
								<button
									type="button"
									disabled={isSaving || isFileUploading}
									onClick={handleEditCancel}
								>
									Отмена
								</button>
								<button
									type="button"
									disabled={isSaving || isFileUploading}
									onClick={handleSubmit}
								>
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
					<div className={styles.ganttFormActions}>
						<button
							type="button"
							className={styles.ganttFormDeleteButton}
							disabled={isSaving || isDeleting}
							onClick={handleDelete}
						>
							{deleteButtonText}
						</button>
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
	onAuthorChange,
	onClose,
	onCreate,
	onFilesChange,
	onNextReportDateChange,
	onTextChange,
	text,
	users,
}: {
	authorName: string;
	error: string | null;
	fileDrafts: File[];
	isOpen: boolean;
	isSaving: boolean;
	nextReportDate: string;
	onAuthorChange: (authorName: string, authorId: string | null) => void;
	onClose: () => void;
	onCreate: () => void;
	onFilesChange: (files: File[]) => void;
	onNextReportDateChange: (value: string) => void;
	onTextChange: (value: string) => void;
	text: string;
	users: User[];
}) => {
	const authorOptions = getUserAutocompleteOptions(users);

	return (
		<Modal isOpen={isOpen} onClose={onClose} size="small">
			<div className={`${styles.ganttFormModal} ${styles.projectReportModal}`}>
				<h3>Создать отчёт по проекту</h3>
				<div className={styles.projectReportComposer}>
					<label>
						<span>Автор отчёта</span>
						<input
							type="text"
							list="project-report-author-options"
							value={authorName}
							onChange={(event) => {
								const value = event.target.value;
								const selectedAuthor = authorOptions.find(
									(option) => option.title === value,
								);

								onAuthorChange(value, selectedAuthor?.id ?? null);
							}}
						/>
						<datalist id="project-report-author-options">
							{authorOptions.map((option) => (
								<option key={option.id} value={option.title} />
							))}
						</datalist>
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
								onChange={(event) => onNextReportDateChange(event.target.value)}
							/>
						</label>
						<div className={styles.projectReportFilePicker}>
							<span>Файлы</span>
							<label
								className={`${projectReportsStyles.projectFileField} ${styles.projectReportCreateFileField}`}
							>
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
};
