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
	[ProjectCodes.paymentProject]?: string | null;
};

export type FinancialProjectSummary = {
	purchasedHours: number;
	revenue: number;
	planHours: number;
	factHours: number;
	lossHours: number;
	companyHours: number;
	unpaidHours: number;
	mockMarginPercent: number;
	mockProfit: number;
};

export type SalesProfitabilityTab =
	| "marginality"
	| "projects"
	| "tasks"
	| "reports";

export type ProfitabilityTaskItem = {
	task: TaskProps;
	project: ProfitabilityProject;
};

export type ProfitabilityReportItem = {
	report: ReportProps;
	project: ProfitabilityProject;
};
