import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_REPORT_PROJECT_FORM, type CompanyCreationMode } from "../model/reportProjectForm";
import {
	ReportProjectLinkFields,
	type ProjectCreationMode,
} from "./ReportProjectLinkFields";

const slider = vi.hoisted(() => ({ openTask: vi.fn() }));
vi.mock("@/shared/hooks/useBitrixSlider", () => ({ useBitrixSlider: () => slider }));

const companies = [
	{ id: "11", title: "Компания Альфа" },
	{ id: "22", title: "Компания Бета без проектов" },
];
const projects = [{ id: "77", title: "Внедрение CRM · Компания Альфа · #77", value: "Внедрение CRM", companyId: "11", companyTitle: "Компания Альфа" }];

const Harness = ({ isCreating = true, linked = false }: { isCreating?: boolean; linked?: boolean }) => {
	const [form, setForm] = useState({
		...DEFAULT_REPORT_PROJECT_FORM,
		...(linked ? { bitrixProjectId: "77", clientCompanyId: "999", clientCompany: "Ошибочная компания" } : {}),
	});
	const [mode, setMode] = useState<ProjectCreationMode>("new");
	const [companyMode, setCompanyMode] = useState<CompanyCreationMode>("existing");
	const [newCompanyTitle, setNewCompanyTitle] = useState("");
	return <>
		<ReportProjectLinkFields
			bitrixProjectOptions={projects}
			companyOptions={companies}
			form={form}
			onFormChange={setForm}
			isCreating={isCreating}
			creationMode={mode}
			onCreationModeChange={setMode}
			companyCreationMode={companyMode}
			onCompanyCreationModeChange={setCompanyMode}
			newCompanyTitle={newCompanyTitle}
			onNewCompanyTitleChange={setNewCompanyTitle}
		/>
		<output data-testid="payload">{JSON.stringify(form)}</output>
		<output data-testid="company-draft">{JSON.stringify({ companyMode, newCompanyTitle })}</output>
	</>;
};
const payload = () => JSON.parse(screen.getByTestId("payload").textContent ?? "{}");
beforeEach(() => vi.clearAllMocks());

