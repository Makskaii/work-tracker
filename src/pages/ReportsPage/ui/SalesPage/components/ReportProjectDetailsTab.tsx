import type { User } from "@/shared/types/types";
import type {
	ReportProject,
	ReportProjectFile,
	ReportProjectFileKind,
} from "../model/types";
import {
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

export const ReportProjectDetailsTab = ({
	companyOptions,
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
	users,
}: {
	companyOptions: ReportProjectAutocompleteOption[];
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
	users: User[];
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
					<p>Карточка выбранного проекта</p>
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
					label="ID проекта в Битрикс"
					name="bitrixProjectId"
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
				<ReportProjectInput
					form={form}
					label="Сумма проекта"
					name="projectAmount"
					onFormChange={onFormChange}
					type="number"
					variant="details"
				/>
				<ReportProjectInput
					form={form}
					label="Компания клиента"
					name="clientCompany"
					onFormChange={onFormChange}
					options={companyOptions}
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
				<ReportProjectInput
					form={form}
					label="Дата начала проекта"
					name="projectStartDate"
					onFormChange={onFormChange}
					type="date"
					variant="details"
				/>
				<ReportProjectInput
					form={form}
					label="Дата окончания проекта по договору"
					name="contractEndDate"
					onFormChange={onFormChange}
					type="date"
					variant="details"
				/>
			</ReportProjectSection>

			<ReportProjectSection title="Проектная команда" variant="details">
				<ReportProjectInput
					form={form}
					label="Ответственный"
					name="responsible"
					onFormChange={onFormChange}
					options={getUserAutocompleteOptions(users)}
					variant="details"
				/>
				<ReportProjectInput
					form={form}
					label="Аналитик"
					name="analyst"
					onFormChange={onFormChange}
					options={getUserAutocompleteOptions(users)}
					variant="details"
				/>
				<ReportProjectInput
					form={form}
					label="Команда разработки"
					name="developmentTeam"
					onFormChange={onFormChange}
					options={getUserAutocompleteOptions(users)}
					variant="details"
				/>
				<ReportProjectInput
					form={form}
					label="QA"
					name="qa"
					onFormChange={onFormChange}
					options={getUserAutocompleteOptions(users)}
					variant="details"
				/>
			</ReportProjectSection>

			{detailsProjectError ? (
				<p className={styles.ganttFormError}>{detailsProjectError}</p>
			) : null}

			{shouldShowSave ? (
				<div className={styles.reportProjectDetailsActions}>
					<button type="button" disabled={isSaving} onClick={onSave}>
						{isSaving ? "Сохранение..." : "Сохранить изменения"}
					</button>
				</div>
			) : null}
		</div>
	);
};
