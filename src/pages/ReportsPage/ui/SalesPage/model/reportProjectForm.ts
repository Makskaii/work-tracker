import type {
	ReportProject,
	ReportProjectFileKind,
	ReportProjectPayload,
	ReportProjectType,
} from "./types";

export type ReportProjectFormState = {
	[K in keyof ReportProjectPayload]-?: string;
};

export type ProjectSummaryFormState = Pick<
	ReportProjectFormState,
	| "projectAmount"
	| "summaryFactCompletionDate"
	| "summaryFactHours"
	| "summaryLossHours"
	| "summaryMarginPercent"
	| "summaryPlanCompletionDate"
	| "summaryPlanHours"
	| "summaryPurchasedHours"
	| "tzPurchasedHours"
	| "tzPlanHours"
	| "tzFactHours"
	| "developmentPurchasedHours"
	| "educationPurchasedHours"
	| "educationPlanHours"
	| "educationFactHours"
>;

export type ReportProjectFileDrafts = Partial<Record<ReportProjectFileKind, File[]>>;

export const DEFAULT_REPORT_PROJECT_FORM: ReportProjectFormState = {
	analyst: "",
	analystId: "",
	bitrixProjectId: "",
	clientCompany: "",
	contractEndDate: "",
	closeDate: "",
	deadline: "",
	deal: "",
	developmentFactEndDate: "",
	developmentFactStartDate: "",
	developmentPlanEndDate: "",
	developmentPlanStartDate: "",
	developmentPurchasedHours: "",
	developmentTeam: "",
	developmentTeamIds: "",
	developmentWeeks: "",
	educationFactEndDate: "",
	educationFactStartDate: "",
	educationPlanEndDate: "",
	educationPlanStartDate: "",
	educationPurchasedHours: "",
	educationPlanHours: "",
	educationFactHours: "",
	educationWeeks: "",
	nextReportDate: "",
	projectAmount: "",
	projectGoal: "",
	projectStartDate: "",
	projectType: "none",
	qa: "",
	qaId: "",
	redline: "",
	reportInfo: "",
	responsible: "",
	responsibleId: "",
	salesManager: "",
	salesManagerId: "",
	summaryFactCompletionDate: "",
	summaryFactHours: "",
	summaryLossHours: "",
	summaryMarginPercent: "",
	summaryPlanCompletionDate: "",
	summaryPlanHours: "",
	summaryPurchasedHours: "",
	title: "",
	tzFactEndDate: "",
	tzPurchasedHours: "",
	tzPlanHours: "",
	tzFactHours: "",
	tzPlanEndDate: "",
	tzSignDate: "",
	tzStartDate: "",
	tzWeeks: "",
};

export const projectTypeOptions: Array<{
	label: string;
	value: ReportProjectType;
}> = [
	{ label: "Не выбрано", value: "none" },
	{ label: "Вотерфол", value: "waterfall" },
	{ label: "Техпод", value: "support" },
];

export const reportProjectFileLabels: Record<ReportProjectFileKind, string> = {
	estimate: "Смета / КП",
	technical_specification: "Файл ТЗ",
};

export const textOrNull = (value: string) => {
	const trimmedValue = value.trim();

	return trimmedValue ? trimmedValue : null;
};

export const numberOrNull = (value: string) => {
	const normalizedValue = value.replace(/\s/g, "").replace(",", ".");

	if (!normalizedValue) {
		return null;
	}

	const parsedValue = Number(normalizedValue);

	return Number.isFinite(parsedValue) ? parsedValue : null;
};

const dateOrNull = (value: string) => value || null;