describe("project and company links", () => {
	it("lets a new project create a named company and clears the previously selected company", () => {
		render(<Harness />);
		fireEvent.focus(screen.getByRole("combobox", { name: "Компания клиента" }));
		fireEvent.click(screen.getByRole("option", { name: "Компания Альфа" }));
		fireEvent.change(screen.getByRole("combobox", { name: "Компания в Битрикс24" }), { target: { value: "new" } });
		const title = screen.getByRole("textbox", { name: "Название новой компании" });
		expect(title).toBeRequired();
		fireEvent.change(title, { target: { value: "Новая компания" } });
		expect(screen.queryByRole("combobox", { name: "Компания клиента" })).not.toBeInTheDocument();
		expect(payload()).toMatchObject({ clientCompanyId: "", clientCompany: "" });
		expect(screen.getByTestId("company-draft")).toHaveTextContent('"newCompanyTitle":"Новая компания"');
	});

	it("clears a new company draft when returning to existing company selection", () => {
		render(<Harness />);
		const companyMode = screen.getByRole("combobox", { name: "Компания в Битрикс24" });
		fireEvent.change(companyMode, { target: { value: "new" } });
		fireEvent.change(screen.getByRole("textbox", { name: "Название новой компании" }), { target: { value: "Черновик" } });
		fireEvent.change(companyMode, { target: { value: "existing" } });
		expect(screen.queryByRole("textbox", { name: "Название новой компании" })).not.toBeInTheDocument();
		expect(screen.getByTestId("company-draft")).toHaveTextContent('"newCompanyTitle":""');
		const company = screen.getByRole("combobox", { name: "Компания клиента" });
		fireEvent.focus(company);
		fireEvent.click(screen.getByRole("option", { name: "Компания Бета без проектов" }));
		expect(payload()).toMatchObject({ clientCompanyId: "22", clientCompany: "Компания Бета без проектов" });
	});

	it("discards the company creation draft when linking an existing Bitrix project", () => {
		render(<Harness />);
		fireEvent.change(screen.getByRole("combobox", { name: "Компания в Битрикс24" }), { target: { value: "new" } });
		fireEvent.change(screen.getByRole("textbox", { name: "Название новой компании" }), { target: { value: "Черновик" } });
		fireEvent.change(screen.getByRole("combobox", { name: "Проект в Битрикс24" }), { target: { value: "existing" } });
		expect(screen.queryByRole("combobox", { name: "Компания в Битрикс24" })).not.toBeInTheDocument();
		expect(screen.queryByRole("textbox", { name: "Название новой компании" })).not.toBeInTheDocument();
		expect(screen.getByTestId("company-draft")).toHaveTextContent('"companyMode":"existing","newCompanyTitle":""');
		const projectSearch = screen.getByRole("combobox", { name: "Проект в Битрикс24", expanded: false });
		fireEvent.focus(projectSearch);
		fireEvent.click(screen.getByRole("option", { name: projects[0].title }));
		expect(screen.getByRole("combobox", { name: "Компания клиента" })).toHaveValue("Компания Альфа");
		expect(screen.getByRole("combobox", { name: "Компания клиента" })).toBeDisabled();
	});
	it("defaults to automatic card creation and selects a company by name while storing its ID", () => {
		render(<Harness />);
		expect(screen.getByRole("combobox", { name: "Проект в Битрикс24" })).toHaveValue("new");
		const company = screen.getByRole("combobox", { name: "Компания клиента" });
		fireEvent.focus(company);
		fireEvent.change(company, { target: { value: "Бета" } });
		fireEvent.click(screen.getByRole("option", { name: "Компания Бета без проектов" }));
		expect(company).toHaveValue("Компания Бета без проектов");
		expect(payload()).toMatchObject({ bitrixProjectId: "", clientCompanyId: "22", clientCompany: "Компания Бета без проектов" });
	});

	it("selects an existing project by name, derives and locks its company, and opens the Bitrix card", () => {
		render(<Harness />);
		fireEvent.change(screen.getByRole("combobox", { name: "Проект в Битрикс24" }), { target: { value: "existing" } });
		const projectSearch = screen.getByRole("combobox", { name: "Проект в Битрикс24", expanded: false });
		fireEvent.focus(projectSearch);
		fireEvent.change(projectSearch, { target: { value: "Внедрение" } });
		fireEvent.click(screen.getByRole("option", { name: projects[0].title }));
		expect(projectSearch).toHaveValue(projects[0].title);
		expect(screen.getByRole("combobox", { name: "Компания клиента" })).toBeDisabled();
		expect(screen.getByRole("combobox", { name: "Компания клиента" })).toHaveValue("Компания Альфа");
		expect(payload()).toMatchObject({ bitrixProjectId: "77", title: "Внедрение CRM", clientCompanyId: "11", clientCompany: "Компания Альфа" });
		fireEvent.click(screen.getByRole("button", { name: "Открыть карточку в Битрикс24" }));
		expect(slider.openTask).toHaveBeenCalledWith("77", 1092);
	});

	it("supports selecting an exact project ID with the keyboard", () => {
		render(<Harness isCreating={false} />);
		const projectSearch = screen.getByRole("combobox", { name: "Проект в Битрикс24" });
		fireEvent.focus(projectSearch);
		fireEvent.change(projectSearch, { target: { value: "77" } });
		fireEvent.keyDown(projectSearch, { key: "Enter" });
		expect(payload().bitrixProjectId).toBe("77");
	});

	it("clears a selected company ID when free text changes so a typed name cannot masquerade as a selection", () => {
		render(<Harness />);
		const company = screen.getByRole("combobox", { name: "Компания клиента" });
		fireEvent.focus(company);
		fireEvent.click(screen.getByRole("option", { name: "Компания Альфа" }));
		fireEvent.change(company, { target: { value: "Другая компания" } });
		expect(payload()).toMatchObject({ clientCompanyId: "", clientCompany: "" });
	});

	it("shows the linked card company instead of a stale Work Tracker label", () => {
		render(<Harness isCreating={false} linked />);
		expect(screen.getByRole("combobox", { name: "Компания клиента" })).toHaveValue("Компания Альфа");
		expect(screen.queryByText("Создать автоматически")).not.toBeInTheDocument();
		expect(screen.queryByRole("combobox", { name: "Компания в Битрикс24" })).not.toBeInTheDocument();
	});

	it("does not offer automatic creation during ordinary editing of an unlinked legacy project", () => {
		render(<Harness isCreating={false} />);
		expect(screen.getByText(/пока нет связи/)).toBeInTheDocument();
		expect(screen.queryByText("Создать автоматически")).not.toBeInTheDocument();
		expect(screen.queryByRole("combobox", { name: "Компания в Битрикс24" })).not.toBeInTheDocument();
	});
});
