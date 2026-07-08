import { ProjectCodes } from "@/components/calendar/constants/const";
import type { ReportProps } from "@/components/calendar/types/types";
import type { ClientProjectProps, TaskProps } from "@/shared/types/types";
import type { ProjectGanttCodes } from "./constants";

type ProjectGanttFieldCode =
	(typeof ProjectGanttCodes)[keyof typeof ProjectGanttCodes];

type ProjectGanttFields = {
	[field in ProjectGanttFieldCode]?: string | number | null;
};

export type ProfitabilityProject = ClientProjectProps & ProjectGanttFields & {
	tasks: TaskProps[];
	reports: ReportProps[];
	payments: ProjectPayment[];
	[ProjectCodes.financialProjectType]?: string | string[] | null;
	[ProjectCodes.projectAmount]?: string | number | null;
};

export type CompanyFinancialGroup = {
	id: string;
	title: string;
	type: "waterfall";
	companyId: string;
	companyTitle: string;
	parentProject: ProfitabilityProject;
	projects: ProfitabilityProject[];
};

export type CompanyProjectGroup = {
	id: string;
	title: string;
	financialGroups: CompanyFinancialGroup[];
};

export type ProjectPayment = {
	id: string;
	title?: string;
	createdTime?: string;
	stageId?: string | null;
	[ProjectCodes.paymentStageBinding]?: string | string[] | null;
	[ProjectCodes.paymentPercent]?: string | null;
	[ProjectCodes.paymentAmount]?: string | null;
	[ProjectCodes.paymentDate]?: string | null;
	[ProjectCodes.paymentWaitingDays]?: string | null;
	[ProjectCodes.paymentProject]?: string | null;
};

export type CustomGanttEventKind = "one_time" | "duration";

export type CustomGanttEvent = {
	id: number;
	bitrixProjectId: string;
	title: string;
	eventKind: CustomGanttEventKind;
	planStartDate: string | null;
	planEndDate: string | null;
	factStartDate: string | null;
	factEndDate: string | null;
	sortOrder: number;
	createdAt?: string;
	updatedAt?: string;
};

export type CustomGanttEventPayload = {
	title: string;
	eventKind: CustomGanttEventKind;
	planStartDate?: string | null;
	planEndDate?: string | null;
	factStartDate?: string | null;
	factEndDate?: string | null;
	sortOrder?: number | null;
};

export type GanttIncidentEntityType =
	| "bitrix_stage"
	| "custom_event"
	| "payment_waiting_overdue";

export type GanttIncidentFile = {
	id: number;
	incidentId?: number;
	originalName: string;
	mimeType: string;
	sizeBytes: number;
	storagePath?: string;
	createdAt: string;
};

export type GanttIncident = {
	id: number;
	bitrixProjectId: string;
	entityType: GanttIncidentEntityType;
	entityId: string;
	title: string;
	description: string | null;
	incidentDate: string;
	files: GanttIncidentFile[];
	createdAt: string;
	updatedAt: string;
};

export type GanttIncidentPayload = {
	entityType: GanttIncidentEntityType;
	entityId: string;
	title?: string | null;
	description?: string | null;
	incidentDate: string;
};

export type AutonomousGanttEventKind = "one_time" | "duration";

export type AutonomousPaymentStatus = "todo" | "debt" | "paid" | "canceled";
export type AutonomousPaymentAnchor = "stage_start" | "stage_end";
export type ProjectGanttDependencyAnchor = "stage_start" | "stage_end";

export type ProjectGanttStageType =
	| "tz_writing"
	| "tz_signing"
	| "contracting"
	| "development"
	| "education"
	| "delivery"
	| "closing";

export type ProjectGanttStage = {
	id: number;
	projectId: string;
	title: string;
	code: string;
	stageType: ProjectGanttStageType | "payments" | null;
	dependsOnStageId: number | null;
	dependencyAnchor: ProjectGanttDependencyAnchor | null;
	durationDays: number | null;
	sortOrder: number;
	isDefault: boolean;
	createdAt: string;
	updatedAt: string;
};

export type ProjectGanttStagePayload = {
	title?: string;
	code?: string;
	stageType?: ProjectGanttStageType | null;
	dependsOnStageId?: number | null;
	dependencyAnchor?: ProjectGanttDependencyAnchor | null;
	durationDays?: number | null;
	sortOrder?: number | null;
};

export type ProjectGanttEvent = {
	id: number;
	projectId: string;
	stageId: number;
	title: string;
	eventKind: AutonomousGanttEventKind;
	planStartDate: string | null;
	planEndDate: string | null;
	factStartDate: string | null;
	factEndDate: string | null;
	sortOrder: number;
	createdAt: string;
	updatedAt: string;
};

export type ProjectGanttEventPayload = {
	stageId: number;
	title: string;
	eventKind: AutonomousGanttEventKind;
	planStartDate?: string | null;
	planEndDate?: string | null;
	factStartDate?: string | null;
	factEndDate?: string | null;
	sortOrder?: number | null;
};

export type AutonomousProjectPayment = {
	id: number;
	projectId: string;
	stageId: number;
	status: AutonomousPaymentStatus;
	paymentAnchor: AutonomousPaymentAnchor | null;
	paymentDate: string | null;
	percent: number | null;
	amount: number | null;
	waitingDays: number | null;
	sortOrder: number;
	createdAt: string;
	updatedAt: string;
};

