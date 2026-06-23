import { useEffect, useMemo, useState, type ReactNode } from "react";
import Modal from "@/components/modal/Modal";
import { EntityTypeIds } from "@/shared/constants/const";
import { useBitrixSlider } from "@/shared/hooks/useBitrixSlider";
import type { User } from "@/shared/types/types";
import type { Deal } from "../../types/deals.types";
import type { ActivityListItem } from "../../types/types";
import { MarginalityTab } from "./components/MarginalityTab";
import { ProfitabilitySkeleton } from "./components/ProfitabilitySkeleton";
import { ProjectsTab } from "./components/ProjectsTab";
import { ReportsTab } from "./components/ReportsTab";
import { SummaryCards } from "./components/SummaryCards";
import { TasksTab } from "./components/TasksTab";
import {
	createReportProject,
	deleteReportProject,
	deleteReportProjectFile,
	downloadReportProjectFile,
	fetchReportProjects,
	updateReportProject,
	uploadReportProjectFile,
} from "./model/api";
import type {
	FinancialProjectSummary,
	ReportProject,
	ReportProjectFile,
	ReportProjectFileKind,
	ReportProjectPayload,
	ReportProjectType,
	SalesProfitabilityTab,
} from "./model/types";
import projectReportsStyles from "../ProjectReports/ProjectsReports.module.scss";
import styles from "./SalesProfitabilityReport.module.scss";

type SalesProfitabilityReportProps = {
	activities: ActivityListItem[];
	deals: Deal[];
	users: User[];
	loading?: boolean;
};

const tabs: Array<{ id: SalesProfitabilityTab; title: string }> = [
	{ id: "projects", title: "Проекты" },
	{ id: "tasks", title: "Задачи" },
	{ id: "reports", title: "Отчёты сотрудников" },
];

const ProjectListSkeleton = () => (
	<>
		{Array.from({ length: 1 }, (_, index) => (
			<div
				key={index}
				className={styles.dealProjectSkeleton}
				aria-hidden="true"
			>
				<span className={styles.dealProjectSkeletonIcon} />
				<span className={styles.dealProjectSkeletonText}>
					<span />
					<span />
				</span>
			</div>
		))}
	</>
);

type ReportProjectFormState = {
	[K in keyof ReportProjectPayload]-?: string;
};

type ReportProjectFileDrafts = Partial<Record<ReportProjectFileKind, File>>;

const DEFAULT_REPORT_PROJECT_FORM: ReportProjectFormState = {
	analyst: "",
	clientCompany: "",
	closeDate: "",
	deadline: "",
	deal: "",
	developmentFactEndDate: "",
	developmentFactStartDate: "",
	developmentPlanEndDate: "",
	developmentPlanStartDate: "",
	developmentTeam: "",
	developmentWeeks: "",
	educationFactEndDate: "",
	educationFactStartDate: "",
	educationPlanEndDate: "",
	educationPlanStartDate: "",
	educationWeeks: "",
	nextReportDate: "",
	projectAmount: "",
	projectGoal: "",
	projectType: "none",
	qa: "",
	redline: "",
	reportInfo: "",
	responsible: "",
	title: "",
	tzFactEndDate: "",
	tzPlanEndDate: "",
	tzSignDate: "",
	tzStartDate: "",
	tzWeeks: "",
};

const projectTypeOptions: Array<{
	label: string;
	value: ReportProjectType;
}> = [
	{ label: "Не выбрано", value: "none" },
	{ label: "Финансовый вотерфол проект", value: "waterfall" },
	{ label: "Финансовый техпод проект", value: "support" },
];

const reportProjectFileLabels: Record<ReportProjectFileKind, string> = {
	estimate: "Смета / КП",
	technical_specification: "Файл ТЗ",
};

const textOrNull = (value: string) => {
	const trimmedValue = value.trim();

	return trimmedValue ? trimmedValue : null;
};