export const getReportProjectForm = (
	project?: ReportProject | null,
): ReportProjectFormState => {
	if (!project) {
		return DEFAULT_REPORT_PROJECT_FORM;
	}

	return {
		analyst: project.analyst ?? "",
		analystId: project.analystId ?? "",
		bitrixProjectId: project.bitrixProjectId ?? "",
		clientCompany: project.clientCompany ?? "",
		contractEndDate: project.contractEndDate ?? "",
		closeDate: project.closeDate ?? "",
		deadline: project.deadline ?? "",
		deal: project.deal ?? "",
		developmentFactEndDate: project.developmentFactEndDate ?? "",
		developmentFactStartDate: project.developmentFactStartDate ?? "",
		developmentPlanEndDate: project.developmentPlanEndDate ?? "",
		developmentPlanStartDate: project.developmentPlanStartDate ?? "",
		developmentPurchasedHours:
			project.developmentPurchasedHours == null
				? ""
				: String(project.developmentPurchasedHours),
		developmentTeam: project.developmentTeam ?? "",
		developmentTeamIds: project.developmentTeamIds ?? "",
		developmentWeeks:
			project.developmentWeeks === null ? "" : String(project.developmentWeeks),
		educationFactEndDate: project.educationFactEndDate ?? "",
		educationFactStartDate: project.educationFactStartDate ?? "",
		educationPlanEndDate: project.educationPlanEndDate ?? "",
		educationPlanStartDate: project.educationPlanStartDate ?? "",
		educationPurchasedHours:
			project.educationPurchasedHours == null
				? ""
				: String(project.educationPurchasedHours),
		educationPlanHours:
			project.educationPlanHours == null
				? ""
				: String(project.educationPlanHours),
		educationFactHours:
			project.educationFactHours == null
				? ""
				: String(project.educationFactHours),
		educationWeeks:
			project.educationWeeks === null ? "" : String(project.educationWeeks),
		nextReportDate: project.nextReportDate ?? "",
		projectAmount:
			project.projectAmount === null ? "" : String(project.projectAmount),
		projectGoal: project.projectGoal ?? "",
		projectStartDate: project.projectStartDate ?? "",
		projectType: project.projectType,
		qa: project.qa ?? "",
		qaId: project.qaId ?? "",
		redline: project.redline ?? "",
		reportInfo: project.reportInfo ?? "",
		responsible: project.responsible ?? "",
		responsibleId: project.responsibleId ?? "",
		salesManager: project.salesManager ?? "",
		salesManagerId: project.salesManagerId ?? "",
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
		tzPurchasedHours:
			project.tzPurchasedHours == null ? "" : String(project.tzPurchasedHours),
		tzPlanHours:
			project.tzPlanHours == null ? "" : String(project.tzPlanHours),
		tzFactHours:
			project.tzFactHours == null ? "" : String(project.tzFactHours),
		tzPlanEndDate: project.tzPlanEndDate ?? "",
		tzSignDate: project.tzSignDate ?? "",
		tzStartDate: project.tzStartDate ?? "",
		tzWeeks: project.tzWeeks === null ? "" : String(project.tzWeeks),
	};
};