export type AutonomousProjectPaymentPayload = {
	stageId: number;
	status: AutonomousPaymentStatus;
	paymentAnchor?: AutonomousPaymentAnchor | null;
	paymentDate?: string | null;
	percent?: number | null;
	amount?: number | null;
	waitingDays?: number | null;
	sortOrder?: number | null;
};

export type ReportProjectType = "none" | "waterfall" | "support";

export type ReportProjectFileKind = "estimate" | "technical_specification";

export type ReportProjectFile = {
	id: number;
	projectId: number;
	fileKind: ReportProjectFileKind;
	originalName: string;
	mimeType: string;
	sizeBytes: number;
	storagePath: string;
	createdAt: string;
};

export type ProjectReportEntryFile = {
	id: number;
	reportEntryId: number;
	originalName: string;
	storedName: string;
	mimeType: string;
	size: number;
	path: string;
	createdAt: string;
};

export type ProjectReportEntry = {
	id: number;
	projectId: number;
	authorId: string | null;
	authorName: string;
	text: string;
	reportDate: string;
	nextReportDate: string | null;
	files: ProjectReportEntryFile[];
	createdAt: string;
	updatedAt: string;
};

export type CreateProjectReportEntryPayload = {
	authorName: string;
	authorId?: string | null;
	text: string;
	nextReportDate?: string | null;
};

export type UpdateProjectReportEntryPayload = {
	authorName?: string;
	authorId?: string | null;
	text?: string;
	nextReportDate?: string | null;
};

export type ReportProject = {
	id: number;
	bitrixProjectId: string | null;
	title: string;
	projectAmount: number | null;
	summaryMarginPercent: number | null;
	summaryPurchasedHours: number | null;
	summaryPlanHours: number | null;
	summaryFactHours: number | null;
	summaryLossHours: number | null;
	summaryPlanCompletionDate: string | null;
	summaryFactCompletionDate: string | null;
	projectType: ReportProjectType;
	projectGoal: string | null;
	projectStartDate: string | null;
	contractEndDate: string | null;
	clientCompany: string | null;
	deal: string | null;
	nextReportDate: string | null;
	nextProjectReportDate: string | null;
	reportInfo: string | null;
	deadline: string | null;
	redline: string | null;
	responsible: string | null;
	responsibleId: string | null;
	salesManager: string | null;
	salesManagerId: string | null;
	analyst: string | null;
	analystId: string | null;
	developmentTeam: string | null;
	developmentTeamIds: string | null;
	qa: string | null;
	qaId: string | null;
	tzStartDate: string | null;
	tzWeeks: number | null;
	tzPlanEndDate: string | null;
	tzFactEndDate: string | null;
	tzSignDate: string | null;
	developmentWeeks: number | null;
	developmentPlanStartDate: string | null;
	developmentPlanEndDate: string | null;
	developmentFactStartDate: string | null;
	developmentFactEndDate: string | null;
	educationWeeks: number | null;
	educationPlanStartDate: string | null;
	educationPlanEndDate: string | null;
	educationFactStartDate: string | null;
	educationFactEndDate: string | null;
	closeDate: string | null;
	files: ReportProjectFile[];
	createdAt: string;
	updatedAt: string;
};

export type ReportProjectPayload = {
	title: string;
	bitrixProjectId?: string | null;
	projectAmount?: number | null;
	summaryMarginPercent?: number | null;
	summaryPurchasedHours?: number | null;
	summaryPlanHours?: number | null;
	summaryFactHours?: number | null;
	summaryLossHours?: number | null;
	summaryPlanCompletionDate?: string | null;
	summaryFactCompletionDate?: string | null;
	projectType?: ReportProjectType;
	projectGoal?: string | null;
	projectStartDate?: string | null;
	contractEndDate?: string | null;
	clientCompany?: string | null;
	deal?: string | null;
	nextReportDate?: string | null;
	reportInfo?: string | null;
	deadline?: string | null;
	redline?: string | null;
	responsible?: string | null;
	responsibleId?: string | null;
	salesManager?: string | null;
	salesManagerId?: string | null;
	analyst?: string | null;
	analystId?: string | null;
	developmentTeam?: string | null;
	developmentTeamIds?: string | null;
	qa?: string | null;
	qaId?: string | null;
	tzStartDate?: string | null;
	tzWeeks?: number | null;
	tzPlanEndDate?: string | null;
	tzFactEndDate?: string | null;
	tzSignDate?: string | null;
	developmentWeeks?: number | null;
	developmentPlanStartDate?: string | null;
	developmentPlanEndDate?: string | null;
	developmentFactStartDate?: string | null;
	developmentFactEndDate?: string | null;
	educationWeeks?: number | null;
	educationPlanStartDate?: string | null;
	educationPlanEndDate?: string | null;
	educationFactStartDate?: string | null;
	educationFactEndDate?: string | null;
	closeDate?: string | null;
};

export type FinancialProjectSummary = {
	purchasedHours: number;
	revenue: number;
	planHours: number;
	factHours: number;
	lossHours: number;
	companyHours: number;
	unpaidHours: number;
	marginPercent: number;
	profit: number;
};

export type SalesProfitabilityTab =
	| "marginality"
	| "projects"
	| "projectDetails"
	| "tasks"
	| "reports"
	| "projectReports";

export type ProfitabilityTaskItem = {
	task: TaskProps;
	project: ProfitabilityProject;
};

export type ProfitabilityReportItem = {
	report: ReportProps;
	project: ProfitabilityProject;
};