const numberOrNull = (value: string) => {
	const normalizedValue = value.replace(/\s/g, "").replace(",", ".");

	if (!normalizedValue) {
		return null;
	}

	const parsedValue = Number(normalizedValue);

	return Number.isFinite(parsedValue) ? parsedValue : null;
};

const dateOrNull = (value: string) => value || null;

const getReportProjectForm = (
	project?: ReportProject | null,
): ReportProjectFormState => {
	if (!project) {
		return DEFAULT_REPORT_PROJECT_FORM;
	}

	return {
		analyst: project.analyst ?? "",
		clientCompany: project.clientCompany ?? "",
		closeDate: project.closeDate ?? "",
		deadline: project.deadline ?? "",
		deal: project.deal ?? "",
		developmentFactEndDate: project.developmentFactEndDate ?? "",
		developmentFactStartDate: project.developmentFactStartDate ?? "",
		developmentPlanEndDate: project.developmentPlanEndDate ?? "",
		developmentPlanStartDate: project.developmentPlanStartDate ?? "",
		developmentTeam: project.developmentTeam ?? "",
		developmentWeeks:
			project.developmentWeeks === null ? "" : String(project.developmentWeeks),
		educationFactEndDate: project.educationFactEndDate ?? "",
		educationFactStartDate: project.educationFactStartDate ?? "",
		educationPlanEndDate: project.educationPlanEndDate ?? "",
		educationPlanStartDate: project.educationPlanStartDate ?? "",
		educationWeeks:
			project.educationWeeks === null ? "" : String(project.educationWeeks),
		nextReportDate: project.nextReportDate ?? "",
		projectAmount:
			project.projectAmount === null ? "" : String(project.projectAmount),
		projectGoal: project.projectGoal ?? "",
		projectType: project.projectType,
		qa: project.qa ?? "",
		redline: project.redline ?? "",
		reportInfo: project.reportInfo ?? "",
		responsible: project.responsible ?? "",
		title: project.title,
		tzFactEndDate: project.tzFactEndDate ?? "",
		tzPlanEndDate: project.tzPlanEndDate ?? "",
		tzSignDate: project.tzSignDate ?? "",
		tzStartDate: project.tzStartDate ?? "",
		tzWeeks: project.tzWeeks === null ? "" : String(project.tzWeeks),
	};
};

const getReportProjectPayload = (
	form: ReportProjectFormState,
): ReportProjectPayload => ({
	analyst: textOrNull(form.analyst),
	clientCompany: textOrNull(form.clientCompany),
	closeDate: dateOrNull(form.closeDate),
	deadline: dateOrNull(form.deadline),
	deal: textOrNull(form.deal),
	developmentFactEndDate: dateOrNull(form.developmentFactEndDate),
	developmentFactStartDate: dateOrNull(form.developmentFactStartDate),
	developmentPlanEndDate: dateOrNull(form.developmentPlanEndDate),
	developmentPlanStartDate: dateOrNull(form.developmentPlanStartDate),
	developmentTeam: textOrNull(form.developmentTeam),
	developmentWeeks: numberOrNull(form.developmentWeeks),
	educationFactEndDate: dateOrNull(form.educationFactEndDate),
	educationFactStartDate: dateOrNull(form.educationFactStartDate),
	educationPlanEndDate: dateOrNull(form.educationPlanEndDate),
	educationPlanStartDate: dateOrNull(form.educationPlanStartDate),
	educationWeeks: numberOrNull(form.educationWeeks),
	nextReportDate: dateOrNull(form.nextReportDate),
	projectAmount: numberOrNull(form.projectAmount),
	projectGoal: textOrNull(form.projectGoal),
	projectType: form.projectType as ReportProjectType,
	qa: textOrNull(form.qa),
	redline: dateOrNull(form.redline),
	reportInfo: textOrNull(form.reportInfo),
	responsible: textOrNull(form.responsible),
	title: form.title.trim(),
	tzFactEndDate: dateOrNull(form.tzFactEndDate),
	tzPlanEndDate: dateOrNull(form.tzPlanEndDate),
	tzSignDate: dateOrNull(form.tzSignDate),
	tzStartDate: dateOrNull(form.tzStartDate),
	tzWeeks: numberOrNull(form.tzWeeks),
});

