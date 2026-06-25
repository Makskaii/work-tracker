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

export const ReportProjectDetailsTab = ({
	detailsFileDrafts,
	detailsProjectError,
	form,
	isSaving,
	onFileDelete,
	onFileDownload,
	onFileDraftChange,
	onFormChange,
	onSave,
	project,
	shouldShowSave,
}: {
	detailsFileDrafts: ReportProjectFileDrafts;
	detailsProjectError: string | null;
	form: ReportProjectFormState;
	isSaving: boolean;
	onFileDelete: (project: ReportProject, file: ReportProjectFile) => void;
	onFileDownload: (project: ReportProject, file: ReportProjectFile) => void;
	onFileDraftChange: (fileKind: ReportProjectFileKind, file?: File) => void;
	onFormChange: (value: ReportProjectFormState) => void;
	onSave: () => void;
	project: ReportProject | null;
	shouldShowSave: boolean;
}) => {
	if (!project) {
		return (
			<div className={styles.reportProjectDetailsEmpty}>
				Выберите проект, чтобы посмотреть детальную информацию.
			</div>
		);
	}

	return (
		<div className={styles.reportProjectDetails}>
			<div className={styles.reportProjectDetailsHeader}>
				<div>
					<h3>{project.title}</h3>
					<p>Детальная информация по выбранному проекту</p>
				</div>
			</div>

			<ReportProjectSection title="Информация" variant="details">
				<ReportProjectInput
					form={form}
					label="Название"
					name="title"
					onFormChange={onFormChange}
					variant="details"
				/>
				<ReportProjectInput
					form={form}
					label="Сумма проекта"
					name="projectAmount"
					onFormChange={onFormChange}
					type="number"
					variant="details"
				/>
				<label className={styles.reportProjectDetailsField}>
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
					variant="details"
				/>
				<ReportProjectInput
					form={form}
					label="Сделка"
					name="deal"
					onFormChange={onFormChange}
					variant="details"
				/>
				<ReportProjectInput
					form={form}
					label="Цель проекта"
					name="projectGoal"
					onFormChange={onFormChange}
					textarea
					variant="details"
				/>
				<ReportProjectFileInput
					file={project.files.find(
						(projectFile) => projectFile.fileKind === "estimate",
					)}
					fileKind="estimate"
					label={reportProjectFileLabels.estimate}
					project={project}
					selectedFile={detailsFileDrafts.estimate}
					onDelete={onFileDelete}
					onDownload={onFileDownload}
					onFileChange={onFileDraftChange}
					variant="details"
				/>
				<ReportProjectFileInput
					file={project.files.find(
						(projectFile) =>
							projectFile.fileKind === "technical_specification",
					)}
					fileKind="technical_specification"
					label={reportProjectFileLabels.technical_specification}
					project={project}
					selectedFile={detailsFileDrafts.technical_specification}
					onDelete={onFileDelete}
					onDownload={onFileDownload}
					onFileChange={onFileDraftChange}
					variant="details"
				/>
			</ReportProjectSection>

			<ReportProjectSection title="Отчёт аналитика" variant="details">
				<ReportProjectInput
					form={form}
					label="Следующая дата отчёта"
					name="nextReportDate"
					onFormChange={onFormChange}
					type="date"
					variant="details"
				/>
			</ReportProjectSection>

			<ReportProjectSection title="Информация для отчёта" variant="details">
				<ReportProjectInput
					form={form}
					label="Дедлайн"
					name="deadline"
					onFormChange={onFormChange}
					type="date"
					variant="details"
				/>
				<ReportProjectInput
					form={form}
					label="Редлайн"
					name="redline"
					onFormChange={onFormChange}
					type="date"
					variant="details"
				/>
				<ReportProjectInput
					form={form}
					label="Информация для отчёта"
					name="reportInfo"
					onFormChange={onFormChange}
					textarea
					variant="details"
				/>
			</ReportProjectSection>

			<ReportProjectSection title="Проектная команда" variant="details">
				<ReportProjectInput
					form={form}
					label="Ответственный"
					name="responsible"
					onFormChange={onFormChange}
					variant="details"
				/>
				<ReportProjectInput
					form={form}
					label="Аналитик"
					name="analyst"
					onFormChange={onFormChange}
					variant="details"
				/>
				<ReportProjectInput
					form={form}
					label="Команда разработки"
					name="developmentTeam"
					onFormChange={onFormChange}
					variant="details"
				/>
				<ReportProjectInput
					form={form}
					label="QA"
					name="qa"
					onFormChange={onFormChange}
					variant="details"
				/>
			</ReportProjectSection>

			<ReportProjectSection title="ТЗ" variant="details">
				<ReportProjectInput
					form={form}
					label="Дата начала написания ТЗ"
					name="tzStartDate"
					onFormChange={onFormChange}
					type="date"
					variant="details"
				/>
				<ReportProjectInput
					form={form}
					label="Срок написания ТЗ, недель"
					name="tzWeeks"
					onFormChange={onFormChange}
					type="number"
					variant="details"
				/>
				<ReportProjectInput
					form={form}
					label="Плановая дата завершения ТЗ"
					name="tzPlanEndDate"
					onFormChange={onFormChange}
					type="date"
					variant="details"
				/>
				<ReportProjectInput
					form={form}
					label="Фактическая дата завершения ТЗ"
					name="tzFactEndDate"
					onFormChange={onFormChange}
					type="date"
					variant="details"
				/>
				<ReportProjectInput
					form={form}
					label="Дата подписания ТЗ"
					name="tzSignDate"
					onFormChange={onFormChange}
					type="date"
					variant="details"
				/>
			</ReportProjectSection>

			<ReportProjectSection title="Разработка" variant="details">
				<ReportProjectInput
					form={form}
					label="Срок разработки, недель"
					name="developmentWeeks"
					onFormChange={onFormChange}
					type="number"
					variant="details"
				/>
				<ReportProjectInput
					form={form}
					label="Плановая дата начала разработки"
					name="developmentPlanStartDate"
					onFormChange={onFormChange}
					type="date"
					variant="details"
				/>
				<ReportProjectInput
					form={form}
					label="Плановая дата завершения разработки"
					name="developmentPlanEndDate"
					onFormChange={onFormChange}
					type="date"
					variant="details"
				/>
				<ReportProjectInput
					form={form}
					label="Фактическая дата начала разработки"
					name="developmentFactStartDate"
					onFormChange={onFormChange}
					type="date"
					variant="details"
				/>
				<ReportProjectInput
					form={form}
					label="Фактическая дата завершения разработки"
					name="developmentFactEndDate"
					onFormChange={onFormChange}
					type="date"
					variant="details"
				/>
			</ReportProjectSection>

			<ReportProjectSection title="Обучение / сдача" variant="details">
				<ReportProjectInput
					form={form}
					label="Срок обучения / сдачи, недель"
					name="educationWeeks"
					onFormChange={onFormChange}
					type="number"
					variant="details"
				/>
				<ReportProjectInput
					form={form}
					label="Плановая дата начала обучения / сдачи"
					name="educationPlanStartDate"
					onFormChange={onFormChange}
					type="date"
					variant="details"
				/>
				<ReportProjectInput
					form={form}
					label="Плановая дата завершения обучения / сдачи"
					name="educationPlanEndDate"
					onFormChange={onFormChange}
					type="date"
					variant="details"
				/>
				<ReportProjectInput
					form={form}
					label="Фактическая дата начала обучения / сдачи"
					name="educationFactStartDate"
					onFormChange={onFormChange}
					type="date"
					variant="details"
				/>
				<ReportProjectInput
					form={form}
					label="Фактическая дата завершения обучения / сдачи"
					name="educationFactEndDate"
					onFormChange={onFormChange}
					type="date"
					variant="details"
				/>
				<ReportProjectInput
					form={form}
					label="Дата закрытия проекта / подписания акта"
					name="closeDate"
					onFormChange={onFormChange}
					type="date"
					variant="details"
				/>
			</ReportProjectSection>

			{detailsProjectError ? (
				<p className={styles.ganttFormError}>{detailsProjectError}</p>
			) : null}

			{shouldShowSave ? (
				<div className={styles.reportProjectDetailsSaveBar}>
					<span>Есть несохранённые изменения</span>
					<button type="button" disabled={isSaving} onClick={onSave}>
						{isSaving ? "Сохранение..." : "Сохранить"}
					</button>
				</div>
			) : null}
		</div>
	);
};
