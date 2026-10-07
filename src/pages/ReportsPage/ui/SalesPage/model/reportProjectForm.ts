import type {
	ReportProject,
	ReportProjectCreatePayload,
	ReportProjectFileKind,
	ReportProjectPayload,
	ReportProjectStatus,
	ReportProjectType,
} from "./types";

export type ReportProjectFormState = {
	[K in keyof ReportProjectPayload]-?: string;
};

export type CompanyCreationMode = "existing" | "new";

export type ProjectSummaryFormState = Pick<
	ReportProjectFormState,
	| "contractEndDate"
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
	clientCompanyId: "",
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
	projectStatus: "not_started",
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

export const projectStatusOptions: Array<{
	label: string;
	value: ReportProjectStatus;
}> = [
	{ label: "Не начат", value: "not_started" },
	{ label: "В работе", value: "in_progress" },
	{ label: "Неактивен", value: "inactive" },
	{ label: "Завершён", value: "completed" },
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

export const getProjectPlannedEndDate = (
	project?: Pick<ReportProject, "contractEndDate" | "summaryPlanCompletionDate"> | null,
) => project?.contractEndDate || project?.summaryPlanCompletionDate || "";

export const isProjectReportProject = (
	project: Pick<ReportProject, "projectType">,
) => project.projectType !== "support";

export const validateReportProjectPlanning = (
	form: Pick<ReportProjectFormState, "summaryPurchasedHours" | "projectStartDate" | "contractEndDate">,
): string | null => {
	if (form.summaryPurchasedHours.trim()) {
		const purchasedHours = numberOrNull(form.summaryPurchasedHours);
		if (purchasedHours === null || purchasedHours < 0) {
			return "Куплено часов: укажите число не меньше нуля";
		}
	}
	if (form.projectStartDate && form.contractEndDate && form.contractEndDate < form.projectStartDate) {
		return "Дата окончания проекта не может быть раньше даты начала";
	}
	return null;
};

const getLegacyEndDateClear = (
	form: Pick<ReportProjectFormState, "contractEndDate" | "summaryPlanCompletionDate">,
): Partial<ReportProjectPayload> =>
	!form.contractEndDate && form.summaryPlanCompletionDate
		? { summaryPlanCompletionDate: null }
		: {};

export const validateReportProjectLink = (
	form: ReportProjectFormState,
	{ isCreating, creationMode = "new", companyCreationMode = "existing", newCompanyTitle = "", previouslyLinked = false }: {
		isCreating: boolean;
		creationMode?: "new" | "existing";
		companyCreationMode?: CompanyCreationMode;
		newCompanyTitle?: string;
		previouslyLinked?: boolean;
	},
): string | null => {
	if (form.bitrixProjectId && !/^[1-9]\d*$/.test(form.bitrixProjectId)) {
		return "Выберите проект из списка Битрикс24";
	}
	if ((isCreating && creationMode === "existing" || previouslyLinked) && !form.bitrixProjectId) {
		return "Выберите проект из списка Битрикс24";
	}
	if (isCreating && creationMode === "new" && companyCreationMode === "new" && !newCompanyTitle.trim()) {
		return "Заполните название новой компании";
	}
	if (isCreating && creationMode === "new" && companyCreationMode === "new" && newCompanyTitle.trim().length > 255) {
		return "Название компании должно содержать не более 255 символов";
	}
	if (isCreating && creationMode === "new" && companyCreationMode === "existing" && !/^[1-9]\d*$/.test(form.clientCompanyId)) {
		return "Выберите компанию из списка для создания проекта в Битрикс24";
	}
	if (isCreating && creationMode === "new" && !form.projectGoal.trim()) {
		return "Заполните цель проекта для создания карточки в Битрикс24";
	}
	return null;
};

export const getReportProjectSaveError = (error: unknown, fallback = "Не удалось сохранить проект"): string => {
	const message = (error as { response?: { data?: { message?: unknown } } } | null)?.response?.data?.message;
	if (typeof message === "string" && message.trim()) return message;
	if (Array.isArray(message) && message.every((item) => typeof item === "string")) return message.join(". ");
	return fallback;
};

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
		clientCompanyId: project.clientCompanyId ?? "",
		contractEndDate: getProjectPlannedEndDate(project),
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
		projectStatus: project.projectStatus ?? "not_started",
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
			project.summaryPurchasedHours == null
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
	clientCompanyId: textOrNull(form.clientCompanyId),
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
	projectStatus: form.projectStatus as ReportProjectStatus,
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
	...getLegacyEndDateClear(form),
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

export const getReportProjectCreatePayload = (
	form: ReportProjectFormState,
	{
		creationMode,
		companyCreationMode,
		newCompanyTitle,
	}: {
		creationMode: "new" | "existing";
		companyCreationMode: CompanyCreationMode;
		newCompanyTitle: string;
	},
): ReportProjectCreatePayload => {
	const payload = getReportProjectPayload(form);
	if (creationMode === "new" && companyCreationMode === "new") {
		return {
			...payload,
			clientCompany: null,
			clientCompanyId: null,
			newCompanyTitle: newCompanyTitle.trim(),
		};
	}
	return payload;
};

export const getProjectSummaryForm = (
	project?: ReportProject | null,
): ProjectSummaryFormState => ({
	contractEndDate: getProjectPlannedEndDate(project),
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
	contractEndDate: dateOrNull(form.contractEndDate),
	projectAmount: numberOrNull(form.projectAmount),
	summaryFactCompletionDate: dateOrNull(form.summaryFactCompletionDate),
	summaryFactHours: numberOrNull(form.summaryFactHours),
	summaryLossHours: numberOrNull(form.summaryLossHours),
	summaryMarginPercent: numberOrNull(form.summaryMarginPercent),
	...getLegacyEndDateClear(form),
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
