import type { ReactNode } from "react";
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
	file,
	fileKind,
	label,
	onDelete,
	onDownload,
	onFileChange,
	project,
	selectedFile,
	variant = "modal",
}: {
	file?: ReportProjectFile;
	fileKind: ReportProjectFileKind;
	label: string;
	onDelete: (project: ReportProject, file: ReportProjectFile) => void;
	onDownload: (project: ReportProject, file: ReportProjectFile) => void;
	onFileChange: (fileKind: ReportProjectFileKind, file?: File) => void;
	project: ReportProject | null;
	selectedFile?: File;
	variant?: "modal" | "details";
}) => {
	const inputId = `report-project-file-${fileKind}`;

	const rootClassName =
		variant === "details"
			? `${styles.reportProjectDetailsField} ${styles.reportProjectDetailsWideField}`
			: `${styles.reportProjectField} ${styles.reportProjectWideField}`;

	const fileFieldClassName =
		variant === "details"
			? styles.reportProjectDetailsFileField
			: styles.reportProjectFileField;

	const fileButtonClassName =
		variant === "details"
			? styles.reportProjectDetailsFileButton
			: styles.reportProjectFileButton;

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

	const deleteButtonClassName =
		variant === "details"
			? styles.reportProjectDetailsFileDeleteButton
			: styles.reportProjectFileDeleteButton;

	return (
		<div className={rootClassName}>
			<span>{label}</span>

			<div className={fileFieldClassName}>
				<input
					id={inputId}
					type="file"
					className={styles.reportProjectFileInput}
					onChange={(event) => {
						onFileChange(fileKind, event.target.files?.[0] ?? undefined);
						event.currentTarget.value = "";
					}}
				/>

				<label className={fileButtonClassName} htmlFor={inputId}>
					Выбрать файл
				</label>

				<span className={fileNameClassName}>
					{selectedFile?.name ?? "Файл не выбран"}
				</span>
			</div>

			{selectedFile ? (
				<small className={styles.reportProjectFileHint}>
					Будет загружен после сохранения
				</small>
			) : file ? (
				<div className={fileMetaClassName}>
					<strong>{file.originalName}</strong>

					<div className={fileActionsClassName}>
						<button
							type="button"
							onClick={() => project && onDownload(project, file)}
						>
							Скачать
						</button>

						<button
							type="button"
							className={deleteButtonClassName}
							onClick={() => project && onDelete(project, file)}
						>
							Удалить
						</button>
					</div>
				</div>
			) : (
				<small className={styles.reportProjectFileHint}>
					Файл не загружен
				</small>
			)}
		</div>
	);
};

export const ReportProjectInput = ({
	form,
	label,
	name,
	onFormChange,
	textarea,
	type = "text",
	variant = "modal",
}: {
	form: ReportProjectFormState;
	label: string;
	name: keyof ReportProjectFormState;
	onFormChange: (value: ReportProjectFormState) => void;
	textarea?: boolean;
	type?: "date" | "number" | "text";
	variant?: "modal" | "details";
}) => {
	const fieldClassName =
		variant === "details"
			? textarea
				? `${styles.reportProjectDetailsField} ${styles.reportProjectDetailsWideField}`
				: styles.reportProjectDetailsField
			: textarea
				? `${styles.reportProjectField} ${styles.reportProjectWideField}`
				: styles.reportProjectField;

	return (
		<label className={fieldClassName}>
			<span>{label}</span>
			{textarea ? (
				<textarea
					value={form[name]}
					onChange={(event) =>
						onFormChange({
							...form,
							[name]: event.target.value,
						})
					}
				/>
			) : (
				<input
					type={type}
					value={form[name]}
					onClick={(event) => {
						if (type === "date") {
							event.currentTarget.showPicker?.();
						}
					}}
					onChange={(event) =>
						onFormChange({
							...form,
							[name]: event.target.value,
						})
					}
				/>
			)}
		</label>
	);
};
