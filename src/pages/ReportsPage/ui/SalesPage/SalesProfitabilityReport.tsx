import { useCallback, useEffect, useMemo, useState } from "react";
import { EntityTypeIds } from "@/shared/constants/const";
import { useBitrixSlider } from "@/shared/hooks/useBitrixSlider";
import type { User } from "@/shared/types/types";
import type { Deal } from "../../types/deals.types";
import type { ActivityListItem } from "../../types/types";
import {
	calculatePaymentFields,
	DEFAULT_PAYMENT_FORM,
	PaymentModal,
	type PaymentFormState,
} from "./components/AutonomousProjectGantt";
import { ProfitabilitySkeleton } from "./components/ProfitabilitySkeleton";
import { ProjectsTab } from "./components/ProjectsTab";
import { ProjectReportsTab } from "./components/ProjectReportsTab";
import { ReportsTab } from "./components/ReportsTab";
import { ReportProjectDetailsTab } from "./components/ReportProjectDetailsTab";
import { ReportProjectModal } from "./components/ReportProjectModal";
import { SummaryCards } from "./components/SummaryCards";
import { TasksTab } from "./components/TasksTab";
import {
	fetchProjectGanttStages,
} from "./model/projectGantt.api";
import {
	createAutonomousProjectPayment,
	deleteAutonomousProjectPayment,
	fetchAutonomousProjectPayments,
	updateAutonomousProjectPayment,
} from "./model/projectPayments.api";
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
} from "./model/projectReports.api";
import type {
	AutonomousProjectPayment,
	CreateProjectReportEntryPayload,
	FinancialProjectSummary,
	ProjectGanttStage,
	ProjectReportEntry,
	ProjectReportEntryFile,
	ReportProject,
	ReportProjectFile,
	ReportProjectFileKind,
	SalesProfitabilityTab,
	UpdateProjectReportEntryPayload,
} from "./model/types";
import {
	DEFAULT_REPORT_PROJECT_FORM,
	getProjectSummaryForm,
	getProjectSummaryPayload,
	getReportProjectForm,
	getReportProjectPayload,
	numberOrNull,
	type ProjectSummaryFormState,
	type ReportProjectFileDrafts,
	type ReportProjectFormState,
} from "./model/reportProjectForm";
import { formatProjectReportDate } from "./model/reportProjectFormat";
import { formatMoney } from "./model/profitabilityUtils";
import { useCompanyProjects } from "./model/useCompanyProjects";
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

const paymentStatusLabels = {
	paid: "оплачено",
	todo: "неоплачено",
	debt: "неоплачено",
	canceled: "неоплачено",
} as const;

type PaymentsScope = "all" | "client" | "project";

const paymentsScopeLabels: Record<PaymentsScope, string> = {
	all: "Все проекты",
	project: "Проект",
	client: "Компания клиента",
};

const getDbProjectId = (project: ReportProject) => `db-${project.id}`;

const normalizeProjectTitle = (title: string) => title.trim().toLowerCase();
const normalizeProjectId = (value: string | number | null | undefined) =>
	String(value ?? "").trim();

const mergeReportProjectFiles = (
	files: ReportProjectFile[] = [],
	updatedFiles: ReportProjectFile[],
) => {
	const result = new Map<ReportProjectFileKind, ReportProjectFile>();

	files.forEach((file) => result.set(file.fileKind, file));
	updatedFiles.forEach((file) => result.set(file.fileKind, file));

	return Array.from(result.values());
};

const getNextProjectReportDate = (reports: ProjectReportEntry[]) => {
	const today = new Date().toISOString().slice(0, 10);
	const dates = reports
		.map((report) => report.nextReportDate)
		.filter((date): date is string => Boolean(date));
	const futureDate = dates
		.filter((date) => date >= today)
		.sort((left, right) => left.localeCompare(right))[0];
	const pastDate = dates
		.filter((date) => date < today)
		.sort((left, right) => right.localeCompare(left))[0];

	return futureDate ?? pastDate ?? null;
};

