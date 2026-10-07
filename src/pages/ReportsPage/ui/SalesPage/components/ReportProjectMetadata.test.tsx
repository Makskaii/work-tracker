import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	DEFAULT_REPORT_PROJECT_FORM,
	getProjectSummaryForm,
	getReportProjectForm,
	getReportProjectPayload,
} from "../model/reportProjectForm";
import type { FinancialProjectSummary, ReportProject, ReportProjectPayload } from "../model/types";
import { ReportProjectDetailsTab } from "./ReportProjectDetailsTab";
import { ReportProjectModal } from "./ReportProjectModal";
import { SummaryCards } from "./SummaryCards";

vi.mock("./ReportProjectLinkFields", () => ({ ReportProjectLinkFields: () => null }));

const createStoredProject = (overrides: Partial<ReportProject> = {}): ReportProject => ({
	...getReportProjectPayload({ ...DEFAULT_REPORT_PROJECT_FORM, title: "Проект CRM" }),
	id: 1,
	nextProjectReportDate: null,
	summaryPlanCompletionDate: null,
	files: [],
	...overrides,
}) as ReportProject;

function MetadataWorkspace({ initialProject = null, onSaved }: {
	initialProject?: ReportProject | null;
	onSaved: (payload: ReportProjectPayload) => void;
}) {
	const [project, setProject] = useState(initialProject);
	const [view, setView] = useState<"create" | "summary" | "details" | "edit">(initialProject ? "summary" : "create");
	const [form, setForm] = useState(getReportProjectForm(initialProject));
	const open = (nextView: "details" | "edit") => {
		setForm(getReportProjectForm(project));
		setView(nextView);
	};
	const save = () => {
		const payload = getReportProjectPayload(form);
		onSaved(payload);
		const saved = { ...(project ?? createStoredProject()), ...payload } as ReportProject;
		setProject(saved);
		setForm(getReportProjectForm(saved));
		setView("summary");
	};
	const summary: FinancialProjectSummary = {
		purchasedHours: project?.summaryPurchasedHours ?? 0,
		revenue: project?.projectAmount ?? 0,
		planHours: project?.summaryPlanHours ?? 0,
		factHours: project?.summaryFactHours ?? 0,
		lossHours: 0,
		companyHours: 0,
		unpaidHours: 0,
		marginPercent: 0,
		profit: 0,
	};
	return <>
		{view === "summary" && project ? <>
			<SummaryCards form={getProjectSummaryForm(project)} onEditProject={() => open("edit")} projectTitle={project.title}
				projectStatus={project.projectStatus} projectType={project.projectType} summary={summary} areAutomaticHoursUnavailable />
			<button type="button" onClick={() => open("details")}>Открыть детали</button>
		</> : null}
		{view === "details" && project ? <ReportProjectDetailsTab bitrixProjectOptions={[]} companyOptions={[]}
			detailsFileDrafts={{}} detailsProjectError={null} form={form} isSaving={false} onFileDelete={vi.fn()}
			onFileDownload={vi.fn()} onFileDraftChange={vi.fn()} onFormChange={setForm} onSave={save} project={project}
			shouldShowSave users={[]} /> : null}
		<ReportProjectModal bitrixProjectOptions={[]} companyOptions={[]} creationMode="new" onCreationModeChange={vi.fn()}
			companyCreationMode="existing" onCompanyCreationModeChange={vi.fn()} newCompanyTitle="" onNewCompanyTitleChange={vi.fn()}
			deletingReportProjectId={null} fileDrafts={{}} form={form} isOpen={view === "create" || view === "edit"}
			onClose={() => setView("summary")} onDelete={vi.fn()} onFileDelete={vi.fn()} onFileDownload={vi.fn()}
			onFileDraftChange={vi.fn()} onFormChange={setForm} onSubmit={save} project={project} projectFormError={null}
			position={view === "edit" ? "right" : "center"} saving={false} users={[]} />
	</>;
}