const getDbProjectId = (project: ReportProject) => `db-${project.id}`;

const mergeReportProjectFiles = (
	files: ReportProjectFile[] = [],
	updatedFiles: ReportProjectFile[],
) => {
	const result = new Map<ReportProjectFileKind, ReportProjectFile>();

	files.forEach((file) => result.set(file.fileKind, file));
	updatedFiles.forEach((file) => result.set(file.fileKind, file));

	return Array.from(result.values());
};

const getReportProjectSummary = (
	project: ReportProject | null | undefined,
): FinancialProjectSummary => ({
	factHours: 0,
	companyHours: 0,
	lossHours: 0,
	mockMarginPercent: 53,
	mockProfit: 0,
	planHours: 0,
	purchasedHours: 0,
	revenue: project?.projectAmount ?? 0,
	unpaidHours: 0,
});

export const SalesProfitabilityReport = ({
	activities,
	deals,
	users,
	loading,
}: SalesProfitabilityReportProps) => {
	const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
		null,
	);
	const [activeTab, setActiveTab] = useState<SalesProfitabilityTab>("projects");
	const [isStructureCollapsed, setIsStructureCollapsed] = useState(false);
	const [reportProjects, setReportProjects] = useState<ReportProject[]>([]);
	const [editingReportProject, setEditingReportProject] =
		useState<ReportProject | null>(null);
	const [projectForm, setProjectForm] = useState<ReportProjectFormState>(
		DEFAULT_REPORT_PROJECT_FORM,
	);
	const [projectFileDrafts, setProjectFileDrafts] =
		useState<ReportProjectFileDrafts>({});
	const [isReportProjectModalOpen, setIsReportProjectModalOpen] = useState(false);
	const [isReportProjectsLoading, setIsReportProjectsLoading] = useState(false);
	const [projectFormError, setProjectFormError] = useState<string | null>(null);
	const [isReportProjectSaving, setIsReportProjectSaving] = useState(false);
	const [projectSearchQuery, setProjectSearchQuery] = useState("");
	const [deletingReportProjectId, setDeletingReportProjectId] = useState<
		number | null
	>(null);
	const { openTask } = useBitrixSlider();
	const selectedReportProject = reportProjects.find(
		(project) => getDbProjectId(project) === selectedProjectId,
	) ?? reportProjects[0] ?? null;

	const effectiveSelectedProjectId = useMemo(() => {
		if (selectedReportProject) {
			return getDbProjectId(selectedReportProject);
		}

		const projectIds = reportProjects.map(getDbProjectId);

		if (!projectIds.length) {
			return null;
		}

		if (selectedProjectId && projectIds.includes(selectedProjectId)) {
			return selectedProjectId;
		}

		return projectIds[0];
	}, [reportProjects, selectedReportProject, selectedProjectId]);

	const summary = getReportProjectSummary(selectedReportProject);
	const isBusy = loading || isReportProjectsLoading;
	const allTasks: never[] = [];
	const allReports: never[] = [];
	const normalizedProjectSearchQuery = projectSearchQuery.trim().toLowerCase();
	const visibleReportProjects = normalizedProjectSearchQuery
		? reportProjects.filter((project) =>
				project.title.toLowerCase().includes(normalizedProjectSearchQuery),
			)
		: reportProjects;

	const selectReportProject = (project: ReportProject) => {
		setSelectedProjectId(getDbProjectId(project));
	};

	useEffect(() => {
		const controller = new AbortController();

		setIsReportProjectsLoading(true);
		fetchReportProjects(controller.signal)
			.then(setReportProjects)
			.catch(() => {
				if (controller.signal.aborted) {
					return;
				}
			})
			.finally(() => {
				if (!controller.signal.aborted) {
					setIsReportProjectsLoading(false);
				}
			});

		return () => controller.abort();
	}, []);

	const openReportProjectCreateModal = () => {
		setEditingReportProject(null);
		setProjectForm(DEFAULT_REPORT_PROJECT_FORM);
		setProjectFileDrafts({});
		setProjectFormError(null);
		setDeletingReportProjectId(null);
		setIsReportProjectModalOpen(true);
	};

	const openReportProjectEditModal = (project: ReportProject) => {
		setEditingReportProject(project);
		setProjectForm(getReportProjectForm(project));
		setProjectFileDrafts({});
		setProjectFormError(null);
		setDeletingReportProjectId(null);
		setIsReportProjectModalOpen(true);
	};

	const uploadSelectedReportProjectFiles = async (projectId: number) => {
		const entries = Object.entries(projectFileDrafts) as Array<
			[ReportProjectFileKind, File | undefined]
		>;
		const selectedEntries = entries.filter((entry): entry is [
			ReportProjectFileKind,
			File,
		] => Boolean(entry[1]));

		if (!selectedEntries.length) {
			return [];
		}

		return Promise.all(
			selectedEntries.map(([fileKind, file]) =>
				uploadReportProjectFile(projectId, fileKind, file),
			),
		);
	};

	const downloadProjectFile = async (
		project: ReportProject,
		file: ReportProjectFile,
	) => {
		const response = await downloadReportProjectFile(project.id, file.id);
		const url = URL.createObjectURL(response.data);
		const link = document.createElement("a");

		link.href = url;
		link.download = file.originalName;
		link.click();
		URL.revokeObjectURL(url);
	};

	const deleteProjectFile = async (
		project: ReportProject,
		file: ReportProjectFile,
	) => {
		await deleteReportProjectFile(project.id, file.id);

		setReportProjects((prev) =>
			prev.map((item) =>
				item.id === project.id
					? {
							...item,
							files: item.files.filter(
								(projectFile) => projectFile.id !== file.id,
							),
						}
					: item,
			),
		);
		setEditingReportProject((prev) =>
			prev && prev.id === project.id
				? {
						...prev,
						files: prev.files.filter(
							(projectFile) => projectFile.id !== file.id,
						),
					}
				: prev,
		);
	};

	const handleReportProjectSubmit = async () => {
		if (!projectForm.title.trim()) {
			setProjectFormError("Заполните название проекта");
			return;
		}

		const payload = getReportProjectPayload(projectForm);

		setIsReportProjectSaving(true);
		setProjectFormError(null);

		try {
			let savedProject: ReportProject;

			if (editingReportProject) {
				savedProject = await updateReportProject(
					editingReportProject.id,
					payload,
				);
			} else {
				savedProject = await createReportProject(payload);
			}

			const uploadedFiles = await uploadSelectedReportProjectFiles(savedProject.id);

			if (uploadedFiles.length) {
				savedProject = {
					...savedProject,
					files: mergeReportProjectFiles(savedProject.files, uploadedFiles),
				};
			}

			setReportProjects((prev) => {
				const existingProject = prev.some(
					(project) => project.id === savedProject.id,
				);

				if (existingProject) {
					return prev.map((project) =>
						project.id === savedProject.id ? savedProject : project,
					);
				}

				return [...prev, savedProject];
			});
			setEditingReportProject(savedProject);
			setProjectFileDrafts({});
			setIsReportProjectModalOpen(false);
		} catch {
			setProjectFormError("Не удалось сохранить проект");
		} finally {
			setIsReportProjectSaving(false);
		}
	};

	const handleReportProjectDelete = async () => {
		if (!editingReportProject) {
			return;
		}

		if (deletingReportProjectId !== editingReportProject.id) {
			setDeletingReportProjectId(editingReportProject.id);
			return;
		}

		setIsReportProjectSaving(true);
		setProjectFormError(null);

		try {
			await deleteReportProject(editingReportProject.id);
			setReportProjects((prev) =>
				prev.filter((project) => project.id !== editingReportProject.id),
			);
			setDeletingReportProjectId(null);
			setIsReportProjectModalOpen(false);
		} catch {
			setProjectFormError("Не удалось удалить проект");
		} finally {
			setIsReportProjectSaving(false);
		}
	};

	return (
		<>
		<section className={styles.section}>
			<div
				className={`${styles.layout} ${
					isStructureCollapsed ? styles.layoutCollapsed : ""
				}`}
			>
				<aside className={styles.structure}>
					<div className={styles.structureHeader}>
						<button
							type="button"
							className={styles.structureToggle}
							onClick={() => setIsStructureCollapsed((prev) => !prev)}
							title={
								isStructureCollapsed
									? "Развернуть структуру"
									: "Свернуть структуру"
							}
						>
							{isStructureCollapsed ? "⇥" : "⇤"}
						</button>
						<h3>Структура</h3>
					</div>
					<div className={styles.dealsList}>
						<input
							type="search"
							className={styles.projectSearchInput}
							placeholder="Поиск по проектам"
							value={projectSearchQuery}
							onChange={(event) => setProjectSearchQuery(event.target.value)}
						/>
						{isReportProjectsLoading ? (
							<ProjectListSkeleton />
						) : null}
						{!isReportProjectsLoading &&
							visibleReportProjects.map((project) => (
								<button
									key={project.id}
									type="button"
									title={project.title}
									className={`${styles.dealProjectButton} ${styles.reportProjectButton} ${
										getDbProjectId(project) === selectedProjectId
											? styles.activeProject
											: ""
									}`}
									onClick={() => selectReportProject(project)}
								>
									<span className={styles.dealProjectIcon}>
										{project.title.trim().charAt(0) || "P"}
									</span>
									<span>
										<strong>{project.title}</strong>
										<small>Проект</small>
									</span>
									<span
										className={styles.reportProjectMenuButton}
										onClick={(event) => {
											event.stopPropagation();
											openReportProjectEditModal(project);
										}}
									>
										...
									</span>
								</button>
							))}
						<button
							type="button"
							className={styles.dealProjectAddButton}
							onClick={openReportProjectCreateModal}
							title="Добавить проект"
						>
							+
						</button>
					</div>
				</aside>

				<div className={styles.content}>
					<div className={styles.tabs}>
						{tabs.map((tab) => (
							<button
								key={tab.id}
								type="button"
								className={activeTab === tab.id ? styles.activeTab : ""}
								onClick={() => setActiveTab(tab.id)}
							>
								{tab.title}
							</button>
						))}
						<button
							type="button"
							className={`${styles.marginalityTabButton} ${
								activeTab === "marginality" ? styles.activeTab : ""
							}`}
							onClick={() => setActiveTab("marginality")}
						>
							Список оплат
						</button>
					</div>

					{isBusy ? (
						<ProfitabilitySkeleton />
					) : (
						<>
							{activeTab !== "marginality" && (
								<SummaryCards
									projectTitle={
										selectedReportProject?.title ??
										"Проект не выбран"
									}
									summary={summary}
								/>
							)}

							{activeTab === "marginality" && (
								<MarginalityTab
									deals={deals}
									projects={[]}
									selectedProjectId={effectiveSelectedProjectId}
								/>
							)}

							{activeTab === "projects" && (
								<ProjectsTab
									projects={reportProjects}
									selectedProjectId={effectiveSelectedProjectId}
									users={users}
								/>
							)}

							{activeTab === "tasks" && (
								<TasksTab
									items={allTasks}
									users={users}
									openTask={(id) => openTask(id, EntityTypeIds.tasks)}
								/>
							)}

							{activeTab === "reports" && (
								<ReportsTab
									activities={activities}
									items={allReports}
									users={users}
									openReport={(id) => openTask(id, EntityTypeIds.reports)}
								/>
							)}
						</>
					)}
				</div>
			</div>
		</section>
		<ReportProjectModal
			deletingReportProjectId={deletingReportProjectId}
			fileDrafts={projectFileDrafts}
			form={projectForm}
			isOpen={isReportProjectModalOpen}
			onClose={() => {
				setDeletingReportProjectId(null);
				setProjectFileDrafts({});
				setIsReportProjectModalOpen(false);
			}}
			onDelete={handleReportProjectDelete}
			onFileDelete={deleteProjectFile}
			onFileDownload={downloadProjectFile}
			onFileDraftChange={(fileKind, file) =>
				setProjectFileDrafts((prev) => ({
					...prev,
					[fileKind]: file,
				}))
			}
			onFormChange={setProjectForm}
			onSubmit={handleReportProjectSubmit}
			project={editingReportProject}
			projectFormError={projectFormError}
			saving={isReportProjectSaving}
		/>
		</>
	);
};

