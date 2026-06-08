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
};

export type ProjectPayment = {
	id: number | string;
	title?: string;
	createdTime?: string;
	stageId: string;
	[key: string]: BitrixFieldValue;
};

export type BitrixFieldPrimitive = string | number | boolean | null | undefined;

export type BitrixFieldValue =
	| BitrixFieldPrimitive
	| BitrixFieldPrimitive[]
	| {
			title?: BitrixFieldPrimitive;
			name?: BitrixFieldPrimitive;
			value?: BitrixFieldPrimitive;
			VALUE?: BitrixFieldPrimitive;
			label?: BitrixFieldPrimitive;
	  };

export type DealSummary = {
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
	| "deal"
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
