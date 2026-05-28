import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import Modal from "@/components/modal/Modal";
import { $backendApi } from "@/shared/config/axios/axios.config";
import type { ClientProjectProps } from "@/shared/types/types";
import { notify } from "@/shared/ui/NotificationPopup/notify";
import theme from "../ClientProfileTheme.module.scss";
import styles from "./ClientProfile.module.scss";

type CreateTaskProposalModalProps = {
	isOpen: boolean;
	onClose: () => void;
	onCreated: () => Promise<void> | void;
	projects: ClientProjectProps[];
};

type CreateTaskProposalForm = {
	title: string;
	description: string;
	project: string;
};

const INITIAL_FORM: CreateTaskProposalForm = {
	title: "",
	description: "",
	project: "",
};

const getFileKey = (file: File) => {
	return `${file.name}-${file.size}-${file.lastModified}`;
};

const formatFileSize = (size: number) => {
	if (size < 1024) {
		return `${size} Б`;
	}

	if (size < 1024 * 1024) {
		return `${(size / 1024).toFixed(1)} КБ`;
	}

	return `${(size / 1024 / 1024).toFixed(1)} МБ`;
};

export const CreateTaskProposalModal = ({
	isOpen,
	onClose,
	onCreated,
	projects,
}: CreateTaskProposalModalProps) => {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const {
		register,
		reset,
		handleSubmit,
		formState: { errors, isValid },
	} = useForm<CreateTaskProposalForm>({
		defaultValues: INITIAL_FORM,
		mode: "onChange",
	});

	useEffect(() => {
		if (isOpen) {
			reset(INITIAL_FORM);
			setSelectedFiles([]);

			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}
		}
	}, [isOpen, reset]);

	const handleFilesChange = (event: ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(event.target.files ?? []);

		if (!files.length) {
			return;
		}

		setSelectedFiles((prevFiles) => {
			const existingFileKeys = new Set(prevFiles.map(getFileKey));
			const nextFiles = files.filter(
				(file) => !existingFileKeys.has(getFileKey(file)),
			);

			return [...prevFiles, ...nextFiles];
		});

		event.target.value = "";
	};

	const removeFile = (fileKey: string) => {
		setSelectedFiles((prevFiles) =>
			prevFiles.filter((file) => getFileKey(file) !== fileKey),
		);
	};

	const onSubmit = async (data: CreateTaskProposalForm) => {
		if (isSubmitting) {
			return;
		}

		try {
			setIsSubmitting(true);

			const formData = new FormData();

			formData.append("title", data.title.trim());
			formData.append("description", data.description.trim());
			formData.append("project", data.project);

			selectedFiles.forEach((file) => {
				formData.append("files", file);
			});

			await $backendApi.post("clients/me/tasks/proposals", formData, {
				headers: {
					"Content-Type": "multipart/form-data",
				},
			});

			await onCreated();
			notify({
				message: "Задача отправлена",
				type: "success",
			});
			onClose();
		} catch (error) {
			console.error(error);
			notify({
				message: "Не удалось отправить задачу",
				type: "error",
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Modal
			isOpen={isOpen}
			onClose={onClose}
			size="small"
			innerScroll
			className={theme.lightTheme}
		>
			<form className={styles.taskModal} onSubmit={handleSubmit(onSubmit)}>
				<div className={styles.taskModalHeader}>
					<h2 className={styles.taskModalTitle}>Новая задача</h2>
					<p className={styles.taskModalSubtitle}>
						Опишите предложение, а мы передадим его команде в работу.
					</p>
				</div>

				<label className={styles.formField}>
					<span className={styles.formLabel}>Название задачи</span>
					<input
						className={styles.formInput}
						{...register("title", {
							validate: (value) => Boolean(value.trim()),
						})}
						placeholder="Коротко о задаче"
						autoFocus
					/>
					{errors.title && (
						<span className={styles.formError}>Укажите название задачи</span>
					)}
				</label>

				<label className={styles.formField}>
					<span className={styles.formLabel}>Описание задачи</span>
					<textarea
						className={styles.formTextarea}
						{...register("description", {
							validate: (value) => Boolean(value.trim()),
						})}
						placeholder="Что нужно сделать, какие есть детали и ожидания"
						rows={6}
					/>
					{errors.description && (
						<span className={styles.formError}>Опишите задачу</span>
					)}
				</label>

				<label className={styles.formField}>
					<span className={styles.formLabel}>Проект</span>
					<select
						className={styles.formInput}
						{...register("project", {
							validate: (value) => Boolean(value),
						})}
						disabled={isSubmitting || projects.length === 0}
					>
						<option value="">Выберите проект</option>
						{projects.map((project) => (
							<option key={project.projectId} value={project.projectId}>
								{project.title}
							</option>
						))}
					</select>
					{errors.project && (
						<span className={styles.formError}>Выберите проект</span>
					)}
				</label>
				<div className={styles.formField}>
					<span className={styles.formLabel}>Файлы</span>

					<label className={styles.fileUploadBox}>
						<input
							ref={fileInputRef}
							className={styles.fileInput}
							type="file"
							multiple
							onChange={handleFilesChange}
							disabled={isSubmitting}
						/>
						<span className={styles.fileUploadTitle}>Прикрепить файлы</span>
						<span className={styles.fileUploadHint}>
							Можно выбрать несколько файлов
						</span>
					</label>

					{selectedFiles.length > 0 && (
						<ul className={styles.selectedFilesList}>
							{selectedFiles.map((file) => {
								const fileKey = getFileKey(file);

								return (
									<li key={fileKey} className={styles.selectedFileItem}>
										<span className={styles.selectedFileName}>{file.name}</span>
										<span className={styles.selectedFileSize}>
											{formatFileSize(file.size)}
										</span>
										<button
											type="button"
											className={styles.removeFileButton}
											onClick={() => removeFile(fileKey)}
											disabled={isSubmitting}
											aria-label={`Удалить файл ${file.name}`}
										>
											Удалить
										</button>
									</li>
								);
							})}
						</ul>
					)}
				</div>

				<div className={styles.taskModalActions}>
					<button
						type="button"
						className={styles.cancelButton}
						onClick={onClose}
						disabled={isSubmitting}
					>
						Отмена
					</button>

					<button
						type="submit"
						className={styles.submitButton}
						disabled={isSubmitting || !isValid}
					>
						{isSubmitting ? "Отправляем..." : "Создать задачу"}
					</button>
				</div>
			</form>
		</Modal>
	);
};