beforeEach(() => { vi.spyOn(window, "scrollTo").mockImplementation(() => undefined); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("local project metadata across creation, details and edit drawer", () => {
	it("distinguishes missing purchased hours from an explicitly saved zero", () => {
		const view = render(<MetadataWorkspace initialProject={createStoredProject({ summaryPurchasedHours: null })} onSaved={vi.fn()} />);
		expect(screen.getByText("Куплено:").parentElement).toHaveTextContent("Не заданы");
		expect(screen.queryByText("0 ч")).not.toBeInTheDocument();
		view.unmount();
		render(<MetadataWorkspace initialProject={createStoredProject({ summaryPurchasedHours: 0 })} onSaved={vi.fn()} />);
		expect(screen.getByText("Куплено:").parentElement).toHaveTextContent("0 ч");
		expect(screen.queryByText("Не заданы")).not.toBeInTheDocument();
	});
	it("applies the same nonnegative hour and contract-date limits in creation, edit and details", () => {
		render(<MetadataWorkspace onSaved={vi.fn()} />);
		const checkLimits = () => {
			const hours = screen.getByLabelText("Куплено часов");
			expect(hours).toHaveAttribute("min", "0");
			expect(hours).toHaveAttribute("step", "any");
			fireEvent.change(screen.getByLabelText("Дата начала проекта"), { target: { value: "2026-10-01" } });
			expect(screen.getByLabelText("Дата окончания проекта по договору")).toHaveAttribute("min", "2026-10-01");
		};
		checkLimits();
		fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));
		fireEvent.click(screen.getByRole("button", { name: "Изменить проект" }));
		checkLimits();
		fireEvent.click(screen.getByRole("button", { name: "Отмена" }));
		fireEvent.click(screen.getByRole("button", { name: "Открыть детали" }));
		checkLimits();
	});
	it("shows a date entered at creation in the summary, details and compact edit form", () => {
		const onSaved = vi.fn();
		render(<MetadataWorkspace onSaved={onSaved} />);
		fireEvent.change(screen.getByLabelText("Дата начала проекта"), { target: { value: "2026-10-01" } });
		fireEvent.change(screen.getByLabelText("Дата окончания проекта по договору"), { target: { value: "2026-12-31" } });
		fireEvent.change(screen.getByLabelText("Куплено часов"), { target: { value: "80.5" } });
		fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));
		expect(onSaved).toHaveBeenLastCalledWith(expect.objectContaining({ projectStartDate: "2026-10-01", contractEndDate: "2026-12-31", summaryPurchasedHours: 80.5 }));
		expect(screen.getByText("31.12")).toBeInTheDocument();
		expect(screen.getByText("80.5 ч")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Изменить проект" }));
		expect(screen.getByLabelText("Дата окончания проекта по договору")).toHaveValue("2026-12-31");
		expect(screen.getByLabelText("Дата начала проекта")).toHaveValue("2026-10-01");
		expect(screen.getByLabelText("Куплено часов")).toHaveValue(80.5);
		fireEvent.click(screen.getByRole("button", { name: "Отмена" }));
		fireEvent.click(screen.getByRole("button", { name: "Открыть детали" }));
		expect(screen.getByLabelText("Дата окончания проекта по договору")).toHaveValue("2026-12-31");
		expect(screen.getByLabelText("Дата начала проекта")).toHaveValue("2026-10-01");
		expect(screen.getByLabelText("Куплено часов")).toHaveValue(80.5);
	});

	it("edits the same date in either form and preserves a distinct actual completion date", () => {
		const onSaved = vi.fn();
		render(<MetadataWorkspace initialProject={createStoredProject({ contractEndDate: null, summaryPlanCompletionDate: "2026-11-01", summaryFactCompletionDate: "2027-01-05", summaryPurchasedHours: 0 })} onSaved={onSaved} />);
		expect(screen.getByText("01.11")).toBeInTheDocument();
		expect(screen.getByText("0 ч")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Изменить проект" }));
		expect(screen.getByLabelText("Дата окончания проекта по договору")).toHaveValue("2026-11-01");
		expect(screen.getByLabelText("Фактическая дата завершения")).toHaveValue("2027-01-05");
		fireEvent.change(screen.getByLabelText("Дата окончания проекта по договору"), { target: { value: "2026-12-31" } });
		fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));
		expect(onSaved.mock.lastCall?.[0]).toMatchObject({ contractEndDate: "2026-12-31", summaryFactCompletionDate: "2027-01-05", summaryPurchasedHours: 0 });
		expect(onSaved.mock.lastCall?.[0]).not.toHaveProperty("summaryPlanCompletionDate");
		expect(screen.getByText("31.12")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Открыть детали" }));
		fireEvent.change(screen.getByLabelText("Дата окончания проекта по договору"), { target: { value: "2026-12-20" } });
		fireEvent.click(screen.getByRole("button", { name: "Сохранить изменения" }));
		expect(screen.getByText("20.12")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Изменить проект" }));
		expect(screen.getByLabelText("Дата окончания проекта по договору")).toHaveValue("2026-12-20");
		expect(screen.getByLabelText("Фактическая дата завершения")).toHaveValue("2027-01-05");
	});

	it("keeps an explicitly cleared date empty on reopening and preserves zero purchased hours", () => {
		const onSaved = vi.fn();
		render(<MetadataWorkspace initialProject={createStoredProject({ contractEndDate: "2026-12-31", summaryPlanCompletionDate: "2026-11-01", summaryFactCompletionDate: "2027-01-05", summaryPurchasedHours: 12 })} onSaved={onSaved} />);
		fireEvent.click(screen.getByRole("button", { name: "Открыть детали" }));
		fireEvent.change(screen.getByLabelText("Дата окончания проекта по договору"), { target: { value: "" } });
		fireEvent.change(screen.getByLabelText("Куплено часов"), { target: { value: "0" } });
		fireEvent.click(screen.getByRole("button", { name: "Сохранить изменения" }));
		expect(onSaved.mock.lastCall?.[0]).toMatchObject({ contractEndDate: null, summaryPlanCompletionDate: null, summaryFactCompletionDate: "2027-01-05", summaryPurchasedHours: 0 });
		expect(screen.getByText("0 ч")).toBeInTheDocument();
		expect(screen.queryByText("31.12")).not.toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Изменить проект" }));
		expect(screen.getByLabelText("Дата окончания проекта по договору")).toHaveValue("");
		expect(screen.getByLabelText("Куплено часов")).toHaveValue(0);
		expect(screen.getByLabelText("Фактическая дата завершения")).toHaveValue("2027-01-05");
	});
});
