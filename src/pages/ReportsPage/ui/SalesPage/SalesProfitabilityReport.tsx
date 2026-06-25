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
	createProjectReportEntry,
	deleteReportProject,
	deleteReportProjectFile,
	deleteProjectReportEntryFile,
	downloadProjectReportEntryFile,
	downloadReportProjectFile,
	fetchReportProjects,
	fetchProjectReportEntries,
	updateReportProject,
	updateProjectReportEntry,
	uploadProjectReportEntryFile,
	uploadReportProjectFile,
} from "./model/api";
import type {
	CreateProjectReportEntryPayload,
	FinancialProjectSummary,
	ProjectReportEntry,
	ProjectReportEntryFile,
	ReportProject,
	ReportProjectFile,
	ReportProjectFileKind,
	ReportProjectPayload,
	ReportProjectType,
	SalesProfitabilityTab,
	UpdateProjectReportEntryPayload,
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
	{ id: "projectDetails", title: "Детали проекта" },
	{ id: "tasks", title: "Задачи" },
	{ id: "reports", title: "Отчёты сотрудников" },
	{ id: "projectReports", title: "Отчёты по проекту" },
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

type ProjectSummaryFormState = Pick<
	ReportProjectFormState,
	| "projectAmount"
	| "summaryFactCompletionDate"
	| "summaryFactHours"
	| "summaryLossHours"
	| "summaryMarginPercent"
	| "summaryPlanCompletionDate"
	| "summaryPlanHours"
	| "summaryPurchasedHours"
>;

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
	summaryFactCompletionDate: "",
	summaryFactHours: "",
	summaryLossHours: "",
	summaryMarginPercent: "",
	summaryPlanCompletionDate: "",
	summaryPlanHours: "",
	summaryPurchasedHours: "",
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
		summaryFactCompletionDate: project.summaryFactCompletionDate ?? "",
		summaryFactHours:
			project.summaryFactHours === null ? "" : String(project.summaryFactHours),
		summaryLossHours:
			project.summaryLossHours === null ? "" : String(project.summaryLossHours),
		summaryMarginPercent:
			project.summaryMarginPercent === null
				? ""
				: String(project.summaryMarginPercent),
		summaryPlanCompletionDate: project.summaryPlanCompletionDate ?? "",
		summaryPlanHours:
			project.summaryPlanHours === null ? "" : String(project.summaryPlanHours),
		summaryPurchasedHours:
			project.summaryPurchasedHours === null
				? ""
				: String(project.summaryPurchasedHours),
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
	summaryFactCompletionDate: dateOrNull(form.summaryFactCompletionDate),
	summaryFactHours: numberOrNull(form.summaryFactHours),
	summaryLossHours: numberOrNull(form.summaryLossHours),
	summaryMarginPercent: numberOrNull(form.summaryMarginPercent),
	summaryPlanCompletionDate: dateOrNull(form.summaryPlanCompletionDate),
	summaryPlanHours: numberOrNull(form.summaryPlanHours),
	summaryPurchasedHours: numberOrNull(form.summaryPurchasedHours),
	title: form.title.trim(),
	tzFactEndDate: dateOrNull(form.tzFactEndDate),
	tzPlanEndDate: dateOrNull(form.tzPlanEndDate),
	tzSignDate: dateOrNull(form.tzSignDate),
	tzStartDate: dateOrNull(form.tzStartDate),
	tzWeeks: numberOrNull(form.tzWeeks),
});

const getProjectSummaryForm = (
	project?: ReportProject | null,
): ProjectSummaryFormState => ({
	projectAmount:
		project?.projectAmount === null || project?.projectAmount === undefined
			? ""
			: String(project.projectAmount),
	summaryFactCompletionDate: project?.summaryFactCompletionDate ?? "",
	summaryFactHours:
		project?.summaryFactHours === null || project?.summaryFactHours === undefined
			? ""
			: String(project.summaryFactHours),
	summaryLossHours:
		project?.summaryLossHours === null || project?.summaryLossHours === undefined
			? ""
			: String(project.summaryLossHours),
	summaryMarginPercent:
		project?.summaryMarginPercent === null ||
		project?.summaryMarginPercent === undefined
			? ""
			: String(project.summaryMarginPercent),
	summaryPlanCompletionDate: project?.summaryPlanCompletionDate ?? "",
	summaryPlanHours:
		project?.summaryPlanHours === null || project?.summaryPlanHours === undefined
			? ""
			: String(project.summaryPlanHours),
	summaryPurchasedHours:
		project?.summaryPurchasedHours === null ||
		project?.summaryPurchasedHours === undefined
			? ""
			: String(project.summaryPurchasedHours),
});

