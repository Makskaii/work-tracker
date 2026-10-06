import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FaCalendarAlt, FaEllipsisH } from "react-icons/fa";
import { useNavigate } from "react-router";
import { EntityTypeIds } from "@/shared/constants/const";
import { ProjectCodes } from "@/components/calendar/constants/const";
import { useBitrixSlider } from "@/shared/hooks/useBitrixSlider";
import type { User } from "@/shared/types/types";
import type { Deal } from "../../types/deals.types";
import type { ActivityListItem } from "../../types/types";
import {
	calculatePaymentFields,
	DEFAULT_PAYMENT_FORM,
	type PaymentFormState,
	PaymentModal,
} from "./components/AutonomousProjectGantt";
import { ProfitabilitySkeleton } from "./components/ProfitabilitySkeleton";
import { ProjectReportsTab } from "./components/ProjectReportsTab";
import { ProjectsTab } from "./components/ProjectsTab";
import { ReportProjectDetailsTab } from "./components/ReportProjectDetailsTab";
import { ReportProjectModal } from "./components/ReportProjectModal";
import type { ProjectCreationMode } from "./components/ReportProjectLinkFields";
import { ReportsTab } from "./components/ReportsTab";
import { SummaryCards } from "./components/SummaryCards";
import { TasksTab } from "./components/TasksTab";
import {
	isAutonomousPaymentDueByCompletedStage,
	resolveAutonomousPaymentDates,
} from "./model/autonomousProjectGantt";
import { formatMoney } from "./model/profitabilityUtils";
import {
	fetchProjectGanttEvents,
	fetchProjectGanttStages,
} from "./model/projectGantt.api";
import { getProjectAutomaticHours } from "./model/projectHours";
import {
	createAutonomousProjectPayment,
	deleteAutonomousProjectPayment,
	fetchAutonomousProjectPayments,
	updateAutonomousProjectPayment,
} from "./model/projectPayments.api";
import {
	createProjectReportEntry,
	createReportProject,
	deleteProjectReportEntry,
	deleteProjectReportEntryFile,
	deleteReportProject,
	deleteReportProjectFile,
	downloadProjectReportEntryFile,
	downloadReportProjectFile,
	fetchProjectReportEntries,
	fetchReportProjects,
	updateProjectReportEntry,
	updateReportProject,
	uploadProjectReportEntryFile,
	uploadReportProjectFile,
} from "./model/projectReports.api";
import {
	DEFAULT_REPORT_PROJECT_FORM,
	getProjectSummaryForm,
	getReportProjectForm,
	getReportProjectPayload,
	getReportProjectSaveError,
	validateReportProjectLink,
	numberOrNull,
	type ProjectSummaryFormState,
	projectStatusOptions,
	type ReportProjectFileDrafts,
	type ReportProjectFormState,
} from "./model/reportProjectForm";
import { formatProjectReportDate } from "./model/reportProjectFormat";
import type {
	AutonomousProjectPayment,
	CreateProjectReportEntryPayload,
	FinancialProjectSummary,
	ProfitabilityProject,
	ProjectGanttEvent,
	ProjectGanttStage,
	ProjectReportEntry,
	ProjectReportEntryFile,
	ReportProject,
	ReportProjectFile,
	ReportProjectFileKind,
	ReportProjectStatus,
	SalesProfitabilityTab,
	UpdateProjectReportEntryPayload,
} from "./model/types";
import {
	fetchProfitabilityProjectDetails,
	useCompanyProjects,
} from "./model/useCompanyProjects";
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

const getReportProjectStatusClassName = (
	status: ReportProjectStatus | null | undefined,
) => {
	switch (status) {
		case "in_progress":
			return styles.ganttGroupStatusInProgress;
		case "inactive":
			return styles.ganttGroupStatusInactive;
		case "completed":
			return styles.ganttGroupStatusCompleted;
		default:
			return styles.ganttGroupStatusNotStarted;
	}
};

const getReportProjectStatusLabel = (
	status: ReportProjectStatus | null | undefined,
) =>
	projectStatusOptions.find(
		(option) => option.value === (status ?? "not_started"),
	)?.label ?? "Не начат";

const REPORT_PROJECT_STATUS_ORDER: Record<ReportProjectStatus, number> = {
	in_progress: 0,
	not_started: 1,
	inactive: 2,
	completed: 3,
};

const REPORT_PROJECT_STATUS_FILTERS: Array<{
	label: string;
	value: "all" | ReportProjectStatus;
}> = [
	{ label: "Все", value: "all" },
	{ label: "В работе", value: "in_progress" },
	{ label: "Не начат", value: "not_started" },
	{ label: "Неактивен", value: "inactive" },
	{ label: "Завершён", value: "completed" },
];

const getReportProjectStatusOrder = (
	status: ReportProjectStatus | null | undefined,
) => REPORT_PROJECT_STATUS_ORDER[status ?? "not_started"];

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

const paymentStatusLabels = {
	paid: "оплачено",
	todo: "неоплачено",
	debt: "неоплачено",
	canceled: "неоплачено",
} as const;

type PaymentsScope = "all" | "client" | "project";
type PaymentChartScale = "year" | "halfYear" | "month";

type AutonomousProjectData = {
	events: ProjectGanttEvent[];
	payments: AutonomousProjectPayment[];
	stages: ProjectGanttStage[];
};

const paymentsScopeLabels: Record<PaymentsScope, string> = {
	all: "Все проекты",
	project: "Проект",
	client: "Компания клиента",
};

const getDbProjectId = (project: ReportProject) => `db-${project.id}`;

const normalizeProjectTitle = (title: string) => title.trim().toLowerCase();
const normalizeProjectId = (value: string | number | null | undefined) =>
	String(value ?? "").trim();
const normalizeResponsibleName = (value: string | null | undefined) =>
	String(value ?? "")
		.trim()
		.toLowerCase();

const getProjectResponsibleUser = (
	project: ReportProject,
	users: User[],
): User | undefined => {
	const responsibleId = normalizeProjectId(project.responsibleId);

	if (responsibleId) {
		return users.find((user) => normalizeProjectId(user.id) === responsibleId);
	}

	const responsible = normalizeResponsibleName(project.responsible);

	if (!responsible) {
		return undefined;
	}

	return users.find(
		(user) => normalizeResponsibleName(user.title) === responsible,
	);
};

const getProjectResponsibleGroup = (project: ReportProject, users: User[]) => {
	const responsibleUser = getProjectResponsibleUser(project, users);
	const fallbackTitle = String(project.responsible ?? "").trim();
	const title = responsibleUser?.title?.trim() || fallbackTitle;

	if (!title) {
		return {
			isEmpty: true,
			key: "empty",
			sortTitle: "",
			title: "Без ответственного",
		};
	}

	return {
		isEmpty: false,
		key:
			normalizeProjectId(responsibleUser?.id) ||
			normalizeResponsibleName(title),
		sortTitle: title,
		title,
	};
};

const isProjectResponsibleMatched = (
	project: ReportProject,
	user: User | undefined,
	selectedUserId: string,
) => {
	if (!selectedUserId || !user) {
		return true;
	}

	const responsibleId = normalizeProjectId(project.responsibleId);

	if (responsibleId) {
		return responsibleId === selectedUserId;
	}

	return (
		normalizeResponsibleName(project.responsible) ===
		normalizeResponsibleName(user.title)
	);
};

const mergeReportProjectFiles = (
	files: ReportProjectFile[] = [],
	updatedFiles: ReportProjectFile[],
) => {
	const result = new Map<number, ReportProjectFile>();

	files.forEach((file) => result.set(file.id, file));
	updatedFiles.forEach((file) => result.set(file.id, file));

	return Array.from(result.values());
};