export const getReportProjectPayload = (
	form: ReportProjectFormState,
): ReportProjectPayload => ({
	analyst: textOrNull(form.analyst),
	analystId: textOrNull(form.analystId),
	bitrixProjectId: textOrNull(form.bitrixProjectId),
	clientCompany: textOrNull(form.clientCompany),
	contractEndDate: dateOrNull(form.contractEndDate),
	closeDate: dateOrNull(form.closeDate),
	deadline: dateOrNull(form.deadline),
	deal: textOrNull(form.deal),
	developmentFactEndDate: dateOrNull(form.developmentFactEndDate),
	developmentFactStartDate: dateOrNull(form.developmentFactStartDate),
	developmentPlanEndDate: dateOrNull(form.developmentPlanEndDate),
	developmentPlanStartDate: dateOrNull(form.developmentPlanStartDate),
	developmentPurchasedHours: numberOrNull(form.developmentPurchasedHours),
	developmentTeam: textOrNull(form.developmentTeam),
	developmentTeamIds: textOrNull(form.developmentTeamIds),
	developmentWeeks: numberOrNull(form.developmentWeeks),
	educationFactEndDate: dateOrNull(form.educationFactEndDate),
	educationFactStartDate: dateOrNull(form.educationFactStartDate),
	educationPlanEndDate: dateOrNull(form.educationPlanEndDate),
	educationPlanStartDate: dateOrNull(form.educationPlanStartDate),
	educationPurchasedHours: numberOrNull(form.educationPurchasedHours),
	educationPlanHours: numberOrNull(form.educationPlanHours),
	educationFactHours: numberOrNull(form.educationFactHours),
	educationWeeks: numberOrNull(form.educationWeeks),
	nextReportDate: dateOrNull(form.nextReportDate),
	projectAmount: numberOrNull(form.projectAmount),
	projectGoal: textOrNull(form.projectGoal),
	projectStartDate: dateOrNull(form.projectStartDate),
	projectType: form.projectType as ReportProjectType,
	qa: textOrNull(form.qa),
	qaId: textOrNull(form.qaId),
	redline: dateOrNull(form.redline),
	reportInfo: textOrNull(form.reportInfo),
	responsible: textOrNull(form.responsible),
	responsibleId: textOrNull(form.responsibleId),
	salesManager: textOrNull(form.salesManager),
	salesManagerId: textOrNull(form.salesManagerId),
	summaryFactCompletionDate: dateOrNull(form.summaryFactCompletionDate),
	summaryFactHours: numberOrNull(form.summaryFactHours),
	summaryLossHours: numberOrNull(form.summaryLossHours),
	summaryMarginPercent: numberOrNull(form.summaryMarginPercent),
	summaryPlanCompletionDate: dateOrNull(form.summaryPlanCompletionDate),
	summaryPlanHours: numberOrNull(form.summaryPlanHours),
	summaryPurchasedHours: numberOrNull(form.summaryPurchasedHours),
	title: form.title.trim(),
	tzFactEndDate: dateOrNull(form.tzFactEndDate),
	tzPurchasedHours: numberOrNull(form.tzPurchasedHours),
	tzPlanHours: numberOrNull(form.tzPlanHours),
	tzFactHours: numberOrNull(form.tzFactHours),
	tzPlanEndDate: dateOrNull(form.tzPlanEndDate),
	tzSignDate: dateOrNull(form.tzSignDate),
	tzStartDate: dateOrNull(form.tzStartDate),
	tzWeeks: numberOrNull(form.tzWeeks),
});

export const getProjectSummaryForm = (
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
	tzPurchasedHours:
		project?.tzPurchasedHours === null || project?.tzPurchasedHours === undefined
			? ""
			: String(project.tzPurchasedHours),
	tzPlanHours:
		project?.tzPlanHours === null || project?.tzPlanHours === undefined
			? ""
			: String(project.tzPlanHours),
	tzFactHours:
		project?.tzFactHours === null || project?.tzFactHours === undefined
			? ""
			: String(project.tzFactHours),
	developmentPurchasedHours:
		project?.developmentPurchasedHours === null ||
		project?.developmentPurchasedHours === undefined
			? ""
			: String(project.developmentPurchasedHours),
	educationPurchasedHours:
		project?.educationPurchasedHours === null ||
		project?.educationPurchasedHours === undefined
			? ""
			: String(project.educationPurchasedHours),
	educationPlanHours:
		project?.educationPlanHours === null || project?.educationPlanHours === undefined
			? ""
			: String(project.educationPlanHours),
	educationFactHours:
		project?.educationFactHours === null || project?.educationFactHours === undefined
			? ""
			: String(project.educationFactHours),
});

export const getProjectSummaryPayload = (
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
	tzPurchasedHours: numberOrNull(form.tzPurchasedHours),
	tzPlanHours: numberOrNull(form.tzPlanHours),
	tzFactHours: numberOrNull(form.tzFactHours),
	developmentPurchasedHours: numberOrNull(form.developmentPurchasedHours),
	educationPurchasedHours: numberOrNull(form.educationPurchasedHours),
	educationPlanHours: numberOrNull(form.educationPlanHours),
	educationFactHours: numberOrNull(form.educationFactHours),
});
