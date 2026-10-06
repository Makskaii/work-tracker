import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_REPORT_PROJECT_FORM } from "../model/reportProjectForm";
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
	return <>
		<ReportProjectLinkFields
			bitrixProjectOptions={projects}
			companyOptions={companies}
			form={form}
			onFormChange={setForm}
			isCreating={isCreating}
			creationMode={mode}
			onCreationModeChange={setMode}
		/>
		<output data-testid="payload">{JSON.stringify(form)}</output>
	</>;
};
const payload = () => JSON.parse(screen.getByTestId("payload").textContent ?? "{}");
beforeEach(() => vi.clearAllMocks());

describe("project and company links", () => {
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
	});

	it("does not offer automatic creation during ordinary editing of an unlinked legacy project", () => {
		render(<Harness isCreating={false} />);
		expect(screen.getByText(/пока нет связи/)).toBeInTheDocument();
		expect(screen.queryByText("Создать автоматически")).not.toBeInTheDocument();
	});
});
