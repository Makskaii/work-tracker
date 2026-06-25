import Modal from "@/components/modal/Modal";
import type {
	ReportProject,
	ReportProjectFile,
	ReportProjectFileKind,
} from "../model/types";
import {
	projectTypeOptions,
	reportProjectFileLabels,
	type ReportProjectFileDrafts,
	type ReportProjectFormState,
} from "../model/reportProjectForm";
import {
	ReportProjectFileInput,
	ReportProjectInput,
	ReportProjectSection,
} from "./ReportProjectFileInput";
import styles from "../SalesProfitabilityReport.module.scss";

export const ReportProjectModal = ({
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
	saving,
}: {
	deletingReportProjectId: number | null;
	fileDrafts: ReportProjectFileDrafts;
	form: ReportProjectFormState;
	isOpen: boolean;
	onClose: () => void;
	onDelete: () => void;
	onFileDelete: (project: ReportProject, file: ReportProjectFile) => void;
	onFileDownload: (project: ReportProject, file: ReportProjectFile) => void;
	onFileDraftChange: (fileKind: ReportProjectFileKind, file?: File) => void;
	onFormChange: (value: ReportProjectFormState) => void;
	onSubmit: () => void;
	project: ReportProject | null;
	projectFormError: string | null;
	saving: boolean;
}) => (
	<Modal isOpen={isOpen} onClose={onClose} size="small">
		<div className={`${styles.ganttFormModal} ${styles.reportProjectModal}`}>
			<h3>{project ? "Карточка проекта" : "Новый проект"}</h3>
			<ReportProjectSection title="Информация">
				<ReportProjectInput
					form={form}
					label="Название"
					name="title"
					onFormChange={onFormChange}
				/>
				<ReportProjectInput
					form={form}
					label="Сумма проекта"
					name="projectAmount"
					onFormChange={onFormChange}
					type="number"
				/>
				<label className={styles.reportProjectField}>
					<span>Какой тип проекта?</span>
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
				<ReportProjectInput
					form={form}
					label="Компания клиента"
					name="clientCompany"
					onFormChange={onFormChange}
				/>
				<ReportProjectInput
					form={form}
					label="Сделка"
					name="deal"
					onFormChange={onFormChange}
				/>
				<ReportProjectInput
					form={form}
					label="Цель проекта"
					name="projectGoal"
					onFormChange={onFormChange}
					textarea
				/>
				<ReportProjectFileInput
					file={project?.files.find(
						(projectFile) => projectFile.fileKind === "estimate",
					)}
					fileKind="estimate"
					label={reportProjectFileLabels.estimate}
					project={project}
					selectedFile={fileDrafts.estimate}
					onDelete={onFileDelete}
					onDownload={onFileDownload}
					onFileChange={onFileDraftChange}
				/>
				<ReportProjectFileInput
					file={project?.files.find(
						(projectFile) =>
							projectFile.fileKind === "technical_specification",
					)}
					fileKind="technical_specification"
					label={reportProjectFileLabels.technical_specification}
					project={project}
					selectedFile={fileDrafts.technical_specification}
					onDelete={onFileDelete}
					onDownload={onFileDownload}
					onFileChange={onFileDraftChange}
				/>
			</ReportProjectSection>
			<ReportProjectSection title="Отчёт аналитика">
				<ReportProjectInput
					form={form}
					label="Следующая дата отчёта"
					name="nextReportDate"
					onFormChange={onFormChange}
					type="date"
				/>
			</ReportProjectSection>
			<ReportProjectSection title="Информация для отчёта">
				<ReportProjectInput
					form={form}
					label="Дедлайн"
					name="deadline"
					onFormChange={onFormChange}
					type="date"
				/>
				<ReportProjectInput
					form={form}
					label="Редлайн"
					name="redline"
					onFormChange={onFormChange}
					type="date"
				/>
				<ReportProjectInput
					form={form}
					label="Информация для отчёта"
					name="reportInfo"
					onFormChange={onFormChange}
					textarea
				/>
			</ReportProjectSection>
			<ReportProjectSection title="Проектная команда">
				<ReportProjectInput
					form={form}
					label="Ответственный"
					name="responsible"
					onFormChange={onFormChange}
				/>
				<ReportProjectInput
					form={form}
					label="Аналитик"
					name="analyst"
					onFormChange={onFormChange}
				/>
				<ReportProjectInput
					form={form}
					label="Команда разработки"
					name="developmentTeam"
					onFormChange={onFormChange}
				/>
				<ReportProjectInput
					form={form}
					label="QA"
					name="qa"
					onFormChange={onFormChange}
				/>
			</ReportProjectSection>
			<ReportProjectSection title="ТЗ">
				<ReportProjectInput
					form={form}
					label="Дата начала написания ТЗ"
					name="tzStartDate"
					onFormChange={onFormChange}
					type="date"
				/>
				<ReportProjectInput
					form={form}
					label="Срок написания ТЗ, недель"
					name="tzWeeks"
					onFormChange={onFormChange}
					type="number"
				/>
				<ReportProjectInput
					form={form}
					label="Плановая дата завершения ТЗ"
					name="tzPlanEndDate"
					onFormChange={onFormChange}
					type="date"
				/>
				<ReportProjectInput
					form={form}
					label="Фактическая дата завершения ТЗ"
					name="tzFactEndDate"
					onFormChange={onFormChange}
					type="date"
				/>
				<ReportProjectInput
					form={form}
					label="Дата подписания ТЗ"
					name="tzSignDate"
					onFormChange={onFormChange}
					type="date"
				/>
			</ReportProjectSection>
			<ReportProjectSection title="Разработка">
				<ReportProjectInput
					form={form}
					label="Срок разработки, недель"
					name="developmentWeeks"
					onFormChange={onFormChange}
					type="number"
				/>
				<ReportProjectInput
					form={form}
					label="Плановая дата начала разработки"
					name="developmentPlanStartDate"
					onFormChange={onFormChange}
					type="date"
				/>
				<ReportProjectInput
					form={form}
					label="Плановая дата завершения разработки"
					name="developmentPlanEndDate"
					onFormChange={onFormChange}
					type="date"
				/>
				<ReportProjectInput
					form={form}
					label="Фактическая дата начала разработки"
					name="developmentFactStartDate"
					onFormChange={onFormChange}
					type="date"
				/>
				<ReportProjectInput
					form={form}
					label="Фактическая дата завершения разработки"
					name="developmentFactEndDate"
					onFormChange={onFormChange}
					type="date"
				/>
			</ReportProjectSection>
			<ReportProjectSection title="Обучение / сдача">
				<ReportProjectInput
					form={form}
					label="Срок обучения / сдачи, недель"
					name="educationWeeks"
					onFormChange={onFormChange}
					type="number"
				/>
				<ReportProjectInput
					form={form}
					label="Плановая дата начала обучения / сдачи"
					name="educationPlanStartDate"
					onFormChange={onFormChange}
					type="date"
				/>
				<ReportProjectInput
					form={form}
					label="Плановая дата завершения обучения / сдачи"
					name="educationPlanEndDate"
					onFormChange={onFormChange}
					type="date"
				/>
				<ReportProjectInput
					form={form}
					label="Фактическая дата начала обучения / сдачи"
					name="educationFactStartDate"
					onFormChange={onFormChange}
					type="date"
				/>
				<ReportProjectInput
					form={form}
					label="Фактическая дата завершения обучения / сдачи"
					name="educationFactEndDate"
					onFormChange={onFormChange}
					type="date"
				/>
				<ReportProjectInput
					form={form}
					label="Дата закрытия проекта / подписания акта"
					name="closeDate"
					onFormChange={onFormChange}
					type="date"
				/>
			</ReportProjectSection>
			{projectFormError ? (
				<p className={styles.ganttFormError}>{projectFormError}</p>
			) : null}
			<div className={styles.ganttFormActions}>
				{project ? (
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