const getNextProjectReportDate = (reports: ProjectReportEntry[]) => {
	const latestReport = [...reports].sort((left, right) => {
		const reportDateCompare = String(right.reportDate ?? "").localeCompare(
			String(left.reportDate ?? ""),
		);

		if (reportDateCompare !== 0) {
			return reportDateCompare;
		}

		const createdAtCompare = String(right.createdAt ?? "").localeCompare(
			String(left.createdAt ?? ""),
		);

		if (createdAtCompare !== 0) {
			return createdAtCompare;
		}

		return Number(right.id) - Number(left.id);
	})[0];

	return latestReport?.nextReportDate ?? null;
};

const isProjectReportDateOverdue = (date: string | null | undefined) => {
	if (!date) {
		return false;
	}

	return date < new Date().toISOString().slice(0, 10);
};

const getPaymentMonthKey = (date: Date) =>
	`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const getPaymentDayKey = (date: Date) =>
	`${getPaymentMonthKey(date)}-${String(date.getDate()).padStart(2, "0")}`;

const getPaymentMonthKeyTime = (key: string) => {
	const [year, month] = key.split("-").map(Number);
	const date = new Date(year, month - 1, 1);

	return Number.isNaN(date.getTime())
		? Number.POSITIVE_INFINITY
		: date.getTime();
};

const getPaymentDayKeyTime = (key: string) => {
	const [year, month, day] = key.split("-").map(Number);
	const date = new Date(year, month - 1, day);

	return Number.isNaN(date.getTime())
		? Number.POSITIVE_INFINITY
		: date.getTime();
};

const formatPaymentMonthLabel = (date: Date) =>
	new Intl.DateTimeFormat("ru-RU", {
		month: "short",
		year: "2-digit",
	})
		.format(date)
		.replace(".", "");

const formatPaymentDayLabel = (date: Date) =>
	new Intl.DateTimeFormat("ru-RU", {
		day: "2-digit",
		month: "2-digit",
	}).format(date);

const getPaymentMonthDate = (key: string) => {
	const [year, month] = key.split("-").map(Number);
	const date = new Date(year, month - 1, 1);

	return Number.isNaN(date.getTime()) ? null : date;
};

const paymentChartScaleLabels: Record<PaymentChartScale, string> = {
	year: "Год",
	halfYear: "Полгода",
	month: "Месяц",
};

const getAutonomousPaymentStatusClassName = (
	status: AutonomousProjectPayment["status"],
	isDueByCompletedStage = false,
) => {
	if (status === "paid") return styles.paymentPaid;
	if (isDueByCompletedStage) return styles.paymentDue;

	return styles.paymentCanceled;
};

const getAutonomousPaymentAmount = (payment: AutonomousProjectPayment) =>
	payment.amount ?? 0;

const getPaymentsScopeProjects = (
	projects: ReportProject[],
	scope: PaymentsScope,
	selectedProject: ReportProject | null,
) => {
	if (scope === "all") {
		return projects;
	}

	if (!selectedProject) {
		return [];
	}

	if (scope === "project") {
		return [selectedProject];
	}

	if (scope === "client") {
		const selectedClientCompany = String(
			selectedProject.clientCompany ?? "",
		).trim();

		if (!selectedClientCompany) {
			return [selectedProject];
		}

		return projects.filter(
			(project) =>
				String(project.clientCompany ?? "").trim() === selectedClientCompany,
		);
	}

	return projects;
};

const getReportProjectSummary = (
	project: ReportProject | null | undefined,
): FinancialProjectSummary => ({
	factHours: project?.summaryFactHours ?? 0,
	companyHours: 0,
	lossHours: project?.summaryLossHours ?? 0,
	marginPercent: project?.summaryMarginPercent ?? 0,
	profit: 0,
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
	void deals;
	const navigate = useNavigate();

	const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
		null,
	);
	const [activeTab, setActiveTab] = useState<SalesProfitabilityTab>("projects");
	const [isStructureCollapsed, setIsStructureCollapsed] = useState(false);
	const [isStructureTransitioning, setIsStructureTransitioning] =
		useState(false);
	const [reportProjects, setReportProjects] = useState<ReportProject[]>([]);
	const [editingReportProject, setEditingReportProject] =
		useState<ReportProject | null>(null);
	const [projectForm, setProjectForm] = useState<ReportProjectFormState>(
		DEFAULT_REPORT_PROJECT_FORM,
	);
	const [projectCreationMode, setProjectCreationMode] = useState<ProjectCreationMode>("new");
	const creationRequestIdRef = useRef<string | undefined>(undefined);
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
	const [projectReportEntries, setProjectReportEntries] = useState<
		ProjectReportEntry[]
	>([]);
	const [isProjectReportsLoading, setIsProjectReportsLoading] = useState(false);
	const [projectReportsError, setProjectReportsError] = useState<string | null>(
		null,
	);
	const [projectReportAuthorId, setProjectReportAuthorId] = useState<
		string | null
	>(null);
	const [projectReportAuthorName, setProjectReportAuthorName] = useState("");
	const [projectReportText, setProjectReportText] = useState("");
	const [projectReportNextDate, setProjectReportNextDate] = useState("");
	const [projectReportFileDrafts, setProjectReportFileDrafts] = useState<
		File[]
	>([]);
	const [isProjectReportModalOpen, setIsProjectReportModalOpen] =
		useState(false);
	const [isProjectReportSaving, setIsProjectReportSaving] = useState(false);
	const [autonomousPayments, setAutonomousPayments] = useState<
		AutonomousProjectPayment[]
	>([]);
	const [autonomousPaymentStages, setAutonomousPaymentStages] = useState<
		ProjectGanttStage[]
	>([]);
	const [autonomousPaymentEvents, setAutonomousPaymentEvents] = useState<
		ProjectGanttEvent[]
	>([]);
	const [isAutonomousPaymentsLoading, setIsAutonomousPaymentsLoading] =
		useState(false);
	const [autonomousPaymentsError, setAutonomousPaymentsError] = useState<
		string | null
	>(null);
	const [paymentsScope, setPaymentsScope] = useState<PaymentsScope>("project");
	const [paymentForm, setPaymentForm] =
		useState<PaymentFormState>(DEFAULT_PAYMENT_FORM);
	const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
	const [deletingPaymentId, setDeletingPaymentId] = useState<number | null>(
		null,
	);
	const [paymentsRefreshKey, setPaymentsRefreshKey] = useState(0);
	const autonomousProjectDataCacheRef = useRef(
		new Map<string, AutonomousProjectData>(),
	);
	const [isReportProjectModalOpen, setIsReportProjectModalOpen] =
		useState(false);
	const [isReportProjectDrawer, setIsReportProjectDrawer] = useState(false);
	const [isReportProjectsLoading, setIsReportProjectsLoading] = useState(false);
	const [projectFormError, setProjectFormError] = useState<string | null>(null);
	const [isReportProjectSaving, setIsReportProjectSaving] = useState(false);
	const [projectSearchQuery, setProjectSearchQuery] = useState("");
	const [selectedProjectStatusFilter, setSelectedProjectStatusFilter] =
		useState<"all" | ReportProjectStatus>("all");
	const [selectedResponsibleFilter, setSelectedResponsibleFilter] =
		useState<string>("");
	const [isResponsibleFilterOpen, setIsResponsibleFilterOpen] = useState(false);
	const [deletingReportProjectId, setDeletingReportProjectId] = useState<
		number | null
	>(null);
	const [bitrixProjectDetailsById, setBitrixProjectDetailsById] = useState(
		() => new Map<string, ProfitabilityProject>(),
	);
	const [isBitrixProjectDetailsLoading, setIsBitrixProjectDetailsLoading] =
		useState(false);
	const [bitrixProjectDetailsError, setBitrixProjectDetailsError] = useState<
		string | null
	>(null);
	const [bitrixProjectDetailsRetryKey, setBitrixProjectDetailsRetryKey] =
		useState(0);
	const { openTask } = useBitrixSlider();
	const {
		companyTitleById,
		projects: bitrixProjects,
		isLoadingDetails: isBitrixProjectsLoading,
		error: bitrixProjectsError,
		reloadProjects: reloadBitrixProjects,
	} = useCompanyProjects();
	const selectedReportProject =
		reportProjects.find(
			(project) => getDbProjectId(project) === selectedProjectId,
		) ?? null;
	const selectedReportProjectId = selectedReportProject?.id ?? null;
	const paymentsScopeProjects = useMemo(
		() =>
			getPaymentsScopeProjects(
				reportProjects,
				paymentsScope,
				selectedReportProject,
			),
		[paymentsScope, reportProjects, selectedReportProject],
	);

	const updateProjectNextReportDate = useCallback(
		(projectId: number, reports: ProjectReportEntry[]) => {
			const nextProjectReportDate = getNextProjectReportDate(reports);

			setReportProjects((prev) =>
				prev.map((project) =>
					project.id === projectId
						? {
								...project,
								nextProjectReportDate,
							}
						: project,
				),
			);
		},
		[],
	);

	const loadProjectReportEntries = useCallback(
		async (projectId: number, signal?: AbortSignal) => {
			const reports = await fetchProjectReportEntries(projectId, signal);

			setProjectReportEntries(reports);
			updateProjectNextReportDate(projectId, reports);

			return reports;
		},
		[updateProjectNextReportDate],
	);

	const refreshSelectedProjectReports = useCallback(async () => {
		if (!selectedReportProjectId) {
			return;
		}

		await loadProjectReportEntries(selectedReportProjectId);
	}, [loadProjectReportEntries, selectedReportProjectId]);

	useEffect(() => {
		setDetailsProjectForm(getReportProjectForm(selectedReportProject));
		setSummaryForm(getProjectSummaryForm(selectedReportProject));
		setDetailsFileDrafts({});
		setDetailsProjectError(null);
	}, [selectedReportProject]);

	useEffect(() => {
		setProjectReportAuthorName("");
		setProjectReportText("");
		setProjectReportNextDate("");
		setProjectReportFileDrafts([]);
		setProjectReportsError(null);

		if (activeTab !== "projectReports" || !selectedReportProjectId) {
			setProjectReportEntries([]);
			return;
		}

		const controller = new AbortController();

		setIsProjectReportsLoading(true);
		loadProjectReportEntries(selectedReportProjectId, controller.signal)
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
	}, [activeTab, loadProjectReportEntries, selectedReportProjectId]);

	useEffect(() => {
		void paymentsRefreshKey;

		if (
			activeTab !== "marginality" ||
			(!selectedReportProjectId && paymentsScope !== "all")
		) {
			setAutonomousPayments([]);
			setAutonomousPaymentStages([]);
			setAutonomousPaymentEvents([]);
			setIsAutonomousPaymentsLoading(false);
			setAutonomousPaymentsError(null);
			return;
		}

		const controller = new AbortController();
		const paymentProjectIds = paymentsScopeProjects.map((project) =>
			String(project.id),
		);
		const cachedProjectData = paymentProjectIds
			.map((projectId) => autonomousProjectDataCacheRef.current.get(projectId))
			.filter((item): item is AutonomousProjectData => Boolean(item));
		const missingProjectIds = paymentProjectIds.filter(
			(projectId) => !autonomousProjectDataCacheRef.current.has(projectId),
		);

		setIsAutonomousPaymentsLoading(true);
		setAutonomousPaymentsError(null);

		if (!missingProjectIds.length) {
			setAutonomousPayments(cachedProjectData.flatMap((item) => item.payments));
			setAutonomousPaymentStages(
				cachedProjectData.flatMap((item) => item.stages),
			);
			setAutonomousPaymentEvents(
				cachedProjectData.flatMap((item) => item.events),
			);
			setIsAutonomousPaymentsLoading(false);
			return;
		}

		Promise.all(
			missingProjectIds.map(async (paymentProjectId) => {
				const [payments, stages, events] = await Promise.all([
					fetchAutonomousProjectPayments(paymentProjectId, controller.signal),
					fetchProjectGanttStages(paymentProjectId, controller.signal),
					fetchProjectGanttEvents(paymentProjectId, controller.signal),
				]);

				return {
					events,
					payments,
					projectId: paymentProjectId,
					stages,
				};
			}),
		)
			.then((loadedProjectData) => {
				loadedProjectData.forEach(({ projectId, ...projectData }) => {
					autonomousProjectDataCacheRef.current.set(projectId, projectData);
				});

				const nextProjectData = paymentProjectIds
					.map((projectId) =>
						autonomousProjectDataCacheRef.current.get(projectId),
					)
					.filter((item): item is AutonomousProjectData => Boolean(item));

				setAutonomousPayments(nextProjectData.flatMap((item) => item.payments));
				setAutonomousPaymentStages(
					nextProjectData.flatMap((item) => item.stages),
				);
				setAutonomousPaymentEvents(
					nextProjectData.flatMap((item) => item.events),
				);
			})
			.catch(() => {
				if (!controller.signal.aborted) {
					setAutonomousPaymentsError("Не удалось загрузить платежи проекта");
				}
			})
			.finally(() => {
				if (!controller.signal.aborted) {
					setIsAutonomousPaymentsLoading(false);
				}
			});

		return () => controller.abort();
	}, [
		activeTab,
		paymentsScope,
		paymentsRefreshKey,
		paymentsScopeProjects,
		selectedReportProjectId,
	]);

	const effectiveSelectedProjectId = selectedReportProject
		? getDbProjectId(selectedReportProject)
		: null;

	const summary = getReportProjectSummary(selectedReportProject);
	const isBusy =
		loading ||
		isReportProjectsLoading ||
		isBitrixProjectsLoading ||
		isBitrixProjectDetailsLoading;
	const selectedBitrixProjects = useMemo(
		() =>
			selectedReportProject
				? bitrixProjects.filter((project) => {
						const bitrixProjectId = normalizeProjectId(
							project.projectId ?? project.id,
						);
						const selectedBitrixProjectId = normalizeProjectId(
							selectedReportProject.bitrixProjectId,
						);

						if (selectedBitrixProjectId) {
							return bitrixProjectId === selectedBitrixProjectId;
						}

						return (
							normalizeProjectTitle(project.title ?? "") ===
							normalizeProjectTitle(selectedReportProject.title)
						);
					})
				: [],
		[bitrixProjects, selectedReportProject],
	);
	const selectedBitrixProjectIds = useMemo(
		() =>
			selectedBitrixProjects
				.map((project) => normalizeProjectId(project.projectId ?? project.id))
				.filter(Boolean),
		[selectedBitrixProjects],
	);
	const isBitrixProjectLinkMissing = Boolean(
		selectedReportProject && !selectedBitrixProjects.length,
	);
	const projectMetricsError =
		bitrixProjectDetailsError ??
		(isBitrixProjectLinkMissing
			? selectedReportProject?.bitrixProjectId
				? "Связанный проект Битрикс24 не найден. Проверьте привязку в деталях проекта."
				: "Выберите связанный проект Битрикс24 в деталях проекта, чтобы загрузить задачи и ежедневные отчёты."
			: null);
	const projectMetricsActionLabel = isBitrixProjectLinkMissing
		? "Открыть детали проекта"
		: "Повторить загрузку";
	const handleProjectMetricsRetry = () => {
		if (isBitrixProjectLinkMissing) {
			setActiveTab("projectDetails");
		} else {
			setBitrixProjectDetailsRetryKey((key) => key + 1);
		}
	};
	const shouldLoadBitrixProjectDetails =
		activeTab === "projects" ||
		activeTab === "tasks" ||
		activeTab === "reports";
	const selectedBitrixProjectsWithDetails = useMemo(
		() =>
			selectedBitrixProjects.map((project) => {
				const projectId = normalizeProjectId(project.projectId ?? project.id);

				return bitrixProjectDetailsById.get(projectId) ?? project;
			}),
		[bitrixProjectDetailsById, selectedBitrixProjects],
	);
	const automaticProjectHours = useMemo(
		() => getProjectAutomaticHours(selectedBitrixProjectsWithDetails),
		[selectedBitrixProjectsWithDetails],
	);
	const displayedSummary = useMemo(
		() => ({
			...summary,
			purchasedHours: automaticProjectHours.developmentPurchasedHours,
			factHours:
				(numberOrNull(summaryForm.summaryFactHours) ?? 0) +
				automaticProjectHours.developmentFactHours,
		}),
		[automaticProjectHours, summary, summaryForm.summaryFactHours],
	);
	const allTasks = selectedBitrixProjectsWithDetails.flatMap((project) =>
		project.tasks.map((task) => ({ project, task })),
	);
	const allReports = selectedBitrixProjectsWithDetails.flatMap((project) =>
		project.reports.map((report) => ({ project, report })),
	);
	const normalizedProjectSearchQuery = projectSearchQuery.trim().toLowerCase();
	const responsibleFilterUsers = users.filter((user) =>
		String(user.title ?? "").trim(),
	);
	const selectedResponsibleUser = selectedResponsibleFilter
		? responsibleFilterUsers.find(
				(user) => normalizeProjectId(user.id) === selectedResponsibleFilter,
			)
		: undefined;
	const visibleReportProjects = reportProjects.filter((project) => {
		const matchesResponsible = isProjectResponsibleMatched(
			project,
			selectedResponsibleUser,
			selectedResponsibleFilter,
		);
		const matchesSearch = normalizedProjectSearchQuery
			? project.title.toLowerCase().includes(normalizedProjectSearchQuery)
			: true;

		return matchesResponsible && matchesSearch;
	});
	const reportProjectStatusCounts = visibleReportProjects.reduce(
		(counts, project) => {
			counts[project.projectStatus ?? "not_started"] += 1;
			return counts;
		},
		{
			all: visibleReportProjects.length,
			not_started: 0,
			in_progress: 0,
			inactive: 0,
			completed: 0,
		} as Record<"all" | ReportProjectStatus, number>,
	);
	const filteredReportProjects = visibleReportProjects.filter(
		(project) =>
			selectedProjectStatusFilter === "all" ||
			(project.projectStatus ?? "not_started") === selectedProjectStatusFilter,
	);
	const visibleReportProjectGroups = Array.from(
		[...filteredReportProjects]
			.sort(
				(left, right) =>
					getReportProjectStatusOrder(left.projectStatus) -
					getReportProjectStatusOrder(right.projectStatus),
			)
			.reduce(
				(groups, project) => {
					const group = getProjectResponsibleGroup(project, users);
					const existingGroup = groups.get(group.key);

					if (existingGroup) {
						existingGroup.projects.push(project);
					} else {
						groups.set(group.key, { ...group, projects: [project] });
					}

					return groups;
				},
				new Map<
					string,
					ReturnType<typeof getProjectResponsibleGroup> & {
						projects: ReportProject[];
					}
				>(),
			)
			.values(),
	).sort((left, right) => {
		if (left.isEmpty !== right.isEmpty) {
			return left.isEmpty ? 1 : -1;
		}

		return left.sortTitle.localeCompare(right.sortTitle, "ru");
	});
	const companyOptions = useMemo(
		() =>
			Array.from(companyTitleById.entries()).map(([id, title]) => ({
				id,
				title,
			})),
		[companyTitleById],
	);
	const bitrixProjectOptions = useMemo(
		() =>
			bitrixProjects.map((project) => {
				const id = normalizeProjectId(project.projectId ?? project.id);
				const title = String(project.title ?? `Проект #${id}`).trim();
				const companyId = String(project[ProjectCodes.company] ?? "").trim();
				const companyTitle = companyTitleById.get(companyId) ?? "";

				return {
					id,
					title: `${title}${companyTitle ? ` · ${companyTitle}` : ""} · #${id}`,
					value: title,
					companyId,
					companyTitle,
					projectGoal: String(project[ProjectCodes.goal] ?? "").trim(),
				};
			}),
		[bitrixProjects, companyTitleById],
	);

	const initialDetailsProjectForm = useMemo(
		() => getReportProjectForm(selectedReportProject),
		[selectedReportProject],
	);

	const isDetailsProjectDirty =
		JSON.stringify(detailsProjectForm) !==
		JSON.stringify(initialDetailsProjectForm);

	const hasDetailsFileDrafts = Object.values(detailsFileDrafts).some((value) =>
		Array.isArray(value) ? value.length > 0 : Boolean(value),
	);

	const shouldShowDetailsSave =
		Boolean(selectedReportProject) &&
		(isDetailsProjectDirty || hasDetailsFileDrafts);
	const selectReportProject = (project: ReportProject) => {
		setSelectedProjectId(getDbProjectId(project));
	};

	useEffect(() => {
		void bitrixProjectDetailsRetryKey;
		setBitrixProjectDetailsError(null);
		if (!shouldLoadBitrixProjectDetails || !selectedBitrixProjectIds.length) {
			setIsBitrixProjectDetailsLoading(false);
			return;
		}

		const missingProjects = selectedBitrixProjects.filter((project) => {
			const projectId = normalizeProjectId(project.projectId ?? project.id);

			return projectId && !bitrixProjectDetailsById.has(projectId);
		});

		if (!missingProjects.length) {
			setIsBitrixProjectDetailsLoading(false);
			return;
		}

		const controller = new AbortController();

		setIsBitrixProjectDetailsLoading(true);

		Promise.all(
			missingProjects.map((project) =>
				fetchProfitabilityProjectDetails(project, controller.signal),
			),
		)
			.then((projects) => {
				if (controller.signal.aborted) {
					return;
				}

				setBitrixProjectDetailsById((prev) => {
					const next = new Map(prev);

					projects.forEach((project) => {
						const projectId = normalizeProjectId(
							project.projectId ?? project.id,
						);

						if (projectId) {
							next.set(projectId, project);
						}
					});

					return next;
				});
			})
			.catch((error) => {
				if (!controller.signal.aborted) {
					setBitrixProjectDetailsError(
						"Не удалось загрузить задачи и ежедневные отчёты из Битрикс24. Показатели недоступны.",
					);
					console.error(
						"Failed to fetch selected Bitrix project details",
						error,
					);
				}
			})
			.finally(() => {
				if (!controller.signal.aborted) {
					setIsBitrixProjectDetailsLoading(false);
				}
			});

		return () => controller.abort();
	}, [
		bitrixProjectDetailsRetryKey,
		bitrixProjectDetailsById,
		selectedBitrixProjectIds,
		selectedBitrixProjects,
		shouldLoadBitrixProjectDetails,
	]);

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
		setIsReportProjectDrawer(false);
		setEditingReportProject(null);
		setProjectCreationMode("new");
		creationRequestIdRef.current = crypto.randomUUID();
		setProjectForm(DEFAULT_REPORT_PROJECT_FORM);
		setProjectFileDrafts({});
		setProjectFormError(null);
		setDeletingReportProjectId(null);
		setIsReportProjectModalOpen(true);
	};

	const openReportProjectEditModal = (
		project: ReportProject,
		asDrawer = false,
	) => {
		setIsReportProjectDrawer(asDrawer);
		setEditingReportProject(project);
		setProjectForm(getReportProjectForm(project));
		setProjectFileDrafts({});
		setProjectFormError(null);
		setDeletingReportProjectId(null);
		setIsReportProjectModalOpen(true);
	};

	const uploadSelectedReportProjectFiles = async (projectId: number) => {
		const entries = Object.entries(projectFileDrafts) as Array<
			[ReportProjectFileKind, File[] | undefined]
		>;
		const selectedEntries = entries.filter(
			(entry): entry is [ReportProjectFileKind, File[]] =>
				Boolean(entry[1] && entry[1].length),
		);

		if (!selectedEntries.length) {
			return [];
		}

		const uploadedFiles: ReportProjectFile[] = [];

		for (const [fileKind, files] of selectedEntries) {
			for (const file of files) {
				uploadedFiles.push(
					await uploadReportProjectFile(projectId, fileKind, file),
				);
			}
		}

		return uploadedFiles;
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
			authorId: projectReportAuthorId,
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

			await loadProjectReportEntries(selectedReportProject.id);
			setProjectReportAuthorId(null);
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

		await updateProjectReportEntry(
			selectedReportProject.id,
			reportEntry.id,
			payload,
		);

		await loadProjectReportEntries(selectedReportProject.id);
	};

	const handleProjectReportDelete = async (reportEntry: ProjectReportEntry) => {
		if (!selectedReportProject) {
			return;
		}

		await deleteProjectReportEntry(selectedReportProject.id, reportEntry.id);

		await loadProjectReportEntries(selectedReportProject.id);
	};

	const refreshAutonomousPayments = () => {
		autonomousProjectDataCacheRef.current.clear();
		setPaymentsRefreshKey((prev) => prev + 1);
	};

	const openPaymentCreateModal = () => {
		const defaultStage =
			autonomousPaymentStages.find((stage) => stage.code !== "payments") ??
			null;

		setPaymentForm({
			...DEFAULT_PAYMENT_FORM,
			paymentDate: "",
			stageId: defaultStage?.id ?? null,
		});
		setDeletingPaymentId(null);
		setIsPaymentModalOpen(true);
	};

	const openPaymentEditModal = (payment: AutonomousProjectPayment) => {
		const paymentProject = reportProjects.find(
			(project) => String(project.id) === String(payment.projectId),
		);
		if (!paymentProject) {
			return;
		}
		setSelectedProjectId(getDbProjectId(paymentProject));
		setPaymentForm({
			amount: payment.amount === null ? "" : String(payment.amount),
			id: payment.id,
			paymentAnchor: payment.paymentAnchor ?? "stage_end",
			paymentDate: payment.paymentDate ?? "",
			percent: payment.percent === null ? "" : String(payment.percent),
			stageId: payment.stageId,
			status: payment.status,
			waitingDays:
				payment.waitingDays === null ? "" : String(payment.waitingDays),
		});
		setDeletingPaymentId(null);
		setIsPaymentModalOpen(true);
	};

	const handlePaymentSubmit = async (
		submittedPaymentForm: PaymentFormState,
	) => {
		setPaymentForm(submittedPaymentForm);

		if (!selectedReportProjectId || !submittedPaymentForm.stageId) {
			return;
		}

		const calculatedPaymentFields = calculatePaymentFields({
			amount: submittedPaymentForm.amount,
			percent: submittedPaymentForm.percent,
			projectAmount: selectedReportProject?.projectAmount,
			source: submittedPaymentForm.amount ? "amount" : "percent",
		});

		const payload = {
			amount: numberOrNull(calculatedPaymentFields.amount),
			paymentAnchor: submittedPaymentForm.paymentAnchor,
			paymentDate: null,
			percent: numberOrNull(calculatedPaymentFields.percent),
			stageId: submittedPaymentForm.stageId,
			status: submittedPaymentForm.status,
			waitingDays: numberOrNull(submittedPaymentForm.waitingDays),
		};

		if (submittedPaymentForm.id) {
			await updateAutonomousProjectPayment(submittedPaymentForm.id, payload);
		} else {
			const selectedProjectPaymentsCount = autonomousPayments.filter(
				(payment) =>
					String(payment.projectId) === String(selectedReportProjectId),
			).length;

			await createAutonomousProjectPayment(String(selectedReportProjectId), {
				...payload,
				sortOrder: selectedProjectPaymentsCount,
			});
		}

		setIsPaymentModalOpen(false);
		refreshAutonomousPayments();
	};

	const handlePaymentDelete = async () => {
		if (!paymentForm.id) {
			return;
		}

		if (deletingPaymentId !== paymentForm.id) {
			setDeletingPaymentId(paymentForm.id);
			return;
		}

		await deleteAutonomousProjectPayment(paymentForm.id);
		setDeletingPaymentId(null);
		setIsPaymentModalOpen(false);
		refreshAutonomousPayments();
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

		await loadProjectReportEntries(selectedReportProject.id);
	};

	const uploadProjectReportFiles = async (
		reportEntry: ProjectReportEntry,
		files: File[],
	) => {
		if (!selectedReportProject || !files.length) {
			return;
		}

		await Promise.all(
			files.map((file) =>
				uploadProjectReportEntryFile(
					selectedReportProject.id,
					reportEntry.id,
					file,
				),
			),
		);

		await loadProjectReportEntries(selectedReportProject.id);
	};

	const handleReportProjectSubmit = async () => {
		if (!projectForm.title.trim()) {
			setProjectFormError("Заполните название проекта");
			return;
		}

		const linkError = validateReportProjectLink(projectForm, {
			isCreating: !editingReportProject,
			creationMode: projectCreationMode,
			previouslyLinked: Boolean(editingReportProject?.bitrixProjectId),
		});
		if (linkError) {
			setProjectFormError(linkError);
			return;
		}

		const payload = getReportProjectPayload(projectForm);

		setIsReportProjectSaving(true);
		setProjectFormError(null);
		let projectSaved = false;
		const rememberSavedProject = (project: ReportProject) => {
			setReportProjects((prev) => prev.some((item) => item.id === project.id)
				? prev.map((item) => item.id === project.id ? project : item)
				: [...prev, project]);
			setEditingReportProject(project);
			setProjectForm(getReportProjectForm(project));
		};

		try {
			let savedProject: ReportProject;

			if (editingReportProject) {
				savedProject = await updateReportProject(
					editingReportProject.id,
					payload,
				);
			} else {
				savedProject = await createReportProject(payload, creationRequestIdRef.current);
			}

			// Project creation has already committed. A later attachment failure
			// must retry this project via PATCH, rather than repeat its POST.
			rememberSavedProject(savedProject);
			projectSaved = true;
			if (!editingReportProject) {
				setSelectedProjectId(getDbProjectId(savedProject));
				reloadBitrixProjects();
			}

			const uploadedFiles = await uploadSelectedReportProjectFiles(
				savedProject.id,
			);

			if (uploadedFiles.length) {
				savedProject = {
					...savedProject,
					files: mergeReportProjectFiles(savedProject.files, uploadedFiles),
				};
			}

			rememberSavedProject(savedProject);
			setProjectFileDrafts({});
			setIsReportProjectModalOpen(false);
		} catch (error) {
			setProjectFormError(projectSaved
				? `Проект сохранён. ${getReportProjectSaveError(error, "Не удалось загрузить файлы. Повторите сохранение.")}`
				: getReportProjectSaveError(error));
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

		const linkError = validateReportProjectLink(detailsProjectForm, {
			isCreating: false,
			previouslyLinked: Boolean(selectedReportProject.bitrixProjectId),
		});
		if (linkError) {
			setDetailsProjectError(linkError);
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
				[ReportProjectFileKind, File[] | undefined]
			>;

			const selectedEntries = entries.filter(
				(entry): entry is [ReportProjectFileKind, File[]] =>
					Boolean(entry[1] && entry[1].length),
			);

			if (selectedEntries.length) {
				const uploadedFiles: ReportProjectFile[] = [];

				for (const [fileKind, files] of selectedEntries) {
					for (const file of files) {
						uploadedFiles.push(
							await uploadReportProjectFile(
								selectedReportProject.id,
								fileKind,
								file,
							),
						);
					}
				}

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
		} catch (error) {
			setDetailsProjectError(getReportProjectSaveError(error));
		} finally {
			setIsDetailsProjectSaving(false);
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
					} ${isStructureTransitioning ? styles.layoutTransitioning : ""}`}
					onTransitionEnd={(event) => {
						if (
							event.target === event.currentTarget &&
							event.propertyName === "grid-template-columns"
						) {
							setIsStructureTransitioning(false);
						}
					}}
				>
					<aside className={styles.structure}>
						<div className={styles.structureHeader}>
							<button
								type="button"
								className={styles.structureToggle}
								onClick={() => {
									setIsStructureTransitioning(true);
									setIsStructureCollapsed((prev) => !prev);
								}}
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
							<div className={styles.responsibleFilter}>
								<button
									type="button"
									className={styles.responsibleFilterButton}
									onClick={() => setIsResponsibleFilterOpen((prev) => !prev)}
									title="Фильтр по ответственному"
								>
									<span>Ответственный</span>
									<strong>{selectedResponsibleUser?.title ?? "Все"}</strong>
								</button>
								{isResponsibleFilterOpen ? (
									<div className={styles.responsibleFilterOptions}>
										<button
											type="button"
											onClick={() => {
												setSelectedResponsibleFilter("");
												setIsResponsibleFilterOpen(false);
											}}
										>
											<span className={styles.responsibleFilterAvatar}>
												Все
											</span>
											<span>Все ответственные</span>
										</button>
										{responsibleFilterUsers.map((user) => (
											<button
												key={user.id}
												type="button"
												onClick={() => {
													setSelectedResponsibleFilter(
														normalizeProjectId(user.id),
													);
													setIsResponsibleFilterOpen(false);
												}}
											>
												<span className={styles.responsibleFilterAvatar}>
													{user.photo ? (
														<img src={user.photo} alt="" />
													) : (
														user.title.trim().charAt(0) || "?"
													)}
												</span>
												<span>{user.title}</span>
											</button>
										))}
									</div>
								) : null}
							</div>
							<div className={styles.projectsPlanSection}>
								<span className={styles.projectsPlanSectionTitle}>
									Общий план
								</span>
								<button
									type="button"
									className={styles.projectsPlanButton}
									onClick={() => navigate("/reports/projects-plan")}
								>
									<span className={styles.projectsPlanIcon}>
										<FaCalendarAlt aria-hidden="true" />
									</span>
									<span className={styles.projectsPlanCopy}>
										<strong>Все проекты</strong>
										<span>Проекты, команда и сводные окна</span>
									</span>
									<b className={styles.projectsPlanCount}>
										{reportProjects.length}
									</b>
									<FaEllipsisH
										aria-hidden="true"
										className={styles.projectsPlanMore}
									/>
								</button>
								<div className={styles.projectStatusFilters}>
									{REPORT_PROJECT_STATUS_FILTERS.map((filter) => (
										<button
											key={filter.value}
											type="button"
											className={
												filter.value === selectedProjectStatusFilter
													? styles.projectStatusFilterButtonActive
													: styles.projectStatusFilterButton
											}
											aria-pressed={
												filter.value === selectedProjectStatusFilter
											}
											onClick={() =>
												setSelectedProjectStatusFilter(filter.value)
											}
										>
											<span>{filter.label}</span>
											<b>{reportProjectStatusCounts[filter.value]}</b>
										</button>
									))}
								</div>
							</div>
							{isReportProjectsLoading ? <ProjectListSkeleton /> : null}
							{!isReportProjectsLoading &&
								visibleReportProjectGroups.map((group) => (
									<div key={group.key} className={styles.reportProjectGroup}>
										<div className={styles.reportProjectGroupTitle}>
											{group.title}
										</div>
										{group.projects.map((project) => {
											const responsibleUser = getProjectResponsibleUser(
												project,
												users,
											);

											return (
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
														{responsibleUser?.photo ? (
															<img src={responsibleUser.photo} alt="" />
														) : (
															project.title.trim().charAt(0) || "P"
														)}
													</span>
													<span className={styles.reportProjectText}>
														<strong className={styles.reportProjectTitle}>
															{project.title}
														</strong>
														<small className={styles.reportProjectMeta}>
															<span
																className={`${styles.reportProjectNextReportDate} ${
																	isProjectReportDateOverdue(
																		project.nextProjectReportDate,
																	)
																		? styles.reportProjectNextReportDateOverdue
																		: ""
																}`}
															>
																{formatProjectReportDate(
																	project.nextProjectReportDate,
																)}
															</span>
															<span
																className={`${styles.ganttGroupStatus} ${styles.reportProjectStatus} ${getReportProjectStatusClassName(project.projectStatus)}`}
															>
																{getReportProjectStatusLabel(
																	project.projectStatus,
																)}
															</span>
														</small>
													</span>
													<span
														className={styles.reportProjectMenuButton}
														onClick={(event) => {
															event.stopPropagation();
															openReportProjectEditModal(project);
														}}
													>
														<span aria-hidden="true" />
														<span aria-hidden="true" />
														<span aria-hidden="true" />
													</span>
												</button>
											);
										})}
									</div>
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
							<div className={styles.tabsList}>
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
							</div>
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
						) : bitrixProjectsError && shouldLoadBitrixProjectDetails ? (
							<div role="alert" className={styles.emptyState}>
								<p>{bitrixProjectsError}</p>
								<button
									type="button"
									className={styles.filterButton}
									onClick={reloadBitrixProjects}
								>
									Повторить загрузку
								</button>
							</div>
						) : !selectedReportProject && activeTab !== "marginality" ? (
							<div className={styles.projectReportEmptyState}>
								<p>
									Выберите проект в списке слева, чтобы посмотреть его план,
									задачи и отчёты.
								</p>
								<button
									type="button"
									className={styles.filterButton}
									onClick={() => navigate("/reports/projects-plan")}
								>
									Открыть общий план проектов
								</button>
							</div>
						) : (
							<>
								{activeTab === "projects" && (
									<SummaryCards
										form={summaryForm}
										onEditProject={() => {
											if (selectedReportProject) {
												openReportProjectEditModal(selectedReportProject, true);
											}
										}}
										projectTitle={
											selectedReportProject?.title ?? "Проект не выбран"
										}
										projectStatus={selectedReportProject?.projectStatus}
										projectType={selectedReportProject?.projectType ?? "none"}
										areAutomaticHoursUnavailable={Boolean(projectMetricsError)}
										summary={displayedSummary}
									/>
								)}

								{activeTab === "marginality" && (
									<AutonomousPaymentsTab
										error={autonomousPaymentsError}
										isLoading={isAutonomousPaymentsLoading}
										onCreate={openPaymentCreateModal}
										onEdit={openPaymentEditModal}
										onScopeChange={setPaymentsScope}
										payments={autonomousPayments}
										paymentEvents={autonomousPaymentEvents}
										project={selectedReportProject}
										projects={paymentsScopeProjects}
										scope={paymentsScope}
										stages={autonomousPaymentStages}
									/>
								)}

								{activeTab === "projects" && (
									<ProjectsTab
										bitrixProjects={selectedBitrixProjectsWithDetails}
										form={summaryForm}
										onPaymentsChanged={refreshAutonomousPayments}
										projects={reportProjects}
										selectedProjectId={effectiveSelectedProjectId}
										reportsError={projectMetricsError}
										onRetryReports={handleProjectMetricsRetry}
										retryReportsLabel={projectMetricsActionLabel}
										users={users}
									/>
								)}

								{activeTab === "projectDetails" && (
									<ReportProjectDetailsTab
										bitrixProjectOptions={bitrixProjectOptions}
										companyOptions={companyOptions}
										bitrixProjectsLoading={isBitrixProjectsLoading}
										bitrixProjectsError={bitrixProjectsError}
										onRetryBitrixProjects={reloadBitrixProjects}
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
										users={users}
									/>
								)}

								{activeTab === "tasks" &&
									(projectMetricsError ? (
										<div role="alert" className={styles.emptyState}>
											<p>{projectMetricsError}</p>
											<button
												type="button"
												className={styles.filterButton}
												onClick={handleProjectMetricsRetry}
											>
												{projectMetricsActionLabel}
											</button>
										</div>
									) : (
										<TasksTab
											items={allTasks}
											users={users}
											openTask={(id) => openTask(id, EntityTypeIds.tasks)}
										/>
									))}

								{activeTab === "reports" &&
									(projectMetricsError ? (
										<div role="alert" className={styles.emptyState}>
											<p>{projectMetricsError}</p>
											<button
												type="button"
												className={styles.filterButton}
												onClick={handleProjectMetricsRetry}
											>
												{projectMetricsActionLabel}
											</button>
										</div>
									) : (
										<ReportsTab
											activities={activities}
											items={allReports}
											users={users}
											openReport={(id) => openTask(id, EntityTypeIds.reports)}
										/>
									))}

								{activeTab === "projectReports" && (
									<ProjectReportsTab
										authorName={projectReportAuthorName}
										error={projectReportsError}
										fileDrafts={projectReportFileDrafts}
										isLoading={isProjectReportsLoading}
										isModalOpen={isProjectReportModalOpen}
										isSaving={isProjectReportSaving}
										nextReportDate={projectReportNextDate}
										onAuthorChange={(authorName, authorId) => {
											setProjectReportAuthorName(authorName);
											setProjectReportAuthorId(authorId);
										}}
										onCloseModal={() => setIsProjectReportModalOpen(false)}
										onCreate={handleProjectReportCreate}
										onDelete={handleProjectReportDelete}
										onFileDelete={deleteProjectReportFile}
										onFileDownload={downloadProjectReportFile}
										onFileUpload={uploadProjectReportFiles}
										onFilesChange={setProjectReportFileDrafts}
										onNextReportDateChange={setProjectReportNextDate}
										onOpenModal={() => {
											setProjectReportsError(null);
											setIsProjectReportModalOpen(true);
										}}
										onRefreshReports={refreshSelectedProjectReports}
										onTextChange={setProjectReportText}
										onUpdate={handleProjectReportUpdate}
										project={selectedReportProject}
										reports={projectReportEntries}
										text={projectReportText}
										users={users}
									/>
								)}
							</>
						)}
					</div>
				</div>
			</section>
			<ReportProjectModal
				bitrixProjectOptions={bitrixProjectOptions}
				companyOptions={companyOptions}
				creationMode={projectCreationMode}
				onCreationModeChange={setProjectCreationMode}
				bitrixProjectsLoading={isBitrixProjectsLoading}
				bitrixProjectsError={bitrixProjectsError}
				onRetryBitrixProjects={reloadBitrixProjects}
				deletingReportProjectId={deletingReportProjectId}
				fileDrafts={projectFileDrafts}
				form={projectForm}
				isOpen={isReportProjectModalOpen}
				onClose={() => {
					setDeletingReportProjectId(null);
					setProjectFileDrafts({});
					setIsReportProjectDrawer(false);
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
				position={isReportProjectDrawer ? "right" : "center"}
				saving={isReportProjectSaving}
				users={users}
			/>
			<PaymentModal
				deletingPaymentId={deletingPaymentId}
				form={paymentForm}
				isOpen={isPaymentModalOpen}
				onClose={() => {
					setDeletingPaymentId(null);
					setIsPaymentModalOpen(false);
				}}
				onDelete={handlePaymentDelete}
				onFormChange={setPaymentForm}
				onSubmit={handlePaymentSubmit}
				projectAmount={selectedReportProject?.projectAmount}
				stages={autonomousPaymentStages}
			/>
		</>
	);
};

const AutonomousPaymentsTab = ({
	error,
	isLoading,
	onCreate,
	onEdit,
	onScopeChange,
	payments,
	paymentEvents,
	project,
	projects,
	scope,
	stages,
}: {
	error: string | null;
	isLoading: boolean;
	onCreate: () => void;
	onEdit: (payment: AutonomousProjectPayment) => void;
	onScopeChange: (scope: PaymentsScope) => void;
	payments: AutonomousProjectPayment[];
	paymentEvents: ProjectGanttEvent[];
	project: ReportProject | null;
	projects: ReportProject[];
	scope: PaymentsScope;
	stages: ProjectGanttStage[];
}) => {
	const [chartScale, setChartScale] = useState<PaymentChartScale>("year");
	const [selectedChartMonthKey, setSelectedChartMonthKey] = useState<
		string | null
	>(null);
	const stageById = useMemo(
		() => new Map(stages.map((stage) => [stage.id, stage.title])),
		[stages],
	);
	const projectById = useMemo(
		() => new Map(projects.map((item) => [String(item.id), item])),
		[projects],
	);
	const paymentEventByStageId = useMemo(
		() => new Map(paymentEvents.map((event) => [event.stageId, event])),
		[paymentEvents],
	);
	const projectAmount = projects.reduce(
		(sum, item) => sum + (item.projectAmount ?? 0),
		0,
	);
	const paidAmount = payments.reduce(
		(sum, payment) =>
			payment.status === "paid"
				? sum + getAutonomousPaymentAmount(payment)
				: sum,
		0,
	);
	const debtAmount = payments.reduce(
		(sum, payment) =>
			payment.status === "debt"
				? sum + getAutonomousPaymentAmount(payment)
				: sum,
		0,
	);
	const requestAmount = Math.max(projectAmount - paidAmount, 0);
	const marginPercent = projectAmount
		? Math.round((paidAmount / projectAmount) * 100)
		: 0;
	const scopeSubtitle =
		scope === "project"
			? (project?.title ?? "Проект")
			: scope === "client"
				? project?.clientCompany || project?.title || "Компания клиента"
				: "Все проекты";
	const getPaymentSegmentTooltip = (
		payment: AutonomousProjectPayment,
		amount: number,
	) =>
		[
			`Проект: ${
				projectById.get(String(payment.projectId))?.title ?? "Проект"
			}`,
			`Сумма: ${formatMoney(amount)}`,
		].join("\n");
	const paymentsWithDisplayDates = useMemo(
		() =>
			resolveAutonomousPaymentDates({
				events: paymentEvents,
				payments,
				stages,
			}),
		[paymentEvents, payments, stages],
	);
	const paymentDateItems = useMemo(
		() =>
			paymentsWithDisplayDates.map((payment) => {
				const date = payment.paymentDate ? new Date(payment.paymentDate) : null;
				const validDate = date && !Number.isNaN(date.getTime()) ? date : null;

				return { date: validDate, payment };
			}),
		[paymentsWithDisplayDates],
	);
	const availableMonthKeys = useMemo(
		() =>
			Array.from(
				new Set(
					paymentDateItems
						.map((item) => (item.date ? getPaymentMonthKey(item.date) : null))
						.filter((key): key is string => Boolean(key)),
				),
			).sort(
				(left, right) =>
					getPaymentMonthKeyTime(left) - getPaymentMonthKeyTime(right),
			),
		[paymentDateItems],
	);
	const activeChartMonthKey =
		selectedChartMonthKey && availableMonthKeys.includes(selectedChartMonthKey)
			? selectedChartMonthKey
			: (availableMonthKeys.at(-1) ?? null);
	const chartColumns = useMemo(() => {
		const groups = paymentDateItems.reduce((result, { date, payment }) => {
			if (chartScale === "month") {
				if (!date || getPaymentMonthKey(date) !== activeChartMonthKey) {
					return result;
				}
			}

			if (chartScale === "halfYear" && date) {
				const monthIndex = availableMonthKeys.indexOf(getPaymentMonthKey(date));
				const lastMonthIndex = Math.max(availableMonthKeys.length - 1, 0);
				const firstMonthIndex = Math.max(lastMonthIndex - 5, 0);

				if (monthIndex < firstMonthIndex || monthIndex > lastMonthIndex) {
					return result;
				}
			}

			const key =
				date && chartScale === "month"
					? getPaymentDayKey(date)
					: date
						? getPaymentMonthKey(date)
						: "no-date";
			const group = result.get(key) ?? {
				date,
				items: [],
			};

			group.items.push(payment);
			result.set(key, group);

			return result;
		}, new Map<
			string,
			{ date: Date | null; items: AutonomousProjectPayment[] }
		>());
		const columns = Array.from(groups.entries()).map(([key, group]) => {
			const amount = group.items.reduce(
				(sum, payment) => sum + getAutonomousPaymentAmount(payment),
				0,
			);
			const segments = group.items
				.map((payment) => ({
					amount: getAutonomousPaymentAmount(payment),
					payment,
				}))
				.filter((item) => item.amount > 0);

			return {
				amount,
				date: group.date,
				key,
				label:
					group.date && chartScale === "month"
						? formatPaymentDayLabel(group.date)
						: group.date
							? formatPaymentMonthLabel(group.date)
							: "без даты",
				segments,
			};
		});

		columns.sort((left, right) => {
			if (left.key === "no-date") return 1;
			if (right.key === "no-date") return -1;

			return chartScale === "month"
				? getPaymentDayKeyTime(left.key) - getPaymentDayKeyTime(right.key)
				: getPaymentMonthKeyTime(left.key) - getPaymentMonthKeyTime(right.key);
		});

		const maxAmount = Math.max(...columns.map((column) => column.amount), 1);

		return columns.map((column) => ({
			...column,
			maxAmount,
		}));
	}, [activeChartMonthKey, availableMonthKeys, chartScale, paymentDateItems]);
	const hasChartColumns = chartColumns.length > 0;
	const chartMonthDate = activeChartMonthKey
		? getPaymentMonthDate(activeChartMonthKey)
		: null;
	const chartMonthTitle = chartMonthDate
		? formatPaymentMonthLabel(chartMonthDate)
		: "";

	const header = (
		<>
			<div className={styles.projectReportsHeader}>
				<div>
					<h3>Список оплат</h3>
					<span>{scopeSubtitle}</span>
				</div>
			</div>
			<div className={styles.marginalityFilters}>
				{Object.entries(paymentsScopeLabels).map(([scopeId, label]) => (
					<button
						key={scopeId}
						type="button"
						className={scope === scopeId ? styles.activeFilter : ""}
						onClick={() => onScopeChange(scopeId as PaymentsScope)}
					>
						{label}
					</button>
				))}
			</div>
		</>
	);

	if (!project && scope !== "all") {
		return (
			<section className={styles.projectReportsPanel}>
				{header}
				<div className={styles.projectReportEmptyState}>
					Выберите проект в списке слева или переключитесь на «Все проекты»,
					чтобы посмотреть платежи.
				</div>
			</section>
		);
	}

	return (
		<section className={styles.projectReportsPanel}>
			{header}
			<div className={styles.marginalityMetrics}>
				<div>
					<span>Проектов</span>
					<strong>{projects.length}</strong>
				</div>
				<div>
					<span>Маржа</span>
					<strong className={styles.successText}>{marginPercent}%</strong>
				</div>
				<div>
					<span>Сумма</span>
					<strong className={styles.amountText}>
						{formatMoney(projectAmount)}
					</strong>
				</div>
				<div>
					<span>Оплачено</span>
					<strong className={styles.successText}>
						{formatMoney(paidAmount)}
					</strong>
				</div>
				<div>
					<span>Дебиторка</span>
					<strong className={styles.warningText}>
						{formatMoney(debtAmount)}
					</strong>
				</div>
			</div>
			<div className={styles.requestCard}>
				<span>Запросить</span>
				<strong className={styles.requestText}>
					{formatMoney(requestAmount)}
				</strong>
			</div>

			<div className={styles.marginalityCard}>
				<div className={styles.paymentChartHeader}>
					<div className={styles.paymentChartTitle}>
						<div>
							<h4>График оплат по датам</h4>
							{chartScale === "month" && chartMonthTitle ? (
								<span>{chartMonthTitle}</span>
							) : null}
						</div>
					</div>
					<div className={styles.paymentChartScaleButtons}>
						{Object.entries(paymentChartScaleLabels).map(([scaleId, label]) => (
							<button
								key={scaleId}
								type="button"
								className={
									chartScale === scaleId ? styles.activeChartScale : ""
								}
								onClick={() => setChartScale(scaleId as PaymentChartScale)}
							>
								{label}
							</button>
						))}
					</div>
				</div>
				<div className={styles.paymentLegend}>
					<span className={styles.paymentPaid}>оплачено</span>
					<span className={styles.paymentCanceled}>неоплачено</span>
				</div>
				<div className={styles.paymentChart}>
					{chartScale === "month" ? (
						<button
							type="button"
							className={styles.paymentChartBackButton}
							onClick={() => setChartScale("year")}
							aria-label="Вернуться к месяцам"
						>
							←
						</button>
					) : null}
					{hasChartColumns ? (
						<div
							className={`${styles.chartPlot} ${
								chartColumns.length === 1 ? styles.chartPlotSingle : ""
							}`}
						>
							<div className={styles.chartAxisLabel}>к оплате</div>
							{chartColumns.map(
								({
									amount: periodAmount,
									date,
									key,
									label,
									maxAmount,
									segments,
								}) => {
									const columnHeight = periodAmount
										? Math.max((periodAmount / maxAmount) * 150, 48)
										: 0;
									const columnMonthKey =
										chartScale !== "month" && date
											? getPaymentMonthKey(date)
											: null;

									return (
										<button
											key={key}
											type="button"
											className={`${styles.periodColumn} ${
												columnMonthKey ? styles.periodColumnClickable : ""
											}`}
											onClick={
												columnMonthKey
													? () => {
															setSelectedChartMonthKey(columnMonthKey);
															setChartScale("month");
														}
													: undefined
											}
										>
											<div className={styles.periodHeader}>
												<strong>{label}</strong>
												<small>{formatMoney(periodAmount)}</small>
											</div>
											<div
												className={styles.stackedBar}
												style={{ height: `${columnHeight}px` }}
											>
												{segments.length ? (
													segments.map(({ amount, payment }) => (
														<span
															key={payment.id}
															className={`${styles.paymentSegment} ${getAutonomousPaymentStatusClassName(
																payment.status,
																isAutonomousPaymentDueByCompletedStage(
																	payment,
																	paymentEventByStageId,
																),
															)}`}
															style={{
																height: `${Math.max(
																	(amount / periodAmount) * columnHeight,
																	16,
																)}px`,
															}}
															title={getPaymentSegmentTooltip(payment, amount)}
														>
															{formatMoney(amount)}
														</span>
													))
												) : (
													<span className={styles.paymentZeroSegment} />
												)}
											</div>
										</button>
									);
								},
							)}
						</div>
					) : (
						<div className={styles.paymentChartEmpty}>
							Платежи в выбранном списке не найдены
						</div>
					)}
				</div>
			</div>

			<div className={styles.marginalityCard}>
				<div className={styles.paymentListHeader}>
					<h4>Платежи</h4>
					{project && (
						<button
							type="button"
							className={styles.paymentCreateButton}
							onClick={onCreate}
						>
							Создать платёж
						</button>
					)}
				</div>
				{error ? <div className={styles.emptyState}>{error}</div> : null}
				{isLoading ? (
					<div className={styles.emptyState}>Загрузка оплат...</div>
				) : null}
				{!isLoading && !paymentsWithDisplayDates.length ? (
					<div className={styles.emptyState}>Платежи не найдены</div>
				) : null}
				<div className={styles.paymentsList}>
					{paymentsWithDisplayDates.map((payment) => (
						<button
							key={payment.id}
							type="button"
							className={styles.paymentItem}
							onClick={() => onEdit(payment)}
						>
							<span>
								<strong>
									{projectById.get(String(payment.projectId))?.title ??
										"Проект"}{" "}
									· Платёж
								</strong>
								<span>
									Дата платежа: {formatProjectReportDate(payment.paymentDate)}
								</span>
								<small className={styles.paymentStageBinding}>
									Привязка к этапу:{" "}
									{stageById.get(payment.stageId) ?? "Не привязан к этапу"}
								</small>
							</span>
							<b>{formatMoney(payment.amount ?? 0)}</b>
							<em
								className={getAutonomousPaymentStatusClassName(payment.status)}
							>
								{paymentStatusLabels[payment.status]}
							</em>
						</button>
					))}
				</div>
			</div>
		</section>
	);
};
