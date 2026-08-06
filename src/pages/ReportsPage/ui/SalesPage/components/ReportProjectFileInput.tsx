import { useState, useRef, type ReactNode } from "react";
import type { User } from "@/shared/types/types";
import type {
	ReportProject,
	ReportProjectFile,
	ReportProjectFileKind,
} from "../model/types";
import type { ReportProjectFormState } from "../model/reportProjectForm";
import styles from "../SalesProfitabilityReport.module.scss";

export const ReportProjectSection = ({
	children,
	title,
	variant = "modal",
}: {
	children: ReactNode;
	title: string;
	variant?: "modal" | "details";
}) => (
	<section
		className={
			variant === "details"
				? styles.reportProjectDetailsSection
				: styles.reportProjectSection
		}
	>
		<h4>{title}</h4>
		<div
			className={
				variant === "details"
					? styles.reportProjectDetailsGrid
					: styles.reportProjectGrid
			}
		>
			{children}
		</div>
	</section>
);

export const ReportProjectFileInput = ({
	files,
	fileKind,
	label,
	onDelete,
	onDownload,
	onFileChange,
	project,
	selectedFiles,
	onSaveFiles,
	isSaving,
	variant = "modal",
}: {
	files?: ReportProjectFile[];
	fileKind: ReportProjectFileKind;
	label: string;
	onDelete: (project: ReportProject, file: ReportProjectFile) => void;
	onDownload: (project: ReportProject, file: ReportProjectFile) => void;
	onFileChange: (fileKind: ReportProjectFileKind, files: File[]) => void;
	project: ReportProject | null;
	selectedFiles?: File[];
	onSaveFiles?: (fileKind: ReportProjectFileKind) => Promise<void> | void;
	isSaving?: boolean;
	variant?: "modal" | "details";
}) => {
	const MAX_FILES = 5;
	const inputId = `report-project-file-${fileKind}`;
	const existingFiles = files ?? [];
	const selectedFilesCount = selectedFiles?.length ?? 0;
	const hasSelectedFiles = selectedFilesCount > 0;

	const rootClassName =
		variant === "details"
			? `${styles.reportProjectDetailsField} ${styles.reportProjectDetailsWideField}`
			: `${styles.reportProjectField} ${styles.reportProjectWideField}`;

	const fileFieldClassName =
		variant === "details"
			? styles.reportProjectDetailsFileField
			: styles.reportProjectFileField;

	const fileNameClassName =
		variant === "details"
			? styles.reportProjectDetailsFileName
			: styles.reportProjectFileName;

	const fileMetaClassName =
		variant === "details"
			? styles.reportProjectDetailsFileMeta
			: styles.reportProjectFileMeta;

	const fileActionsClassName =
		variant === "details"
			? styles.reportProjectDetailsFileActions
			: styles.reportProjectFileActions;

	const saveButtonClassName =
		variant === "details"
			? styles.reportProjectDetailsFileSaveButton
			: styles.reportProjectFileSaveButton;

	const getFileKey = (file: File) =>
		`${file.name}:${file.size}:${file.lastModified}`;


	const [isPasteTargetActive, setIsPasteTargetActive] = useState(false);
	const [isDragActive, setIsDragActive] = useState(false);



	const fileDropzoneClassName = [
		fileFieldClassName,
		styles.reportProjectFileDropzone,
		isDragActive ? styles.reportProjectFileDropzoneActive : "",
		isPasteTargetActive ? styles.reportProjectFilePasteTargetActive : "",
	]
		.filter(Boolean)
		.join(" ");

	const mergeSelectedFiles = (nextSelection: File[]) => {
		const merged = [...(selectedFiles ?? []), ...nextSelection];
		const deduped = Array.from(
			new Map(merged.map((file) => [getFileKey(file), file])).values(),
		);

		const availableSlots = Math.max(MAX_FILES - existingFiles.length, 0);

		return deduped.slice(0, availableSlots);
	};

	const fileInputRef = useRef<HTMLInputElement | null>(null);

	const handleFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
		const newFiles = Array.from(event.target.files ?? []);
		onFileChange(fileKind, mergeSelectedFiles(newFiles));
		event.currentTarget.value = "";
	};


	const openFilePicker = () => {
		fileInputRef.current?.click();
	};

	const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
		const clipboardFiles = Array.from(event.clipboardData.files ?? []);
		const itemFiles = Array.from(event.clipboardData.items ?? [])
			.filter((item) => item.kind === "file")
			.map((item) => item.getAsFile())
			.filter((file): file is File => file !== null);

		const filesToAdd = clipboardFiles.length ? clipboardFiles : itemFiles;

		if (!filesToAdd.length) {
			return;
		}

		event.preventDefault();
		event.stopPropagation();

		onFileChange(fileKind, mergeSelectedFiles(filesToAdd));
	};

	const activateDrag = (event: React.DragEvent<HTMLDivElement>) => {
		event.preventDefault();
		event.stopPropagation();
		setIsDragActive(true);
	};

	const deactivateDrag = (event: React.DragEvent<HTMLDivElement>) => {
		event.preventDefault();
		event.stopPropagation();
		setIsDragActive(false);
	};

	const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
		event.preventDefault();
		event.stopPropagation();
		setIsDragActive(false);

		const droppedFiles = Array.from(event.dataTransfer.files ?? []);
		if (droppedFiles.length) {
			onFileChange(fileKind, mergeSelectedFiles(droppedFiles));
		}
	};

	const removeSelectedFile = (index: number) => {
		const nextFiles = (selectedFiles ?? []).filter(
			(_, fileIndex) => fileIndex !== index,
		);
		onFileChange(fileKind, nextFiles);
	};

	const totalFilesCount = existingFiles.length + selectedFilesCount;

	return (
		<div className={rootClassName}>
			<div className={styles.reportProjectFieldContainer}>
				<div className={styles.reportProjectFileHeader}>
					<strong>{label}</strong>
				</div>

				<div
					className={fileDropzoneClassName}
					onDragOver={activateDrag}
					onDragEnter={activateDrag}
					onDragLeave={deactivateDrag}
					onDrop={handleDrop}
					onPaste={handlePaste}
					onFocus={() => setIsPasteTargetActive(true)}
					onBlur={() => setIsPasteTargetActive(false)}
					tabIndex={0}
					aria-label={`${label}. Нажмите, перетащите или вставьте файлы`}
				>
					<input
						ref={fileInputRef}
						id={inputId}
						type="file"
						multiple
						className={styles.reportProjectFileInput}
						onChange={handleFileSelection}
					/>

					<div className={styles.reportProjectFileDropzoneToolbar}>
						<button
							type="button"
							className={styles.reportProjectFileAttachButton}
							onClick={openFilePicker}
							aria-label="Attach files"
						>
							📎
						</button>
					</div>

					<span className={fileNameClassName}>
						<small className={styles.reportProjectFilePasteHint}>
							Нажмите на поле и вставьте файлы через Ctrl + V
						</small>
						{hasSelectedFiles
							? `Файлов ${totalFilesCount}/${MAX_FILES}`
							: existingFiles.length
								? `Загружено ${existingFiles.length}`
								: "Новые файлы не выбраны"}
					</span>

					{existingFiles.length > 0 ? (
						<div className={styles.reportProjectFileMeta}>
							{existingFiles.map((file) => (
								<div key={file.id} className={styles.reportProjectFileMeta}>
									<strong>{file.originalName}</strong>
									<div className={fileActionsClassName}>
										<button type="button" onClick={() => project && onDownload(project, file)}>
											Скачать
										</button>
										<button type="button" onClick={() => project && onDelete(project, file)}>
											Удалить
										</button>
									</div>
								</div>
							))}
						</div>
					) : null}
				</div>

				{hasSelectedFiles ? (
					<div className={fileMetaClassName}>
						<small className={styles.reportProjectFileHint}>
							Новые файлы будут загружены после сохранения
						</small>
						{selectedFiles?.map((file, index) => (
							<div key={`${file.name}-${index}`} className={styles.reportProjectFileMeta}>
								<strong>{file.name}</strong>
								<div className={fileActionsClassName}>
									<button type="button" onClick={() => removeSelectedFile(index)}>
										Удалить
									</button>
								</div>
							</div>
						))}
						{onSaveFiles ? (
							<button
								type="button"
								className={saveButtonClassName}
								onClick={() => onSaveFiles(fileKind)}
								disabled={isSaving || !hasSelectedFiles || !project}
							>
								{isSaving ? "Сохранение файлов..." : "Сохранить файлы"}
							</button>
						) : null}
					</div>
				) : existingFiles.length === 0 ? (
					<small className={styles.reportProjectFileHint}>
						Файл не загружен
					</small>
				) : null}
			</div>
		</div>
	);
};