const getProjectSummaryPayload = (
	form: ProjectSummaryFormState,
): Partial<ReportProjectPayload> => ({
	projectAmount: numberOrNull(form.projectAmount),
	summaryFactCompletionDate: dateOrNull(form.summaryFactCompletionDate),
	summaryFactHours: numberOrNull(form.summaryFactHours),
	summaryLossHours: numberOrNull(form.summaryLossHours),
	summaryMarginPercent: numberOrNull(form.summaryMarginPercent),
	summaryPlanCompletionDate: dateOrNull(form.summaryPlanCompletionDate),
	summaryPlanHours: numberOrNull(form.summaryPlanHours),
	summaryPurchasedHours: numberOrNull(form.summaryPurchasedHours),
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

const formatProjectReportDate = (date?: string | null) => {
	if (!date) {
		return "—";
	}

	return new Date(date).toLocaleDateString("ru-RU");
};

const formatFileSize = (size: number) => {
	if (size < 1024 * 1024) {
		return `${Math.max(1, Math.round(size / 1024))} КБ`;
	}

	return `${(size / 1024 / 1024).toFixed(1)} МБ`;
};

const getReportProjectSummary = (
	project: ReportProject | null | undefined,
): FinancialProjectSummary => ({
	factHours: project?.summaryFactHours ?? 0,
	companyHours: 0,
	lossHours: project?.summaryLossHours ?? 0,
	mockMarginPercent: project?.summaryMarginPercent ?? 0,
	mockProfit: 0,
	planHours: project?.summaryPlanHours ?? 0,
	purchasedHours: project?.summaryPurchasedHours ?? 0,
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

	const [detailsProjectForm, setDetailsProjectForm] =
	useState<ReportProjectFormState>(DEFAULT_REPORT_PROJECT_FORM);

	const [detailsFileDrafts, setDetailsFileDrafts] =
		useState<ReportProjectFileDrafts>({});

	const [isDetailsProjectSaving, setIsDetailsProjectSaving] = useState(false);
	const [detailsProjectError, setDetailsProjectError] = useState<string | null>(
		null,
	);
	const [summaryForm, setSummaryForm] = useState<ProjectSummaryFormState>(
		getProjectSummaryForm(null),
	);
	const [isSummaryEditing, setIsSummaryEditing] = useState(false);
	const [isSummarySaving, setIsSummarySaving] = useState(false);
	const [summaryError, setSummaryError] = useState<string | null>(null);
	const [projectReportEntries, setProjectReportEntries] = useState<
		ProjectReportEntry[]
	>([]);
	const [isProjectReportsLoading, setIsProjectReportsLoading] = useState(false);
	const [projectReportsError, setProjectReportsError] = useState<string | null>(
		null,
	);
	const [projectReportAuthorName, setProjectReportAuthorName] = useState("");
	const [projectReportText, setProjectReportText] = useState("");
	const [projectReportNextDate, setProjectReportNextDate] = useState("");
	const [projectReportFileDrafts, setProjectReportFileDrafts] = useState<File[]>(
		[],
	);
	const [isProjectReportModalOpen, setIsProjectReportModalOpen] =
		useState(false);
	const [isProjectReportSaving, setIsProjectReportSaving] = useState(false);
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

	useEffect(() => {
		setDetailsProjectForm(getReportProjectForm(selectedReportProject));
		setSummaryForm(getProjectSummaryForm(selectedReportProject));
		setIsSummaryEditing(false);
		setSummaryError(null);
		setDetailsFileDrafts({});
		setDetailsProjectError(null);
	}, [selectedReportProject]);

	useEffect(() => {
		setProjectReportAuthorName("");
		setProjectReportText("");
		setProjectReportNextDate("");
		setProjectReportFileDrafts([]);
		setProjectReportsError(null);

		if (!selectedReportProject) {
			setProjectReportEntries([]);
			return;
		}

		const controller = new AbortController();

		setIsProjectReportsLoading(true);
		fetchProjectReportEntries(selectedReportProject.id, controller.signal)
			.then(setProjectReportEntries)
			.catch(() => {
				if (!controller.signal.aborted) {
					setProjectReportsError("Не удалось загрузить отчёты проекта");
				}
			})
			.finally(() => {
				if (!controller.signal.aborted) {
					setIsProjectReportsLoading(false);
				}
			});

		return () => controller.abort();
	}, [selectedReportProject]);

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

	const initialDetailsProjectForm = useMemo(
		() => getReportProjectForm(selectedReportProject),
		[selectedReportProject],
	);

	const isDetailsProjectDirty =
		JSON.stringify(detailsProjectForm) !==
		JSON.stringify(initialDetailsProjectForm);

	const hasDetailsFileDrafts = Object.values(detailsFileDrafts).some(Boolean);

	const shouldShowDetailsSave =
		Boolean(selectedReportProject) &&
		(isDetailsProjectDirty || hasDetailsFileDrafts);
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

	const handleProjectReportCreate = async () => {
		if (!selectedReportProject) {
			return;
		}

		const authorName = projectReportAuthorName.trim();
		const text = projectReportText.trim();

		if (!authorName || !text) {
			setProjectReportsError("Заполните автора и текст отчёта");
			return;
		}

		const payload: CreateProjectReportEntryPayload = {
			authorName,
			text,
			nextReportDate: projectReportNextDate || null,
		};

		setIsProjectReportSaving(true);
		setProjectReportsError(null);

		try {
			const createdReport = await createProjectReportEntry(
				selectedReportProject.id,
				payload,
			);

			await Promise.all(
				projectReportFileDrafts.map((file) =>
					uploadProjectReportEntryFile(
						selectedReportProject.id,
						createdReport.id,
						file,
					),
				),
			);

			const reports = await fetchProjectReportEntries(selectedReportProject.id);

			setProjectReportEntries(reports);
			setProjectReportText("");
			setProjectReportNextDate("");
			setProjectReportFileDrafts([]);
			setIsProjectReportModalOpen(false);
		} catch {
			setProjectReportsError("Не удалось создать отчёт проекта");
		} finally {
			setIsProjectReportSaving(false);
		}
	};

	const handleProjectReportUpdate = async (
		reportEntry: ProjectReportEntry,
		payload: UpdateProjectReportEntryPayload,
	) => {
		if (!selectedReportProject) {
			return;
		}

		const updatedReport = await updateProjectReportEntry(
			selectedReportProject.id,
			reportEntry.id,
			payload,
		);

		setProjectReportEntries((prev) =>
			prev.map((entry) =>
				entry.id === updatedReport.id ? updatedReport : entry,
			),
		);
	};

	const downloadProjectReportFile = async (
		reportEntry: ProjectReportEntry,
		file: ProjectReportEntryFile,
	) => {
		if (!selectedReportProject) {
			return;
		}

		const response = await downloadProjectReportEntryFile(
			selectedReportProject.id,
			reportEntry.id,
			file.id,
		);
		const url = URL.createObjectURL(response.data);
		const link = document.createElement("a");

		link.href = url;
		link.download = file.originalName;
		link.click();
		URL.revokeObjectURL(url);
	};

	const deleteProjectReportFile = async (
		reportEntry: ProjectReportEntry,
		file: ProjectReportEntryFile,
	) => {
		if (!selectedReportProject) {
			return;
		}

		await deleteProjectReportEntryFile(
			selectedReportProject.id,
			reportEntry.id,
			file.id,
		);
		setProjectReportEntries((prev) =>
			prev.map((entry) =>
				entry.id === reportEntry.id
					? {
							...entry,
							files: entry.files.filter((item) => item.id !== file.id),
						}
					: entry,
			),
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

	const handleDetailsProjectSave = async () => {
		if (!selectedReportProject) {
			return;
		}

		if (!detailsProjectForm.title.trim()) {
			setDetailsProjectError("Заполните название проекта");
			return;
		}

		setIsDetailsProjectSaving(true);
		setDetailsProjectError(null);

		try {
			let savedProject = await updateReportProject(
				selectedReportProject.id,
				getReportProjectPayload(detailsProjectForm),
			);

			const entries = Object.entries(detailsFileDrafts) as Array<
				[ReportProjectFileKind, File | undefined]
			>;

			const selectedEntries = entries.filter((entry): entry is [
				ReportProjectFileKind,
				File,
			] => Boolean(entry[1]));

			if (selectedEntries.length) {
				const uploadedFiles = await Promise.all(
					selectedEntries.map(([fileKind, file]) =>
						uploadReportProjectFile(selectedReportProject.id, fileKind, file),
					),
				);

				savedProject = {
					...savedProject,
					files: mergeReportProjectFiles(savedProject.files, uploadedFiles),
				};
			}

			setReportProjects((prev) =>
				prev.map((project) =>
					project.id === savedProject.id ? savedProject : project,
				),
			);

			setEditingReportProject((prev) =>
				prev && prev.id === savedProject.id ? savedProject : prev,
			);

			setDetailsProjectForm(getReportProjectForm(savedProject));
			setDetailsFileDrafts({});
		} catch {
			setDetailsProjectError("Не удалось сохранить проект");
		} finally {
			setIsDetailsProjectSaving(false);
		}
	};

	const handleSummarySave = async () => {
		if (!selectedReportProject) {
			return;
		}

		setIsSummarySaving(true);
		setSummaryError(null);

		try {
			const savedProject = await updateReportProject(
				selectedReportProject.id,
				getProjectSummaryPayload(summaryForm),
			);

			setReportProjects((prev) =>
				prev.map((project) =>
					project.id === savedProject.id ? savedProject : project,
				),
			);
			setEditingReportProject((prev) =>
				prev && prev.id === savedProject.id ? savedProject : prev,
			);
			setSummaryForm(getProjectSummaryForm(savedProject));
			setIsSummaryEditing(false);
		} catch {
			setSummaryError("Не удалось сохранить метрики проекта");
		} finally {
			setIsSummarySaving(false);
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
							{activeTab === "projects" && (
								<SummaryCards
									form={summaryForm}
									isEditing={isSummaryEditing}
									isSaving={isSummarySaving}
									onCancel={() => {
										setSummaryForm(getProjectSummaryForm(selectedReportProject));
										setIsSummaryEditing(false);
										setSummaryError(null);
									}}
									onChange={setSummaryForm}
									onEdit={() => setIsSummaryEditing(true)}
									onSave={handleSummarySave}
									projectTitle={
										selectedReportProject?.title ??
										"Проект не выбран"
									}
									saveError={summaryError}
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

							{activeTab === "projectDetails" && (
								<ReportProjectDetailsTab
									detailsFileDrafts={detailsFileDrafts}
									detailsProjectError={detailsProjectError}
									form={detailsProjectForm}
									isSaving={isDetailsProjectSaving}
									onFileDelete={deleteProjectFile}
									onFileDownload={downloadProjectFile}
									onFileDraftChange={(fileKind, file) =>
										setDetailsFileDrafts((prev) => ({
											...prev,
											[fileKind]: file,
										}))
									}
									onFormChange={setDetailsProjectForm}
									onSave={handleDetailsProjectSave}
									project={selectedReportProject}
									shouldShowSave={shouldShowDetailsSave}
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

							{activeTab === "projectReports" && (
								<ProjectReportsTab
									authorName={projectReportAuthorName}
									error={projectReportsError}
									fileDrafts={projectReportFileDrafts}
									isLoading={isProjectReportsLoading}
									isModalOpen={isProjectReportModalOpen}
									isSaving={isProjectReportSaving}
									nextReportDate={projectReportNextDate}
									onAuthorNameChange={setProjectReportAuthorName}
									onCloseModal={() => setIsProjectReportModalOpen(false)}
									onCreate={handleProjectReportCreate}
									onFileDelete={deleteProjectReportFile}
									onFileDownload={downloadProjectReportFile}
									onFilesChange={setProjectReportFileDrafts}
									onNextReportDateChange={setProjectReportNextDate}
									onOpenModal={() => {
										setProjectReportsError(null);
										setIsProjectReportModalOpen(true);
									}}
									onTextChange={setProjectReportText}
									onUpdate={handleProjectReportUpdate}
									project={selectedReportProject}
									reports={projectReportEntries}
									text={projectReportText}
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

const ProjectReportsTab = ({
	authorName,
	error,
	fileDrafts,
	isLoading,
	isModalOpen,
	isSaving,
	nextReportDate,
	onAuthorNameChange,
	onCloseModal,
	onCreate,
	onFileDelete,
	onFileDownload,
	onFilesChange,
	onNextReportDateChange,
	onOpenModal,
	onTextChange,
	onUpdate,
	project,
	reports,
	text,
}: {
	authorName: string;
	error: string | null;
	fileDrafts: File[];
	isLoading: boolean;
	isModalOpen: boolean;
	isSaving: boolean;
	nextReportDate: string;
	onAuthorNameChange: (value: string) => void;
	onCloseModal: () => void;
	onCreate: () => void;
	onFileDelete: (
		reportEntry: ProjectReportEntry,
		file: ProjectReportEntryFile,
	) => void;
	onFileDownload: (
		reportEntry: ProjectReportEntry,
		file: ProjectReportEntryFile,
	) => void;
	onFilesChange: (files: File[]) => void;
	onNextReportDateChange: (value: string) => void;
	onOpenModal: () => void;
	onTextChange: (value: string) => void;
	onUpdate: (
		reportEntry: ProjectReportEntry,
		payload: UpdateProjectReportEntryPayload,
	) => Promise<void>;
	project: ReportProject | null;
	reports: ProjectReportEntry[];
	text: string;
}) => {
	const [selectedReportEntryId, setSelectedReportEntryId] = useState<
		number | null
	>(null);
	const selectedReportEntry =
		reports.find((reportEntry) => reportEntry.id === selectedReportEntryId) ??
		null;

	if (!project) {
		return (
			<div className={styles.projectReportEmptyState}>
				Выберите проект, чтобы посмотреть и добавить отчёты.
			</div>
		);
	}

	return (
		<section className={styles.projectReportsPanel}>
			<div className={styles.projectReportsHeader}>
				<div>
					<h3>Отчёты по проекту</h3>
					<span>{project.title}</span>
				</div>
				<button
					type="button"
					className={styles.projectReportCreateButton}
					onClick={onOpenModal}
				>
					Создать отчёт
				</button>
			</div>

			<ProjectReportCreateModal
				authorName={authorName}
				error={error}
				fileDrafts={fileDrafts}
				isOpen={isModalOpen}
				isSaving={isSaving}
				nextReportDate={nextReportDate}
				onAuthorNameChange={onAuthorNameChange}
				onClose={onCloseModal}
				onCreate={onCreate}
				onFilesChange={onFilesChange}
				onNextReportDateChange={onNextReportDateChange}
				onTextChange={onTextChange}
				text={text}
			/>

			<div className={styles.projectReportList}>
				{isLoading ? (
					<div className={styles.projectReportEmptyState}>
						Загружаем отчёты...
					</div>
				) : null}
				{!isLoading && !reports.length ? (
					<div className={styles.projectReportEmptyState}>
						Отчётов по проекту пока нет.
					</div>
				) : null}
				{reports.length ? (
					<div className={styles.projectReportTableWrap}>
						<div className={styles.projectReportTable}>
							<div className={styles.projectReportTableHead}>
								<span>Автор</span>
								<span>Дата отчёта</span>
								<span>Следующий отчёт</span>
								<span>Текст</span>
								<span>Файлы</span>
							</div>
							{reports.map((reportEntry) => (
								<button
									key={reportEntry.id}
									type="button"
									className={styles.projectReportTableRow}
									onClick={() => setSelectedReportEntryId(reportEntry.id)}
								>
									<span className={styles.projectReportAuthor}>
										{reportEntry.authorName}
									</span>
									<span className={styles.projectReportDate}>
										{formatProjectReportDate(reportEntry.reportDate)}
									</span>
									<span className={styles.projectReportDate}>
										{formatProjectReportDate(reportEntry.nextReportDate)}
									</span>
									<span className={styles.projectReportTextPreview}>
										{reportEntry.text}
									</span>
									<span className={styles.projectReportFilesCount}>
										{reportEntry.files.length
											? `${reportEntry.files.length} файл.`
											: "Нет файлов"}
									</span>
								</button>
							))}
						</div>
					</div>
				) : null}
			</div>
			<ProjectReportViewModal
				reportEntry={selectedReportEntry}
				onClose={() => setSelectedReportEntryId(null)}
				onFileDelete={onFileDelete}
				onFileDownload={onFileDownload}
				onUpdate={onUpdate}
			/>
		</section>
	);
};

const ProjectReportViewModal = ({
	onClose,
	onFileDelete,
	onFileDownload,
	onUpdate,
	reportEntry,
}: {
	onClose: () => void;
	onFileDelete: (
		reportEntry: ProjectReportEntry,
		file: ProjectReportEntryFile,
	) => void;
	onFileDownload: (
		reportEntry: ProjectReportEntry,
		file: ProjectReportEntryFile,
	) => void;
	onUpdate: (
		reportEntry: ProjectReportEntry,
		payload: UpdateProjectReportEntryPayload,
	) => Promise<void>;
	reportEntry: ProjectReportEntry | null;
}) => {
	const [isEditing, setIsEditing] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [draft, setDraft] = useState({
		authorName: "",
		nextReportDate: "",
		text: "",
	});

	useEffect(() => {
		if (!reportEntry) {
			return;
		}

		setDraft({
			authorName: reportEntry.authorName,
			nextReportDate: reportEntry.nextReportDate ?? "",
			text: reportEntry.text,
		});
		setError(null);
		setIsEditing(false);
	}, [reportEntry]);

	const handleSubmit = async () => {
		if (!reportEntry) {
			return;
		}

		const authorName = draft.authorName.trim();
		const text = draft.text.trim();

		if (!authorName || !text) {
			setError("Заполните автора и текст отчёта");
			return;
		}

		setIsSaving(true);
		setError(null);

		try {
			await onUpdate(reportEntry, {
				authorName,
				nextReportDate: draft.nextReportDate || null,
				text,
			});
			setIsEditing(false);
		} catch {
			setError("Не удалось сохранить отчёт");
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<Modal isOpen={Boolean(reportEntry)} onClose={onClose} size="covered">
			{reportEntry ? (
				<div className={`${styles.ganttFormModal} ${styles.projectReportModal}`}>
					<div className={styles.projectReportViewHeader}>
						<h3>Отчёт по проекту</h3>
						<button
							type="button"
							disabled={isSaving}
							onClick={() => setIsEditing((prev) => !prev)}
						>
							{isEditing ? "Отменить" : "Редактировать"}
						</button>
					</div>
					{isEditing ? (
						<div className={styles.projectReportEditForm}>
							<label>
								<span>Автор</span>
								<input
									type="text"
									value={draft.authorName}
									onChange={(event) =>
										setDraft((prev) => ({
											...prev,
											authorName: event.target.value,
										}))
									}
								/>
							</label>
							<label>
								<span>Дата следующего отчёта</span>
								<input
									type="date"
									value={draft.nextReportDate}
									onClick={(event) => event.currentTarget.showPicker?.()}
									onChange={(event) =>
										setDraft((prev) => ({
											...prev,
											nextReportDate: event.target.value,
										}))
									}
								/>
							</label>
							<label>
								<span>Текст отчёта</span>
								<textarea
									value={draft.text}
									onChange={(event) =>
										setDraft((prev) => ({
											...prev,
											text: event.target.value,
										}))
									}
								/>
							</label>
							{error ? <p className={styles.ganttFormError}>{error}</p> : null}
							<div className={styles.ganttFormActions}>
								<button
									type="button"
									disabled={isSaving}
									onClick={() => setIsEditing(false)}
								>
									Отмена
								</button>
								<button type="button" disabled={isSaving} onClick={handleSubmit}>
									{isSaving ? "Сохранение..." : "Сохранить"}
								</button>
							</div>
						</div>
					) : (
						<>
							<div className={styles.projectReportDetails}>
								<div>
									<span>Автор</span>
									<strong>{reportEntry.authorName}</strong>
								</div>
								<div>
									<span>Дата отчёта</span>
									<strong>
										{formatProjectReportDate(reportEntry.reportDate)}
									</strong>
								</div>
								<div>
									<span>Следующий отчёт</span>
									<strong>
										{formatProjectReportDate(reportEntry.nextReportDate)}
									</strong>
								</div>
							</div>
							<div className={styles.projectReportFullText}>
								<span>Текст отчёта</span>
								<p>{reportEntry.text}</p>
							</div>
						</>
					)}
					<div className={styles.projectReportFiles}>
						<strong>Файлы</strong>
						{reportEntry.files.length ? (
							reportEntry.files.map((file) => (
								<div key={file.id} className={styles.projectReportFileItem}>
									<span>
										{file.originalName}
										<small>{formatFileSize(file.size)}</small>
									</span>
									<div className={styles.projectReportFileActions}>
										<button
											type="button"
											onClick={() => onFileDownload(reportEntry, file)}
										>
											Скачать
										</button>
										<button
											type="button"
											onClick={() => onFileDelete(reportEntry, file)}
										>
											Удалить
										</button>
									</div>
								</div>
							))
						) : (
							<small>Файлы не прикреплены</small>
						)}
					</div>
				</div>
			) : null}
		</Modal>
	);
};

const ProjectReportCreateModal = ({
	authorName,
	error,
	fileDrafts,
	isOpen,
	isSaving,
	nextReportDate,
	onAuthorNameChange,
	onClose,
	onCreate,
	onFilesChange,
	onNextReportDateChange,
	onTextChange,
	text,
}: {
	authorName: string;
	error: string | null;
	fileDrafts: File[];
	isOpen: boolean;
	isSaving: boolean;
	nextReportDate: string;
	onAuthorNameChange: (value: string) => void;
	onClose: () => void;
	onCreate: () => void;
	onFilesChange: (files: File[]) => void;
	onNextReportDateChange: (value: string) => void;
	onTextChange: (value: string) => void;
	text: string;
}) => (
	<Modal isOpen={isOpen} onClose={onClose} size="small">
		<div className={`${styles.ganttFormModal} ${styles.projectReportModal}`}>
			<h3>Создать отчёт по проекту</h3>
			<div className={styles.projectReportComposer}>
				<label>
					<span>Автор отчёта</span>
					<input
						type="text"
						value={authorName}
						onChange={(event) => onAuthorNameChange(event.target.value)}
					/>
				</label>
				<label>
					<span>Текст отчёта</span>
					<textarea
						className={styles.projectReportTextarea}
						value={text}
						onChange={(event) => onTextChange(event.target.value)}
					/>
				</label>
				<div className={styles.projectReportMetaRow}>
					<label>
						<span>Дата следующего отчёта</span>
						<input
							type="date"
							value={nextReportDate}
							onClick={(event) => event.currentTarget.showPicker?.()}
							onChange={(event) =>
								onNextReportDateChange(event.target.value)
							}
						/>
					</label>
					<div className={styles.projectReportFilePicker}>
						<span>Файлы</span>
						<label className={projectReportsStyles.projectFileField}>
							<input
								type="file"
								multiple
								className={projectReportsStyles.projectFileInput}
								onChange={(event) =>
									onFilesChange(Array.from(event.target.files ?? []))
								}
							/>
							<strong className={projectReportsStyles.projectFileButton}>
								Выбрать файлы
							</strong>
							<em className={projectReportsStyles.projectFileName}>
								{fileDrafts.length
									? `Выбрано файлов: ${fileDrafts.length}`
									: "Файлы не выбраны"}
							</em>
						</label>
					</div>
				</div>
				{error ? <p className={styles.ganttFormError}>{error}</p> : null}
				<div className={styles.ganttFormActions}>
					<button type="button" disabled={isSaving} onClick={onClose}>
						Отмена
					</button>
					<button type="button" disabled={isSaving} onClick={onCreate}>
						{isSaving ? "Создание..." : "Создать отчёт"}
					</button>
				</div>
			</div>
		</div>
	</Modal>
);

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

const ReportProjectDetailsTab = ({
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

const ReportProjectSection = ({
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

const ReportProjectFileInput = ({
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

const ReportProjectInput = ({
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
