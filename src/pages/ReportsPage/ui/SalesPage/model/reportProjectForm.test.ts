import { describe, expect, it } from "vitest";
import {
	DEFAULT_REPORT_PROJECT_FORM,
	getReportProjectForm,
	getReportProjectCreatePayload,
	getReportProjectPayload,
	getReportProjectSaveError,
	validateReportProjectLink,
} from "./reportProjectForm";
import type { ReportProject } from "./types";

describe("project link form", () => {
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