export const ReportProjectInput = ({
	form,
	label,
	multiple = false,
	name,
	onFormChange,
	options,
	textarea,
	type = "text",
	variant = "modal",
}: {
	form: ReportProjectFormState;
	label: string;
	multiple?: boolean;
	name: keyof ReportProjectFormState;
	onFormChange: (value: ReportProjectFormState) => void;
	options?: ReportProjectAutocompleteOption[];
	textarea?: boolean;
	type?: "date" | "number" | "text";
	variant?: "modal" | "details";
}) => {
	const isMultiple = multiple || name === "developmentTeam";
	const [isOptionsOpen, setIsOptionsOpen] = useState(false);
	const value = form[name];
	const query = isMultiple ? getMultiValueQuery(value) : value;
	const matchingOptions = options ? getMatchingOptions(options, query) : [];
	const idFieldName = employeeIdFieldByName[name];
	const fieldClassName =
		variant === "details"
			? textarea
				? `${styles.reportProjectDetailsField} ${styles.reportProjectDetailsWideField}`
				: options
					? `${styles.reportProjectDetailsField} ${styles.reportProjectAutocomplete}`
					: styles.reportProjectDetailsField
			: textarea
				? `${styles.reportProjectField} ${styles.reportProjectWideField}`
				: options
					? `${styles.reportProjectField} ${styles.reportProjectAutocomplete}`
					: styles.reportProjectField;

	return (
		<label className={fieldClassName}>
			<span>{label}</span>
			{textarea ? (
				<textarea
					value={value}
					onChange={(event) =>
						onFormChange({
							...form,
							[name]: event.target.value,
						})
					}
				/>
			) : (
				<>
					<input
						type={type}
						value={value}
						onFocus={() => setIsOptionsOpen(true)}
						onClick={(event) => {
							setIsOptionsOpen(true);
							if (type === "date") {
								event.currentTarget.showPicker?.();
							}
						}}
						onChange={(event) => {
							setIsOptionsOpen(true);
							const nextForm = {
								...form,
								[name]: event.target.value,
							};

							if (idFieldName) {
								nextForm[idFieldName] = "";
							}

							onFormChange(nextForm);
						}}
					/>
					{isOptionsOpen && matchingOptions.length ? (
						<div className={styles.reportProjectAutocompleteOptions}>
							{matchingOptions.map((option) => (
								<button
									key={option.id}
									type="button"
									onMouseDown={(event) => event.preventDefault()}
									onClick={() => {
										const nextForm = {
											...form,
											[name]: isMultiple
												? appendMultiValue(value, option.value ?? option.title)
												: (option.value ?? option.title),
										};

										if (idFieldName) {
											nextForm[idFieldName] = isMultiple
												? appendMultiValue(form[idFieldName], option.id)
												: option.id;
										}

										onFormChange(nextForm);
										setIsOptionsOpen(false);
									}}
								>
									{option.title}
								</button>
							))}
						</div>
					) : null}
				</>
			)}
		</label>
	);
};

