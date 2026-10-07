import { useState, type ReactNode } from "react";
import type { User } from "@/shared/types/types";
import type {
	ReportProject,
	ReportProjectFile,
	ReportProjectFileKind,
} from "../model/types";
import type { ReportProjectFormState } from "../model/reportProjectForm";
import styles from "../SalesProfitabilityReport.module.scss";
import { MultiFileDropzone } from "./MultiFileDropzone";

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
	selectedFiles = [],
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
	variant?: "modal" | "details";
}) => {
	const MAX_FILES = 5;
	const existingFiles = files ?? [];

	const rootClassName =
		variant === "details"
			? `${styles.reportProjectDetailsField} ${styles.reportProjectDetailsWideField}`
			: `${styles.reportProjectField} ${styles.reportProjectWideField}`;

	const fileActionsClassName =
		variant === "details"
			? styles.reportProjectDetailsFileActions
			: styles.reportProjectFileActions;

	return (
		<div className={rootClassName}>
			<MultiFileDropzone
				label={label}
				selectedFiles={selectedFiles}
				existingFilesCount={existingFiles.length}
				maxFiles={MAX_FILES}
				onFilesChange={(files) => onFileChange(fileKind, files)}
				variant={variant}
			>
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
			</MultiFileDropzone>
		</div>
	);
};

export const ReportProjectInput = ({
	form,
	label,
	min,
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
	min?: number | string;
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
						min={min}
						step={type === "number" ? "any" : undefined}
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
