import { describe, expect, it } from "vitest";
import {
	DEFAULT_REPORT_PROJECT_FORM,
	getReportProjectForm,
	getProjectPlannedEndDate,
	getProjectSummaryForm,
	getProjectSummaryPayload,
	getReportProjectCreatePayload,
	getReportProjectPayload,
	getReportProjectSaveError,
	validateReportProjectLink,
	validateReportProjectPlanning,
} from "./reportProjectForm";
import type { ReportProject } from "./types";

describe("project link form", () => {
	it.each(["", "0", "12.5", "12,5"])("accepts blank, zero and nonnegative purchased hours %s", (hours) => {
		expect(validateReportProjectPlanning({ ...DEFAULT_REPORT_PROJECT_FORM, summaryPurchasedHours: hours })).toBeNull();
	});
	it.each(["-1", "-0.5", "not-a-number", "Infinity"])("rejects invalid purchased hours %s without silently clearing them", (hours) => {
		expect(validateReportProjectPlanning({ ...DEFAULT_REPORT_PROJECT_FORM, summaryPurchasedHours: hours })).toContain("не меньше нуля");
	});
	it("checks the contract range and permits blank dates or a one-day project", () => {
		const form = { ...DEFAULT_REPORT_PROJECT_FORM, projectStartDate: "2026-10-08", contractEndDate: "2026-10-07" };
		expect(validateReportProjectPlanning(form)).toContain("раньше даты начала");
		expect(validateReportProjectPlanning({ ...form, contractEndDate: "2026-10-08" })).toBeNull();
		expect(validateReportProjectPlanning({ ...form, contractEndDate: "" })).toBeNull();
		expect(validateReportProjectPlanning({ ...form, projectStartDate: "" })).toBeNull();
	});
	it("round-trips the local project dates and zero purchased hours without substituting actual or legacy dates", () => {
		const form = { ...DEFAULT_REPORT_PROJECT_FORM, title: "Проект", projectStartDate: "2026-10-01", contractEndDate: "2026-12-31", summaryFactCompletionDate: "2027-01-05", summaryPlanCompletionDate: "2026-12-01", summaryPurchasedHours: "0" };
		const payload = getReportProjectPayload(form);
		expect(payload).toMatchObject({ projectStartDate: "2026-10-01", contractEndDate: "2026-12-31", summaryFactCompletionDate: "2027-01-05", summaryPurchasedHours: 0 });
		expect(payload).not.toHaveProperty("summaryPlanCompletionDate");
		const project = { ...payload, summaryPlanCompletionDate: form.summaryPlanCompletionDate, id: 1 } as ReportProject;
		expect(getReportProjectForm(project)).toMatchObject({ projectStartDate: "2026-10-01", contractEndDate: "2026-12-31", summaryPurchasedHours: "0" });
		expect(getProjectSummaryForm(project).contractEndDate).toBe("2026-12-31");
	});

	it("uses only a legitimate saved planned end as fallback when the canonical date is missing", () => {
		const project = { id: 1, title: "Старый проект", contractEndDate: null, summaryPlanCompletionDate: "2026-12-01", summaryFactCompletionDate: "2027-01-05" } as ReportProject;
		expect(getProjectPlannedEndDate(project)).toBe("2026-12-01");
		expect(getReportProjectForm(project).contractEndDate).toBe("2026-12-01");
		expect(getProjectSummaryForm(project).contractEndDate).toBe("2026-12-01");
		expect(getProjectPlannedEndDate({ contractEndDate: null, summaryPlanCompletionDate: null })).toBe("");
		expect(getReportProjectForm({ ...project, summaryPlanCompletionDate: null }).contractEndDate).toBe("");
	});

	it("writes an edited planned date to the canonical field without mirroring the legacy column", () => {
		const project = { id: 1, title: "Старый проект", contractEndDate: null, summaryPlanCompletionDate: "2026-12-01", summaryFactCompletionDate: "2027-01-05" } as ReportProject;
		const form = { ...getReportProjectForm(project), contractEndDate: "2026-12-31" };
		const payload = getReportProjectPayload(form);
		expect(payload.contractEndDate).toBe("2026-12-31");
		expect(payload).not.toHaveProperty("summaryPlanCompletionDate");
		expect(payload.summaryFactCompletionDate).toBe("2027-01-05");
		const summaryPayload = getProjectSummaryPayload({ ...getProjectSummaryForm(project), contractEndDate: "2026-12-31" });
		expect(summaryPayload.contractEndDate).toBe("2026-12-31");
		expect(summaryPayload).not.toHaveProperty("summaryPlanCompletionDate");
	});

	it("clears an explicitly removed end date and its legacy fallback without clearing actual completion", () => {
		const project = { id: 1, title: "Старый проект", contractEndDate: "2026-12-31", summaryPlanCompletionDate: "2026-12-01", summaryFactCompletionDate: "2027-01-05" } as ReportProject;
		const payload = getReportProjectPayload({ ...getReportProjectForm(project), contractEndDate: "" });
		expect(payload).toMatchObject({ contractEndDate: null, summaryPlanCompletionDate: null, summaryFactCompletionDate: "2027-01-05" });
		expect(getReportProjectForm({ ...project, ...payload }).contractEndDate).toBe("");
		expect(getProjectSummaryPayload({ ...getProjectSummaryForm(project), contractEndDate: "" })).toMatchObject({ contractEndDate: null, summaryPlanCompletionDate: null });
	});

	it("requires a nonblank company name in company creation mode without demanding an existing company ID", () => {
		const form = { ...DEFAULT_REPORT_PROJECT_FORM, projectGoal: "Запустить CRM" };
		expect(validateReportProjectLink(form, { isCreating: true, companyCreationMode: "new", newCompanyTitle: "  " })).toContain("название новой компании");
		expect(validateReportProjectLink(form, { isCreating: true, companyCreationMode: "new", newCompanyTitle: "Новая компания" })).toBeNull();
		expect(validateReportProjectLink(form, { isCreating: true, companyCreationMode: "new", newCompanyTitle: "К".repeat(256) })).toContain("255");
	});
	it("uses only the trimmed creation-only company title and ignores stale selected-company data", () => {
		const form = { ...DEFAULT_REPORT_PROJECT_FORM, title: "Проект", clientCompanyId: "11", clientCompany: "Старая компания" };
		expect(getReportProjectCreatePayload(form, { creationMode: "new", companyCreationMode: "new", newCompanyTitle: "  Новая компания  " })).toMatchObject({ newCompanyTitle: "Новая компания", clientCompanyId: null, clientCompany: null });
		expect(getReportProjectPayload(form)).not.toHaveProperty("newCompanyTitle");
		expect(getReportProjectCreatePayload(form, { creationMode: "new", companyCreationMode: "existing", newCompanyTitle: "Черновик" })).not.toHaveProperty("newCompanyTitle");
		expect(getReportProjectCreatePayload({ ...form, bitrixProjectId: "77" }, { creationMode: "existing", companyCreationMode: "new", newCompanyTitle: "Черновик" })).toMatchObject({ bitrixProjectId: "77", clientCompanyId: "11" });
		expect(getReportProjectCreatePayload(form, { creationMode: "existing", companyCreationMode: "new", newCompanyTitle: "Черновик" })).not.toHaveProperty("newCompanyTitle");
	});
	it("does not validate a stale new-company draft when editing or linking an existing card", () => {
		expect(validateReportProjectLink(DEFAULT_REPORT_PROJECT_FORM, { isCreating: false, companyCreationMode: "new" })).toBeNull();
		expect(validateReportProjectLink({ ...DEFAULT_REPORT_PROJECT_FORM, bitrixProjectId: "77" }, { isCreating: true, creationMode: "existing", companyCreationMode: "new" })).toBeNull();
	});
	it("requires choosing a company for an automatically created Bitrix card", () => {
		expect(validateReportProjectLink({ ...DEFAULT_REPORT_PROJECT_FORM, clientCompany: "Компания" }, { isCreating: true })).toContain("Выберите компанию");
		expect(validateReportProjectLink({ ...DEFAULT_REPORT_PROJECT_FORM, clientCompanyId: "11", clientCompany: "Компания", projectGoal: "Запустить CRM" }, { isCreating: true })).toBeNull();
	});
	it("requires the portal's mandatory goal only when automatically creating a new card", () => {
		const form = { ...DEFAULT_REPORT_PROJECT_FORM, clientCompanyId: "11" };
		expect(validateReportProjectLink(form, { isCreating: true })).toContain("цель проекта");
		expect(validateReportProjectLink({ ...form, bitrixProjectId: "77" }, { isCreating: true, creationMode: "existing" })).toBeNull();
	});
	it("requires an actual project selection in existing-project mode", () => {
		expect(validateReportProjectLink(DEFAULT_REPORT_PROJECT_FORM, { isCreating: true, creationMode: "existing" })).toContain("Выберите проект");
		expect(validateReportProjectLink({ ...DEFAULT_REPORT_PROJECT_FORM, bitrixProjectId: "Внедрение CRM" }, { isCreating: true, creationMode: "existing" })).toContain("Выберите проект");
		expect(validateReportProjectLink({ ...DEFAULT_REPORT_PROJECT_FORM, bitrixProjectId: "77" }, { isCreating: true, creationMode: "existing" })).toBeNull();
	});
	it("allows routine editing of legacy unlinked projects but prevents clearing an existing relation by typing", () => {
		expect(validateReportProjectLink(DEFAULT_REPORT_PROJECT_FORM, { isCreating: false })).toBeNull();
		expect(validateReportProjectLink(DEFAULT_REPORT_PROJECT_FORM, { isCreating: false, previouslyLinked: true })).toContain("Выберите проект");
	});
	it("preserves company IDs across payload and form conversions", () => {
		const form = { ...DEFAULT_REPORT_PROJECT_FORM, title: "Проект", clientCompanyId: "11", clientCompany: "Компания" };
		expect(getReportProjectPayload(form)).toMatchObject({ clientCompanyId: "11", clientCompany: "Компания" });
		expect(getReportProjectForm({ ...getReportProjectPayload(form), id: 1 } as ReportProject).clientCompanyId).toBe("11");
		expect(getReportProjectForm({ id: 2, title: "Старый проект" } as ReportProject).clientCompanyId).toBe("");
	});
	it("shows the actionable API validation error on save", () => {
		expect(getReportProjectSaveError({ response: { data: { message: "В выбранной карточке проекта не указана компания" } } })).toContain("не указана компания");
		expect(getReportProjectSaveError(new Error("transport"))).toBe("Не удалось сохранить проект");
	});
});
