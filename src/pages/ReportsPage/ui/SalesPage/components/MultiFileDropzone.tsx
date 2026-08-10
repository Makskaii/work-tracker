import { useState, useRef, type ReactNode } from "react";
import styles from "../SalesProfitabilityReport.module.scss";

export type MultiFileDropzoneProps = {
	label?: string;
	selectedFiles: File[];
	existingFilesCount?: number;
	maxFiles?: number;
	isDisabled?: boolean;
	isUploading?: boolean;
	onFilesChange: (files: File[]) => void;
	onUpload?: () => Promise<void> | void;
	variant?: "modal" | "details";
	children?: ReactNode;
	emptyText?: string;
};

export const MultiFileDropzone = ({
	label,
	selectedFiles,
	existingFilesCount = 0,
	maxFiles = 5,
	isDisabled = false,
	isUploading = false,
	onFilesChange,
	onUpload,
	variant = "modal",
	children,
	emptyText = "Файл не загружен",
}: MultiFileDropzoneProps) => {
	const [isPasteTargetActive, setIsPasteTargetActive] = useState(false);
	const [isDragActive, setIsDragActive] = useState(false);
	const fileInputRef = useRef<HTMLInputElement | null>(null);

	const selectedFilesCount = selectedFiles.length;
	const hasSelectedFiles = selectedFilesCount > 0;
	const totalFilesCount = existingFilesCount + selectedFilesCount;

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

	const fileDropzoneClassName = [
		fileFieldClassName,
		styles.reportProjectFileDropzone,
		isDragActive ? styles.reportProjectFileDropzoneActive : "",
		isPasteTargetActive ? styles.reportProjectFilePasteTargetActive : "",
	]
		.filter(Boolean)
		.join(" ");

	const mergeSelectedFiles = (nextSelection: File[]) => {
		const merged = [...selectedFiles, ...nextSelection];
		const deduped = Array.from(
			new Map(merged.map((file) => [getFileKey(file), file])).values(),
		);

		const availableSlots = Math.max(maxFiles - existingFilesCount, 0);

		return deduped.slice(0, availableSlots);
	};

	const handleFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
		if (isDisabled || isUploading) return;
		const newFiles = Array.from(event.target.files ?? []);
		onFilesChange(mergeSelectedFiles(newFiles));
		event.currentTarget.value = "";
	};

	const openFilePicker = () => {
		if (isDisabled || isUploading) return;
		fileInputRef.current?.click();
	};

	const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
		if (isDisabled || isUploading) return;
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

		onFilesChange(mergeSelectedFiles(filesToAdd));
	};

	const activateDrag = (event: React.DragEvent<HTMLDivElement>) => {
		if (isDisabled || isUploading) return;
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
		if (isDisabled || isUploading) return;
		event.preventDefault();
		event.stopPropagation();
		setIsDragActive(false);

		const droppedFiles = Array.from(event.dataTransfer.files ?? []);
		if (droppedFiles.length) {
			onFilesChange(mergeSelectedFiles(droppedFiles));
		}
	};

	const removeSelectedFile = (index: number) => {
		if (isDisabled || isUploading) return;
		const nextFiles = selectedFiles.filter(
			(_, fileIndex) => fileIndex !== index,
		);
		onFilesChange(nextFiles);
	};

	return (
		<div className={styles.reportProjectFieldContainer}>
			{label ? (
				<div className={styles.reportProjectFileHeader}>
					<strong>{label}</strong>
				</div>
			) : null}

			<div
				className={fileDropzoneClassName}
				onDragOver={activateDrag}
				onDragEnter={activateDrag}
				onDragLeave={deactivateDrag}
				onDrop={handleDrop}
				onPaste={handlePaste}
				onFocus={() => setIsPasteTargetActive(true)}
				onBlur={() => setIsPasteTargetActive(false)}
				tabIndex={isDisabled || isUploading ? -1 : 0}
				aria-label={label ? `${label}. Нажмите, перетащите или вставьте файлы` : "Загрузка файлов"}
			>
				<input
					ref={fileInputRef}
					type="file"
					multiple
					className={styles.reportProjectFileInput}
					disabled={isDisabled || isUploading}
					onChange={handleFileSelection}
				/>

				<div className={styles.reportProjectFileDropzoneToolbar}>
					<button
						type="button"
						className={styles.reportProjectFileAttachButton}
						onClick={openFilePicker}
						disabled={isDisabled || isUploading}
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
						? `Файлов ${totalFilesCount}/${maxFiles}`
						: existingFilesCount > 0
							? `Загружено ${existingFilesCount}`
							: "Новые файлы не выбраны"}
				</span>

				{children}
			</div>

			{hasSelectedFiles ? (
				<div className={fileMetaClassName}>
					<small className={styles.reportProjectFileHint}>
						Новые файлы будут загружены после сохранения
					</small>
					{selectedFiles.map((file, index) => (
						<div key={`${file.name}-${index}`} className={styles.reportProjectFileMeta}>
							<strong>{file.name}</strong>
							<div className={fileActionsClassName}>
								<button
									type="button"
									disabled={isDisabled || isUploading}
									onClick={() => removeSelectedFile(index)}
								>
									Удалить
								</button>
							</div>
						</div>
					))}
					{onUpload ? (
						<button
							type="button"
							className={saveButtonClassName}
							onClick={() => void onUpload()}
							disabled={isDisabled || isUploading || !hasSelectedFiles}
						>
							{isUploading ? "Сохранение файлов..." : "Сохранить файлы"}
						</button>
					) : null}
				</div>
			) : existingFilesCount === 0 ? (
				<small className={styles.reportProjectFileHint}>
					{emptyText}
				</small>
			) : null}
		</div>
	);
};