const getPaymentMonthKey = (date: Date) =>
	`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const getPaymentMonthKeyTime = (key: string) => {
	const [year, month] = key.split("-").map(Number);
	const date = new Date(year, month - 1, 1);

	return Number.isNaN(date.getTime()) ? Number.POSITIVE_INFINITY : date.getTime();
};

const formatPaymentMonthLabel = (date: Date) =>
	new Intl.DateTimeFormat("ru-RU", {
		month: "short",
		year: "2-digit",
	})
		.format(date)
		.replace(".", "");

const getAutonomousPaymentStatusClassName = (
	status: AutonomousProjectPayment["status"],
) => {
	if (status === "paid") return styles.paymentPaid;

	return styles.paymentCanceled;
};

const getAutonomousPaymentAmount = (payment: AutonomousProjectPayment) =>
	payment.amount ?? 0;

const getPaymentsScopeProjects = (
	projects: ReportProject[],
	scope: PaymentsScope,
	selectedProject: ReportProject | null,
) => {
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
	const [autonomousPayments, setAutonomousPayments] = useState<
		AutonomousProjectPayment[]
	>([]);
	const [autonomousPaymentStages, setAutonomousPaymentStages] = useState<
		ProjectGanttStage[]
	>([]);
	const [isAutonomousPaymentsLoading, setIsAutonomousPaymentsLoading] =
		useState(false);
	const [autonomousPaymentsError, setAutonomousPaymentsError] = useState<
		string | null
	>(null);
	const [paymentsScope, setPaymentsScope] = useState<PaymentsScope>("all");
	const [paymentForm, setPaymentForm] =
		useState<PaymentFormState>(DEFAULT_PAYMENT_FORM);
	const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
	const [deletingPaymentId, setDeletingPaymentId] = useState<number | null>(
		null,
	);
	const [paymentsRefreshKey, setPaymentsRefreshKey] = useState(0);
	const [isReportProjectModalOpen, setIsReportProjectModalOpen] = useState(false);
	const [isReportProjectsLoading, setIsReportProjectsLoading] = useState(false);
	const [projectFormError, setProjectFormError] = useState<string | null>(null);
	const [isReportProjectSaving, setIsReportProjectSaving] = useState(false);
	const [projectSearchQuery, setProjectSearchQuery] = useState("");
	const [deletingReportProjectId, setDeletingReportProjectId] = useState<
		number | null
	>(null);
	const { openTask } = useBitrixSlider();
	const {
		companyTitleById,
		projects: bitrixProjects,
		isLoadingDetails: isBitrixProjectsLoading,
	} = useCompanyProjects();
	const selectedReportProject = reportProjects.find(
		(project) => getDbProjectId(project) === selectedProjectId,
	) ?? reportProjects[0] ?? null;
	const selectedReportProjectId = selectedReportProject?.id ?? null;
	const paymentsScopeProjects = useMemo(
		() =>
			getPaymentsScopeProjects(reportProjects, paymentsScope, selectedReportProject),
		[paymentsScope, reportProjects, selectedReportProject],
	);

	const updateProjectNextReportDate = useCallback((
		projectId: number,
		reports: ProjectReportEntry[],
	) => {
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
	}, []);

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

		if (!selectedReportProjectId) {
			setProjectReportEntries([]);
			return;
		}

		const controller = new AbortController();

		setIsProjectReportsLoading(true);
		fetchProjectReportEntries(selectedReportProjectId, controller.signal)
			.then((reports) => {
				setProjectReportEntries(reports);
				updateProjectNextReportDate(selectedReportProjectId, reports);
			})
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
	}, [selectedReportProjectId, updateProjectNextReportDate]);

	useEffect(() => {
		void paymentsRefreshKey;

		if (!selectedReportProjectId) {
			setAutonomousPayments([]);
			setAutonomousPaymentStages([]);
			return;
		}

		const controller = new AbortController();
		const projectId = String(selectedReportProjectId);
		const paymentProjectIds = paymentsScopeProjects.map((project) =>
			String(project.id),
		);

		setIsAutonomousPaymentsLoading(true);
		setAutonomousPaymentsError(null);

		Promise.all([
			Promise.all(
				paymentProjectIds.map((paymentProjectId) =>
					fetchAutonomousProjectPayments(paymentProjectId, controller.signal),
				),
			),
			fetchProjectGanttStages(projectId, controller.signal),
		])
			.then(([payments, stages]) => {
				setAutonomousPayments(payments.flat());
				setAutonomousPaymentStages(stages);
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
	}, [paymentsRefreshKey, paymentsScopeProjects, selectedReportProjectId]);

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
	const isBusy = loading || isReportProjectsLoading || isBitrixProjectsLoading;
	const selectedBitrixProjects = selectedReportProject
		? bitrixProjects.filter((project) => {
				const bitrixProjectId = normalizeProjectId(project.projectId ?? project.id);
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
		: [];
	const allTasks = selectedBitrixProjects.flatMap((project) =>
		project.tasks.map((task) => ({ project, task })),
	);
	const allReports = selectedBitrixProjects.flatMap((project) =>
		project.reports.map((report) => ({ project, report })),
	);
	const normalizedProjectSearchQuery = projectSearchQuery.trim().toLowerCase();
	const visibleReportProjects = normalizedProjectSearchQuery
		? reportProjects.filter((project) =>
				project.title.toLowerCase().includes(normalizedProjectSearchQuery),
			)
		: reportProjects;
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

				return {
					id,
					title: `${title} · #${id}`,
					value: id,
				};
			}),
		[bitrixProjects],
	);

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

	const hasExistingBitrixProject = (bitrixProjectId: string) => {
		const normalizedBitrixProjectId = normalizeProjectId(bitrixProjectId);

		if (!normalizedBitrixProjectId) {
			return true;
		}

		return bitrixProjects.some((project) => {
			const projectId = normalizeProjectId(project.projectId ?? project.id);

			return projectId === normalizedBitrixProjectId;
		});
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
			updateProjectNextReportDate(selectedReportProject.id, reports);
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

		const reports = projectReportEntries.map((entry) =>
			entry.id === updatedReport.id ? updatedReport : entry,
		);

		setProjectReportEntries(reports);
		updateProjectNextReportDate(selectedReportProject.id, reports);
	};

	const refreshAutonomousPayments = () => {
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

	const handlePaymentSubmit = async () => {
		if (!selectedReportProjectId || !paymentForm.stageId) {
			return;
		}

		const calculatedPaymentFields = calculatePaymentFields({
			amount: paymentForm.amount,
			percent: paymentForm.percent,
			projectAmount: selectedReportProject?.projectAmount,
			source: paymentForm.amount ? "amount" : "percent",
		});

		const payload = {
			amount: numberOrNull(calculatedPaymentFields.amount),
			paymentAnchor: paymentForm.paymentAnchor,
			paymentDate: null,
			percent: numberOrNull(calculatedPaymentFields.percent),
			stageId: paymentForm.stageId,
			status: paymentForm.status,
			waitingDays: numberOrNull(paymentForm.waitingDays),
		};

		if (paymentForm.id) {
			await updateAutonomousProjectPayment(paymentForm.id, payload);
		} else {
			const selectedProjectPaymentsCount = autonomousPayments.filter(
				(payment) => String(payment.projectId) === String(selectedReportProjectId),
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

		if (!hasExistingBitrixProject(projectForm.bitrixProjectId)) {
			setProjectFormError("Проект с таким ID не найден в Битрикс");
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

		if (!hasExistingBitrixProject(detailsProjectForm.bitrixProjectId)) {
			setDetailsProjectError("Проект с таким ID не найден в Битрикс");
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
										<small className={styles.reportProjectMeta}>
											<span>Проект</span>
											<span className={styles.reportProjectNextReportDate}>
												{formatProjectReportDate(project.nextProjectReportDate)}
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
								<AutonomousPaymentsTab
									error={autonomousPaymentsError}
									isLoading={isAutonomousPaymentsLoading}
									onCreate={openPaymentCreateModal}
									onEdit={openPaymentEditModal}
									onScopeChange={setPaymentsScope}
									payments={autonomousPayments}
									project={selectedReportProject}
									projects={paymentsScopeProjects}
									scope={paymentsScope}
									stages={autonomousPaymentStages}
								/>
							)}

							{activeTab === "projects" && (
								<ProjectsTab
									bitrixProjects={selectedBitrixProjects}
									onPaymentsChanged={refreshAutonomousPayments}
									paymentsRefreshKey={paymentsRefreshKey}
									projects={reportProjects}
									selectedProjectId={effectiveSelectedProjectId}
									users={users}
								/>
							)}

							{activeTab === "projectDetails" && (
								<ReportProjectDetailsTab
									bitrixProjectOptions={bitrixProjectOptions}
									companyOptions={companyOptions}
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
			bitrixProjectOptions={bitrixProjectOptions}
			companyOptions={companyOptions}
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
	project: ReportProject | null;
	projects: ReportProject[];
	scope: PaymentsScope;
	stages: ProjectGanttStage[];
}) => {
	const stageById = useMemo(
		() => new Map(stages.map((stage) => [stage.id, stage.title])),
		[stages],
	);
	const projectById = useMemo(
		() => new Map(projects.map((item) => [String(item.id), item])),
		[projects],
	);
	const projectAmount = projects.reduce(
		(sum, item) => sum + (item.projectAmount ?? 0),
		0,
	);
	const paidAmount = payments.reduce(
		(sum, payment) =>
			payment.status === "paid" ? sum + getAutonomousPaymentAmount(payment) : sum,
		0,
	);
	const debtAmount = payments.reduce(
		(sum, payment) =>
			payment.status === "debt" ? sum + getAutonomousPaymentAmount(payment) : sum,
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
				? (project?.clientCompany || project?.title || "Компания клиента")
				: "Все проекты";
	const paymentsByMonth = useMemo(() => {
		return payments.reduce(
			(result, payment) => {
				const date = payment.paymentDate ? new Date(payment.paymentDate) : null;
				const validDate = date && !Number.isNaN(date.getTime()) ? date : null;
				const key = validDate ? getPaymentMonthKey(validDate) : "no-date";
				const group = result.get(key) ?? {
					date: validDate,
					items: [],
				};

				group.items.push(payment);
				result.set(key, group);

				return result;
			},
			new Map<
				string,
				{ date: Date | null; items: AutonomousProjectPayment[] }
			>(),
		);
	}, [payments]);
	const chartColumns = useMemo(() => {
		const columns = Array.from(paymentsByMonth.entries()).map(([key, group]) => {
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
				segments,
			};
		});

		columns.sort((left, right) =>
			getPaymentMonthKeyTime(left.key) - getPaymentMonthKeyTime(right.key),
		);

		const maxAmount = Math.max(...columns.map((column) => column.amount), 1);

		return columns.map((column) => ({
			...column,
			maxAmount,
		}));
	}, [paymentsByMonth]);
	const hasChartColumns = chartColumns.length > 0;

	if (!project) {
		return (
			<div className={styles.projectReportEmptyState}>
				Выберите проект, чтобы посмотреть и добавить платежи.
			</div>
		);
	}

	return (
		<section className={styles.projectReportsPanel}>
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
					<strong className={styles.successText}>{formatMoney(paidAmount)}</strong>
				</div>
				<div>
					<span>Дебиторка</span>
					<strong className={styles.warningText}>{formatMoney(debtAmount)}</strong>
				</div>
			</div>
			<div className={styles.requestCard}>
				<span>Запросить</span>
				<strong className={styles.requestText}>{formatMoney(requestAmount)}</strong>
			</div>

			<div className={styles.marginalityCard}>
				<h4>График оплат по датам</h4>
				<div className={styles.paymentLegend}>
					<span className={styles.paymentPaid}>оплачено</span>
					<span className={styles.paymentCanceled}>неоплачено</span>
				</div>
				<div className={styles.paymentChart}>
					{hasChartColumns ? (
						<div
							className={`${styles.chartPlot} ${
								chartColumns.length === 1 ? styles.chartPlotSingle : ""
							}`}
						>
							<div className={styles.chartAxisLabel}>к оплате</div>
							{chartColumns.map(
								({ amount: periodAmount, date, key, maxAmount, segments }) => {
									const columnHeight = periodAmount
										? Math.max((periodAmount / maxAmount) * 150, 48)
										: 0;

									return (
										<div key={key} className={styles.periodColumn}>
											<div className={styles.periodHeader}>
												<strong>
													{date ? formatPaymentMonthLabel(date) : "без даты"}
												</strong>
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
															)}`}
															style={{
																height: `${Math.max(
																	(amount / periodAmount) * columnHeight,
																	16,
																)}px`,
															}}
															title={formatMoney(amount)}
														>
															{formatMoney(amount)}
														</span>
													))
												) : (
													<span className={styles.paymentZeroSegment} />
												)}
											</div>
										</div>
									);
								},
							)}
						</div>
					) : (
						<div className={styles.paymentChartEmpty}>
							Платежи по выбранному проекту не найдены
						</div>
					)}
				</div>
			</div>

			<div className={styles.marginalityCard}>
				<div className={styles.paymentListHeader}>
					<h4>Платежи</h4>
					<button
						type="button"
						className={styles.paymentCreateButton}
						onClick={onCreate}
					>
						Создать платёж
					</button>
				</div>
				{error ? <div className={styles.emptyState}>{error}</div> : null}
				{isLoading ? (
					<div className={styles.emptyState}>Загрузка оплат...</div>
				) : null}
				{!isLoading && !payments.length ? (
					<div className={styles.emptyState}>Платежи не найдены</div>
				) : null}
				<div className={styles.paymentsList}>
					{payments.map((payment) => (
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
									Дата платежа:{" "}
									{formatProjectReportDate(payment.paymentDate)}
								</span>
								<small className={styles.paymentStageBinding}>
									Привязка к этапу:{" "}
									{stageById.get(payment.stageId) ?? "Не привязан к этапу"}
								</small>
							</span>
							<b>{formatMoney(payment.amount ?? 0)}</b>
							<em className={getAutonomousPaymentStatusClassName(payment.status)}>
								{paymentStatusLabels[payment.status]}
							</em>
						</button>
					))}
				</div>
			</div>
		</section>
	);
};
