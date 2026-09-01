import Modal from "@/components/modal/Modal";
import type { User } from "@/shared/types/types";
import type {
	ReportProject,
	ReportProjectFile,
	ReportProjectFileKind,
} from "../model/types";
import {
	projectTypeOptions,
	projectStatusOptions,
	reportProjectFileLabels,
	type ReportProjectFileDrafts,
	type ReportProjectFormState,
} from "../model/reportProjectForm";
import {
	getUserAutocompleteOptions,
	type ReportProjectAutocompleteOption,
	ReportProjectFileInput,
	ReportProjectInput,
	ReportProjectSection,
} from "./ReportProjectFileInput";
import styles from "../SalesProfitabilityReport.module.scss";

export const ReportProjectModal = ({
	bitrixProjectOptions,
	companyOptions,
	deletingReportProjectId,
	fileDrafts,
	form,
	isOpen,
	onClose,
	onDelete,
	onFileDelete,
	onFileDownload,
	onFileDraftChange,
	onFormChange,
	onSubmit,
	project,
	projectFormError,
	position,
	saving,
	users,
}: {
	bitrixProjectOptions: ReportProjectAutocompleteOption[];
	companyOptions: ReportProjectAutocompleteOption[];
	deletingReportProjectId: number | null;
	fileDrafts: ReportProjectFileDrafts;
	form: ReportProjectFormState;
	isOpen: boolean;
	onClose: () => void;
	onDelete: () => void;
	onFileDelete: (project: ReportProject, file: ReportProjectFile) => void;
	onFileDownload: (project: ReportProject, file: ReportProjectFile) => void;
	onFileDraftChange: (fileKind: ReportProjectFileKind, files: File[]) => void;
	onFormChange: (value: ReportProjectFormState) => void;
	onSubmit: () => void;
	project: ReportProject | null;
	projectFormError: string | null;
	position?: "center" | "right";
	saving: boolean;
	users: User[];
	}) => {
	const isProjectDrawer = position === "right";

	return (
		<Modal isOpen={isOpen} onClose={onClose} position={position} size="small">
			<div className={`${styles.ganttFormModal} ${styles.reportProjectModal}`}>
				<header className={styles.reportProjectModalHeader}>
					<div>
						<span>Карточка проекта</span>
						<h3>{project ? "Изменить проект" : "Новый проект"}</h3>
					</div>
				</header>
				<ReportProjectSection title="Информация">
				<ReportProjectInput
					form={form}
					label="Название"
					name="title"
					onFormChange={onFormChange}
				/>
				{isProjectDrawer ? (
					<>
						<label className={styles.reportProjectField}>
							<span>Статус проекта</span>
							<select
								value={form.projectStatus}
								onChange={(event) =>
									onFormChange({
										...form,
										projectStatus: event.target.value,
									})
								}
							>
								{projectStatusOptions.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</select>
						</label>
						<ReportProjectInput
							form={form}
							label="Сумма проекта"
							name="projectAmount"
							onFormChange={onFormChange}
							type="number"
						/>
						<ReportProjectInput
							form={form}
							label="Куплено часов"
							name="summaryPurchasedHours"
							onFormChange={onFormChange}
							type="number"
						/>
						<ReportProjectInput
							form={form}
							label="Дата завершения"
							name="summaryFactCompletionDate"
							onFormChange={onFormChange}
							type="date"
						/>
					</>
				) : (
					<>
				<ReportProjectInput
					form={form}
					label="ID проекта в Битрикс"
					name="bitrixProjectId"
					onFormChange={onFormChange}
					options={bitrixProjectOptions}
				/>
				<ReportProjectInput
					form={form}
					label="Цель проекта"
					name="projectGoal"
					onFormChange={onFormChange}
					textarea
				/>
				<label className={styles.reportProjectField}>
					<span>Тип проекта</span>
					<select
						value={form.projectType}
						onChange={(event) =>
							onFormChange({
								...form,
								projectType: event.target.value,
							})
						}
					>
						{projectTypeOptions.map((option) => (
							<option key={option.value} value={option.value}>
								{option.label}
							</option>
						))}
					</select>
				</label>
				<label className={styles.reportProjectField}>
					<span>Статус проекта</span>
					<select
						value={form.projectStatus}
						onChange={(event) =>
							onFormChange({
								...form,
								projectStatus: event.target.value,
							})
						}
					>
						{projectStatusOptions.map((option) => (
							<option key={option.value} value={option.value}>
								{option.label}
							</option>
						))}
					</select>
				</label>
				<ReportProjectInput
					form={form}
					label="Сумма проекта"
					name="projectAmount"
					onFormChange={onFormChange}
					type="number"
				/>
				<ReportProjectInput
					form={form}
					label="Компания клиента"
					name="clientCompany"
					onFormChange={onFormChange}
					options={companyOptions}
				/>
				<ReportProjectFileInput
					files={project?.files.filter(
						(projectFile) => projectFile.fileKind === "estimate",
					)}
					fileKind="estimate"
					label={reportProjectFileLabels.estimate}
					project={project}
					selectedFiles={fileDrafts.estimate}
					onDelete={onFileDelete}
					onDownload={onFileDownload}
					onFileChange={onFileDraftChange}
				/>
				<ReportProjectFileInput
					files={project?.files.filter(
						(projectFile) =>
							projectFile.fileKind === "technical_specification",
					)}
					fileKind="technical_specification"
					label={reportProjectFileLabels.technical_specification}
					project={project}
					selectedFiles={fileDrafts.technical_specification}
					onDelete={onFileDelete}
					onDownload={onFileDownload}
					onFileChange={onFileDraftChange}
				/>
				<ReportProjectInput
					form={form}
					label="Дата начала проекта"
					name="projectStartDate"
					onFormChange={onFormChange}
					type="date"
				/>
				<ReportProjectInput
					form={form}
					label="Дата окончания проекта по договору"
					name="contractEndDate"
					onFormChange={onFormChange}
					type="date"
				/>
					</>
				)}
				</ReportProjectSection>
				{!isProjectDrawer ? (
			<ReportProjectSection title="Проектная команда">
				<ReportProjectInput
					form={form}
					label="Ответственный"
					name="responsible"
					onFormChange={onFormChange}
					options={getUserAutocompleteOptions(users)}
				/>
				<ReportProjectInput
					form={form}
					label="Продажник"
					name="salesManager"
					onFormChange={onFormChange}
					options={getUserAutocompleteOptions(users)}
				/>
				<ReportProjectInput
					form={form}
					label="Аналитик"
					name="analyst"
					onFormChange={onFormChange}
					options={getUserAutocompleteOptions(users)}
				/>
				<ReportProjectInput
					form={form}
					label="Команда разработки"
					name="developmentTeam"
					onFormChange={onFormChange}
					options={getUserAutocompleteOptions(users)}
				/>
				<ReportProjectInput
					form={form}
					label="QA"
					name="qa"
					onFormChange={onFormChange}
					options={getUserAutocompleteOptions(users)}
				/>
			</ReportProjectSection>
				) : null}
			{projectFormError ? (
				<p className={styles.ganttFormError}>{projectFormError}</p>
			) : null}
			<div className={styles.ganttFormActions}>
				{project && !isProjectDrawer ? (
					<button
						type="button"
						className={styles.ganttFormDeleteButton}
						disabled={saving}
						onClick={onDelete}
					>
						{deletingReportProjectId === project.id
							? "Подтвердить удаление"
							: "Удалить"}
					</button>
				) : null}
				<button type="button" disabled={saving} onClick={onClose}>
					Отмена
				</button>
				<button type="button" disabled={saving} onClick={onSubmit}>
					{saving ? "Сохранение..." : "Сохранить"}
				</button>
			</div>
		</div>
		</Modal>
	);
};
