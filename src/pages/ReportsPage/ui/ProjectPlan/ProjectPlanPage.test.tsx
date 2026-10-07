import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReportProject } from "../SalesPage/model/types";
import { ProjectPlanPage } from "./ProjectPlanPage";

const state = vi.hoisted(() => ({ projects: vi.fn(), stages: vi.fn(), events: vi.fn(), users: vi.fn() }));
vi.mock("../SalesPage/model/projectReports.api", () => ({ fetchReportProjects: state.projects }));
vi.mock("../SalesPage/model/projectGantt.api", () => ({ fetchProjectGanttStages: state.stages, fetchProjectGanttEvents: state.events }));
vi.mock("../../api/getUsers", () => ({ getUsers: state.users }));
vi.mock("./ProjectPlanTeamView", () => ({
	ProjectPlanTeamView: ({ items }: { items: Array<{ project: ReportProject }> }) => <div data-testid="team-projects">{items.map(({ project }) => project.title).join(", ")}</div>,
}));

beforeEach(() => {
	vi.resetAllMocks();
	state.projects.mockResolvedValue([
		{ id: 1, title: "Финансовый техпод", projectType: "support" },
		{ id: 2, title: "Вотерфол", projectType: "waterfall" },
		{ id: 3, title: "Тип не выбран", projectType: "none" },
	]);
	state.users.mockResolvedValue([]);
	state.stages.mockResolvedValue([]);
	state.events.mockResolvedValue([]);
});
afterEach(cleanup);

describe("overall project plan scope", () => {
	it("excludes support from project rows, counts, team scope and stage requests while keeping untyped projects", async () => {
		render(<MemoryRouter><ProjectPlanPage /></MemoryRouter>);
		expect(await screen.findByText("Тип не выбран")).toBeInTheDocument();
		expect(screen.getByText("Вотерфол")).toBeInTheDocument();
		expect(screen.queryByText("Финансовый техпод")).not.toBeInTheDocument();
		expect(screen.getByText("Проектов в плане").parentElement).toHaveTextContent("2");
		await waitFor(() => expect(state.stages).toHaveBeenCalledTimes(2));
		expect(state.stages.mock.calls.map(([id]) => id)).toEqual(["2", "3"]);
		expect(state.events.mock.calls.map(([id]) => id)).toEqual(["2", "3"]);
		fireEvent.click(screen.getByRole("button", { name: "Команда" }));
		expect(screen.getByTestId("team-projects")).toHaveTextContent("Вотерфол, Тип не выбран");
		expect(screen.getByTestId("team-projects")).not.toHaveTextContent("Финансовый техпод");
	});
});