const ReportProjectModal = ({
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
				<label>
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

const ReportProjectSection = ({
	children,
	title,
}: {
	children: ReactNode;
	title: string;
}) => (
	<section className={styles.reportProjectSection}>
		<h4>{title}</h4>
		<div className={styles.reportProjectGrid}>{children}</div>
	</section>
);

const ReportProjectFileInput = ({
	file,
	fileKind,
	label,
	onDelete,
	onDownload,
	onFileChange,
	project,
	selectedFile,
}: {
	file?: ReportProjectFile;
	fileKind: ReportProjectFileKind;
	label: string;
	onDelete: (project: ReportProject, file: ReportProjectFile) => void;
	onDownload: (project: ReportProject, file: ReportProjectFile) => void;
	onFileChange: (fileKind: ReportProjectFileKind, file?: File) => void;
	project: ReportProject | null;
	selectedFile?: File;
}) => (
	<div className={styles.reportProjectWideField}>
		<span>{label}</span>
		<label className={projectReportsStyles.projectFileField}>
			<input
				type="file"
				className={projectReportsStyles.projectFileInput}
				onChange={(event) =>
					onFileChange(fileKind, event.target.files?.[0] ?? undefined)
				}
			/>
			<strong className={projectReportsStyles.projectFileButton}>
				Выбрать файл
			</strong>
			<em className={projectReportsStyles.projectFileName}>
				{selectedFile?.name ?? file?.originalName ?? "Файл не выбран"}
			</em>
		</label>
		{selectedFile ? (
			<div className={projectReportsStyles.projectFileEmpty}>
				Будет загружен после сохранения
			</div>
		) : file ? (
			<div className={projectReportsStyles.projectFileCard}>
				<div className={projectReportsStyles.projectFileCardName}>
					{file.originalName}
				</div>
				<div className={projectReportsStyles.projectFileCardActions}>
					<button
						type="button"
						className={projectReportsStyles.projectFileCardButton}
						onClick={() => project && onDownload(project, file)}
					>
						Скачать
					</button>
					<button
						type="button"
						className={`${projectReportsStyles.projectFileCardButton} ${projectReportsStyles.projectFileCardButtonDanger}`}
						onClick={() => project && onDelete(project, file)}
					>
						Удалить
					</button>
				</div>
			</div>
		) : (
			<div className={projectReportsStyles.projectFileEmpty}>
				Файл не загружен
			</div>
		)}
	</div>
);

const ReportProjectInput = ({
	form,
	label,
	name,
	onFormChange,
	textarea,
	type = "text",
}: {
	form: ReportProjectFormState;
	label: string;
	name: keyof ReportProjectFormState;
	onFormChange: (value: ReportProjectFormState) => void;
	textarea?: boolean;
	type?: "date" | "number" | "text";
}) => (
	<label className={textarea ? styles.reportProjectWideField : undefined}>
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