export type ReportProjectAutocompleteOption = {
	id: string;
	title: string;
	value?: string;
};

const getMatchingOptions = (
	options: ReportProjectAutocompleteOption[],
	query: string,
) => {
	const normalizedQuery = query.trim().toLowerCase();

	if (!normalizedQuery) {
		return options.slice(0, 8);
	}

	return options
		.filter(
			(option) =>
				option.title.toLowerCase().includes(normalizedQuery) ||
				option.id.toLowerCase().includes(normalizedQuery),
		)
		.slice(0, 8);
};

const getMultiValueQuery = (value: string) => {
	const parts = value.split(",");

	return parts.at(-1)?.trim() ?? "";
};

const appendMultiValue = (value: string, selectedValue: string) => {
	const parts = value
		.split(",")
		.map((part) => part.trim())
		.filter(Boolean);
	const currentQuery = getMultiValueQuery(value);
	const baseParts = currentQuery ? parts.slice(0, -1) : parts;
	const nextParts = Array.from(new Set([...baseParts, selectedValue]));

	return nextParts.join(", ");
};

const employeeIdFieldByName: Partial<
	Record<keyof ReportProjectFormState, keyof ReportProjectFormState>
> = {
	analyst: "analystId",
	developmentTeam: "developmentTeamIds",
	qa: "qaId",
	responsible: "responsibleId",
	salesManager: "salesManagerId",
};

export const ReportProjectAutocompleteInput = ({
	form,
	label,
	multiple = false,
	name,
	onFormChange,
	options,
	variant = "modal",
}: {
	form: ReportProjectFormState;
	label: string;
	multiple?: boolean;
	name: keyof ReportProjectFormState;
	onFormChange: (value: ReportProjectFormState) => void;
	options: ReportProjectAutocompleteOption[];
	variant?: "modal" | "details";
}) => {
	const value = form[name];
	const query = multiple ? getMultiValueQuery(value) : value;
	const matchingOptions = getMatchingOptions(options, query);
	const fieldClassName =
		variant === "details"
			? styles.reportProjectDetailsField
			: styles.reportProjectField;
	const idFieldName = employeeIdFieldByName[name];

	const selectOption = (option: ReportProjectAutocompleteOption) => {
		const nextForm = {
			...form,
			[name]: multiple ? appendMultiValue(value, option.title) : option.title,
		};

		if (idFieldName) {
			nextForm[idFieldName] = multiple
				? appendMultiValue(form[idFieldName], option.id)
				: option.id;
		}

		onFormChange(nextForm);
	};

	const handleChange = (nextValue: string) => {
		const nextForm = {
			...form,
			[name]: nextValue,
		};

		if (idFieldName) {
			nextForm[idFieldName] = "";
		}

		onFormChange({
			...nextForm,
		});
	};

	return (
		<label className={`${fieldClassName} ${styles.reportProjectAutocomplete}`}>
			<span>{label}</span>
			<input
				type="text"
				value={value}
				onChange={(event) => handleChange(event.target.value)}
			/>
			{matchingOptions.length ? (
				<div className={styles.reportProjectAutocompleteOptions}>
					{matchingOptions.map((option) => (
						<button
							key={option.id}
							type="button"
							onClick={() => selectOption(option)}
						>
							{option.title}
						</button>
					))}
				</div>
			) : null}
		</label>
	);
};

export const getUserAutocompleteOptions = (
	users: User[],
): ReportProjectAutocompleteOption[] =>
	users
		.map((user) => ({
			id: String(user.id),
			title: String(user.title ?? "").trim(),
		}))
		.filter((option) => option.id && option.title);
