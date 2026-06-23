import { useEffect, useMemo, useState, type ReactNode } from "react";
import Modal from "@/components/modal/Modal";
import { ProjectCodes } from "@/components/calendar/constants/const";
import { ClientsCodes, EntityTypeIds } from "@/shared/constants/const";
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
	createProjectReportProject,
	deleteProjectReportProject,
	fetchProjectReportProjects,
	updateProjectReportProject,
} from "./model/api";
import {
	buildCompanyProjectGroups,
	getFinancialProjectSummary,
} from "./model/profitabilityUtils";
import type {
	ProfitabilityProject,
	ProjectReportProject,
	ProjectReportProjectPayload,
	ProjectReportProjectType,
	SalesProfitabilityTab,
} from "./model/types";
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

type ProjectCardFormState = {
	[K in keyof ProjectReportProjectPayload]-?: string;
};

const DEFAULT_PROJECT_CARD_FORM: ProjectCardFormState = {
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
	value: ProjectReportProjectType;
}> = [
	{ label: "Не выбрано", value: "none" },
	{ label: "Финансовый вотерфол проект", value: "waterfall" },
	{ label: "Финансовый техпод проект", value: "support" },
];

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

const getProjectCardForm = (
	project?: ProjectReportProject | null,
): ProjectCardFormState => {
	if (!project) {
		return DEFAULT_PROJECT_CARD_FORM;
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

const getProjectCardPayload = (
	form: ProjectCardFormState,
): ProjectReportProjectPayload => ({
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
	projectType: form.projectType as ProjectReportProjectType,
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

const getDbProjectId = (project: ProjectReportProject) => `db-${project.id}`;

const getProjectTypeFromLegacyProject = (
	project: ProfitabilityProject,
): ProjectReportProjectType => {
	const financialProjectType = String(
		project[ProjectCodes.financialProjectType] ?? "",
	);

	if (financialProjectType === "409") {
		return "waterfall";
	}

	if (financialProjectType === "410") {
		return "support";
	}

	return "none";
};

const getProjectCardPayloadFromLegacyProject = (
	project: ProfitabilityProject,
): ProjectReportProjectPayload => ({
	projectAmount: numberOrNull(String(project[ProjectCodes.projectAmount] ?? "")),
	projectType: getProjectTypeFromLegacyProject(project),
	title: project.title,
});

const adaptProjectCardToProfitabilityProject = (
	project: ProjectReportProject,
): ProfitabilityProject => {
	const now = new Date().toISOString();
	const projectId = getDbProjectId(project);

	return {
		[ClientsCodes.title]: project.title,
		[ProjectCodes.company]: project.clientCompany,
		[ProjectCodes.financialProjectType]:
			project.projectType === "waterfall"
				? "409"
				: project.projectType === "support"
					? "410"
					: null,
		[ProjectCodes.projectAmount]: project.projectAmount,
		assignedById: 0,
		categoryId: 0,
		createdBy: 0,
		createdTime: project.createdAt ?? now,
		id: project.id,
		lastActivityBy: 0,
		lastActivityTime: project.updatedAt ?? now,
		movedBy: 0,
		movedTime: project.updatedAt ?? now,
		payments: [],
		projectId,
		reports: [],
		tasks: [],
		title: project.title,
		updatedBy: 0,
		updatedTime: project.updatedAt ?? now,
	};
};

export const SalesProfitabilityReport = ({
	activities,
	deals,
	users,
	loading,
}: SalesProfitabilityReportProps) => {
	const [selectedFinancialGroupId, setSelectedFinancialGroupId] = useState<
		string | null
	>(null);
	const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
		null,
	);
	const [activeTab, setActiveTab] = useState<SalesProfitabilityTab>("projects");
	const [isStructureCollapsed, setIsStructureCollapsed] = useState(false);
	const [projectCards, setProjectCards] = useState<ProjectReportProject[]>([]);
	const [editingProjectCard, setEditingProjectCard] =
		useState<ProjectReportProject | null>(null);
	const [projectCardForm, setProjectCardForm] = useState<ProjectCardFormState>(
		DEFAULT_PROJECT_CARD_FORM,
	);
	const [isProjectCardModalOpen, setIsProjectCardModalOpen] = useState(false);
	const [isProjectCardsLoading, setIsProjectCardsLoading] = useState(false);
	const [projectCardError, setProjectCardError] = useState<string | null>(null);
	const [isProjectCardSaving, setIsProjectCardSaving] = useState(false);
	const [projectSearchQuery, setProjectSearchQuery] = useState("");
	const [deletingProjectCardId, setDeletingProjectCardId] = useState<
		number | null
	>(null);
	const { openTask } = useBitrixSlider();
	const { companyTitleById, projects, isLoadingDetails } = useCompanyProjects();
	const companyGroups = useMemo(
		() => buildCompanyProjectGroups(projects, companyTitleById),
		[companyTitleById, projects],
	);
	const financialGroups = useMemo(
		() => companyGroups.flatMap((company) => company.financialGroups),
		[companyGroups],
	);
	const activeFinancialGroup = selectedProjectId?.startsWith("db-")
		? null
		: financialGroups.find(
				(group) => group.id === selectedFinancialGroupId,
			) ??
			financialGroups[0] ??
			null;
	const activeProjects = activeFinancialGroup?.projects ?? [];
	const adaptedProjectCards = useMemo(
		() => projectCards.map(adaptProjectCardToProfitabilityProject),
		[projectCards],
	);
	const selectedProjectCard = projectCards.find(
		(project) => getDbProjectId(project) === selectedProjectId,
	);
	const activeReportProjects = selectedProjectCard
		? adaptedProjectCards.filter(
				(project) => project.projectId === selectedProjectId,
			)
		: activeProjects;

	const effectiveSelectedProjectId = useMemo(() => {
		if (selectedProjectCard) {
			return getDbProjectId(selectedProjectCard);
		}

		const projectIds = activeProjects.map((project) => project.projectId);

		if (!projectIds.length) {
			return null;
		}

		if (selectedProjectId && projectIds.includes(selectedProjectId)) {
			return selectedProjectId;
		}

		return projectIds[0];
	}, [activeProjects, selectedProjectCard, selectedProjectId]);

	const summary = getFinancialProjectSummary(activeReportProjects);
	const isBusy = loading || isLoadingDetails;
	const allTasks = activeReportProjects.flatMap((project) =>
		project.tasks.map((task) => ({ task, project })),
	);
	const allReports = activeReportProjects.flatMap((project) =>
		project.reports.map((report) => ({ report, project })),
	);
	const normalizedProjectSearchQuery = projectSearchQuery.trim().toLowerCase();
	const visibleFinancialGroups = normalizedProjectSearchQuery
		? financialGroups.filter((group) =>
				group.title.toLowerCase().includes(normalizedProjectSearchQuery),
			)
		: financialGroups;
	const visibleProjectCards = normalizedProjectSearchQuery
		? projectCards.filter((project) =>
				project.title.toLowerCase().includes(normalizedProjectSearchQuery),
			)
		: projectCards;

	const selectFinancialGroup = (groupId: string, projectId: string) => {
		setSelectedFinancialGroupId(groupId);
		setSelectedProjectId(projectId);
	};

	const selectProjectCard = (project: ProjectReportProject) => {
		setSelectedFinancialGroupId(null);
		setSelectedProjectId(getDbProjectId(project));
	};

	useEffect(() => {
		const controller = new AbortController();

		setIsProjectCardsLoading(true);
		fetchProjectReportProjects(controller.signal)
			.then(setProjectCards)
			.catch(() => {
				if (controller.signal.aborted) {
					return;
				}
			})
			.finally(() => {
				if (!controller.signal.aborted) {
					setIsProjectCardsLoading(false);
				}
			});

		return () => controller.abort();
	}, []);

	const openProjectCardCreateModal = () => {
		setEditingProjectCard(null);
		setProjectCardForm(DEFAULT_PROJECT_CARD_FORM);
		setProjectCardError(null);
		setDeletingProjectCardId(null);
		setIsProjectCardModalOpen(true);
	};

	const openProjectCardEditModal = (project: ProjectReportProject) => {
		setEditingProjectCard(project);
		setProjectCardForm(getProjectCardForm(project));
		setProjectCardError(null);
		setDeletingProjectCardId(null);
		setIsProjectCardModalOpen(true);
	};

	const openLegacyProjectCardModal = async (project: ProfitabilityProject) => {
		const existingProjectCard = projectCards.find(
			(projectCard) => projectCard.title === project.title,
		);

		if (existingProjectCard) {
			openProjectCardEditModal(existingProjectCard);
			return;
		}

		setProjectCardError(null);
		try {
			const createdProject = await createProjectReportProject(
				getProjectCardPayloadFromLegacyProject(project),
			);
			setProjectCards((prev) => [...prev, createdProject]);
			openProjectCardEditModal(createdProject);
		} catch {
			setEditingProjectCard(null);
			setProjectCardForm({
				...DEFAULT_PROJECT_CARD_FORM,
				projectAmount: String(project[ProjectCodes.projectAmount] ?? ""),
				projectType: getProjectTypeFromLegacyProject(project),
				title: project.title,
			});
			setProjectCardError("Не удалось перенести проект, попробуйте сохранить");
			setIsProjectCardModalOpen(true);
		}
	};

	const handleProjectCardSubmit = async () => {
		if (!projectCardForm.title.trim()) {
			setProjectCardError("Заполните название проекта");
			return;
		}

		const payload = getProjectCardPayload(projectCardForm);

		setIsProjectCardSaving(true);
		setProjectCardError(null);

		try {
			if (editingProjectCard) {
				const updatedProject = await updateProjectReportProject(
					editingProjectCard.id,
					payload,
				);
				setProjectCards((prev) =>
					prev.map((project) =>
						project.id === updatedProject.id ? updatedProject : project,
					),
				);
			} else {
				const createdProject = await createProjectReportProject(payload);
				setProjectCards((prev) => [...prev, createdProject]);
			}

			setIsProjectCardModalOpen(false);
		} catch {
			setProjectCardError("Не удалось сохранить проект");
		} finally {
			setIsProjectCardSaving(false);
		}
	};

	const handleProjectCardDelete = async () => {
		if (!editingProjectCard) {
			return;
		}

		if (deletingProjectCardId !== editingProjectCard.id) {
			setDeletingProjectCardId(editingProjectCard.id);
			return;
		}

		setIsProjectCardSaving(true);
		setProjectCardError(null);

		try {
			await deleteProjectReportProject(editingProjectCard.id);
			setProjectCards((prev) =>
				prev.filter((project) => project.id !== editingProjectCard.id),
			);
			setDeletingProjectCardId(null);
			setIsProjectCardModalOpen(false);
		} catch {
			setProjectCardError("Не удалось удалить проект");
		} finally {
			setIsProjectCardSaving(false);
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
						{isLoadingDetails ? (
							<ProjectListSkeleton />
						) : (
							visibleFinancialGroups.map((group) => {
								const projectId = group.parentProject.projectId ?? group.id;
								const isActiveGroup = group.id === activeFinancialGroup?.id;

								return (
									<div key={group.id} className={styles.dealGroup}>
										<button
											type="button"
											title={group.title}
											className={`${styles.dealProjectButton} ${styles.projectCardButton} ${
												isActiveGroup ? styles.activeProject : ""
											}`}
											onClick={() => selectFinancialGroup(group.id, projectId)}
										>
											<span className={styles.dealProjectIcon}>
												{group.title.trim().charAt(0)}
											</span>
											<span>
												<strong>{group.title}</strong>
												<small>Проект</small>
											</span>
											<span
												className={styles.projectCardMenuButton}
												onClick={(event) => {
													event.stopPropagation();
													void openLegacyProjectCardModal(group.parentProject);
												}}
											>
												...
											</span>
										</button>

									</div>
								);
							})
						)}
						{!isProjectCardsLoading &&
							visibleProjectCards.map((project) => (
								<button
									key={project.id}
									type="button"
									title={project.title}
									className={`${styles.dealProjectButton} ${styles.projectCardButton} ${
										getDbProjectId(project) === selectedProjectId
											? styles.activeProject
											: ""
									}`}
									onClick={() => selectProjectCard(project)}
								>
									<span className={styles.dealProjectIcon}>
										{project.title.trim().charAt(0) || "P"}
									</span>
									<span>
										<strong>{project.title}</strong>
										<small>Автономный проект</small>
									</span>
									<span
										className={styles.projectCardMenuButton}
										onClick={(event) => {
											event.stopPropagation();
											openProjectCardEditModal(project);
										}}
									>
										...
									</span>
								</button>
							))}
						<button
							type="button"
							className={styles.dealProjectAddButton}
							onClick={openProjectCardCreateModal}
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
										selectedProjectCard?.title ??
										activeFinancialGroup?.title ??
										"Проект не выбран"
									}
									summary={summary}
								/>
							)}

							{activeTab === "marginality" && (
								<MarginalityTab
									deals={deals}
									projects={selectedProjectCard ? activeReportProjects : projects}
									selectedProjectId={effectiveSelectedProjectId}
								/>
							)}

							{activeTab === "projects" && (
								<ProjectsTab
									projects={activeReportProjects}
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
		<ProjectCardModal
			deletingProjectCardId={deletingProjectCardId}
			form={projectCardForm}
			isOpen={isProjectCardModalOpen}
			onClose={() => {
				setDeletingProjectCardId(null);
				setIsProjectCardModalOpen(false);
			}}
			onDelete={handleProjectCardDelete}
			onFormChange={setProjectCardForm}
			onSubmit={handleProjectCardSubmit}
			project={editingProjectCard}
			projectCardError={projectCardError}
			saving={isProjectCardSaving}
		/>
		</>
	);
};

const ProjectCardModal = ({
	deletingProjectCardId,
	form,
	isOpen,
	onClose,
	onDelete,
	onFormChange,
	onSubmit,
	project,
	projectCardError,
	saving,
}: {
	deletingProjectCardId: number | null;
	form: ProjectCardFormState;
	isOpen: boolean;
	onClose: () => void;
	onDelete: () => void;
	onFormChange: (value: ProjectCardFormState) => void;
	onSubmit: () => void;
	project: ProjectReportProject | null;
	projectCardError: string | null;
	saving: boolean;
}) => (
	<Modal isOpen={isOpen} onClose={onClose} size="small">
		<div className={`${styles.ganttFormModal} ${styles.projectCardModal}`}>
			<h3>{project ? "Карточка проекта" : "Новый проект"}</h3>
			<ProjectCardSection title="Информация">
				<ProjectCardInput
					form={form}
					label="Название"
					name="title"
					onFormChange={onFormChange}
				/>
				<ProjectCardInput
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
				<ProjectCardInput
					form={form}
					label="Компания клиента"
					name="clientCompany"
					onFormChange={onFormChange}
				/>
				<ProjectCardInput
					form={form}
					label="Сделка"
					name="deal"
					onFormChange={onFormChange}
				/>
				<ProjectCardInput
					form={form}
					label="Цель проекта"
					name="projectGoal"
					onFormChange={onFormChange}
					textarea
				/>
			</ProjectCardSection>
			<ProjectCardSection title="Отчёт аналитика">
				<ProjectCardInput
					form={form}
					label="Следующая дата отчёта"
					name="nextReportDate"
					onFormChange={onFormChange}
					type="date"
				/>
			</ProjectCardSection>
			<ProjectCardSection title="Информация для отчёта">
				<ProjectCardInput
					form={form}
					label="Дедлайн"
					name="deadline"
					onFormChange={onFormChange}
					type="date"
				/>
				<ProjectCardInput
					form={form}
					label="Редлайн"
					name="redline"
					onFormChange={onFormChange}
					type="date"
				/>
				<ProjectCardInput
					form={form}
					label="Информация для отчёта"
					name="reportInfo"
					onFormChange={onFormChange}
					textarea
				/>
			</ProjectCardSection>
			<ProjectCardSection title="Проектная команда">
				<ProjectCardInput
					form={form}
					label="Ответственный"
					name="responsible"
					onFormChange={onFormChange}
				/>
				<ProjectCardInput
					form={form}
					label="Аналитик"
					name="analyst"
					onFormChange={onFormChange}
				/>
				<ProjectCardInput
					form={form}
					label="Команда разработки"
					name="developmentTeam"
					onFormChange={onFormChange}
				/>
				<ProjectCardInput
					form={form}
					label="QA"
					name="qa"
					onFormChange={onFormChange}
				/>
			</ProjectCardSection>
			<ProjectCardSection title="ТЗ">
				<ProjectCardInput
					form={form}
					label="Дата начала написания ТЗ"
					name="tzStartDate"
					onFormChange={onFormChange}
					type="date"
				/>
				<ProjectCardInput
					form={form}
					label="Срок написания ТЗ, недель"
					name="tzWeeks"
					onFormChange={onFormChange}
					type="number"
				/>
				<ProjectCardInput
					form={form}
					label="Плановая дата завершения ТЗ"
					name="tzPlanEndDate"
					onFormChange={onFormChange}
					type="date"
				/>
				<ProjectCardInput
					form={form}
					label="Фактическая дата завершения ТЗ"
					name="tzFactEndDate"
					onFormChange={onFormChange}
					type="date"
				/>
				<ProjectCardInput
					form={form}
					label="Дата подписания ТЗ"
					name="tzSignDate"
					onFormChange={onFormChange}
					type="date"
				/>
			</ProjectCardSection>
			<ProjectCardSection title="Разработка">
				<ProjectCardInput
					form={form}
					label="Срок разработки, недель"
					name="developmentWeeks"
					onFormChange={onFormChange}
					type="number"
				/>
				<ProjectCardInput
					form={form}
					label="Плановая дата начала разработки"
					name="developmentPlanStartDate"
					onFormChange={onFormChange}
					type="date"
				/>
				<ProjectCardInput
					form={form}
					label="Плановая дата завершения разработки"
					name="developmentPlanEndDate"
					onFormChange={onFormChange}
					type="date"
				/>
				<ProjectCardInput
					form={form}
					label="Фактическая дата начала разработки"
					name="developmentFactStartDate"
					onFormChange={onFormChange}
					type="date"
				/>
				<ProjectCardInput
					form={form}
					label="Фактическая дата завершения разработки"
					name="developmentFactEndDate"
					onFormChange={onFormChange}
					type="date"
				/>
			</ProjectCardSection>
			<ProjectCardSection title="Обучение / сдача">
				<ProjectCardInput
					form={form}
					label="Срок обучения / сдачи, недель"
					name="educationWeeks"
					onFormChange={onFormChange}
					type="number"
				/>
				<ProjectCardInput
					form={form}
					label="Плановая дата начала обучения / сдачи"
					name="educationPlanStartDate"
					onFormChange={onFormChange}
					type="date"
				/>
				<ProjectCardInput
					form={form}
					label="Плановая дата завершения обучения / сдачи"
					name="educationPlanEndDate"
					onFormChange={onFormChange}
					type="date"
				/>
				<ProjectCardInput
					form={form}
					label="Фактическая дата начала обучения / сдачи"
					name="educationFactStartDate"
					onFormChange={onFormChange}
					type="date"
				/>
				<ProjectCardInput
					form={form}
					label="Фактическая дата завершения обучения / сдачи"
					name="educationFactEndDate"
					onFormChange={onFormChange}
					type="date"
				/>
				<ProjectCardInput
					form={form}
					label="Дата закрытия проекта / подписания акта"
					name="closeDate"
					onFormChange={onFormChange}
					type="date"
				/>
			</ProjectCardSection>
			{projectCardError ? (
				<p className={styles.ganttFormError}>{projectCardError}</p>
			) : null}
			<div className={styles.ganttFormActions}>
				{project ? (
					<button
						type="button"
						className={styles.ganttFormDeleteButton}
						disabled={saving}
						onClick={onDelete}
					>
						{deletingProjectCardId === project.id
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

const ProjectCardSection = ({
	children,
	title,
}: {
	children: ReactNode;
	title: string;
}) => (
	<section className={styles.projectCardSection}>
		<h4>{title}</h4>
		<div className={styles.projectCardGrid}>{children}</div>
	</section>
);

const ProjectCardInput = ({
	form,
	label,
	name,
	onFormChange,
	textarea,
	type = "text",
}: {
	form: ProjectCardFormState;
	label: string;
	name: keyof ProjectCardFormState;
	onFormChange: (value: ProjectCardFormState) => void;
	textarea?: boolean;
	type?: "date" | "number" | "text";
}) => (
	<label className={textarea ? styles.projectCardWideField : undefined}>
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
