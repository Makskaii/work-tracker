import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectPlanningWorkspace } from "./ProjectPlanningWorkspace";
import type { ProjectGanttEvent, ProjectGanttStage, ReportProject } from "../model/types";

const api = vi.hoisted(() => ({
  fetchProjectGanttStages: vi.fn(), fetchProjectGanttEvents: vi.fn(), createProjectGanttStage: vi.fn(),
  updateProjectGanttStage: vi.fn(), deleteProjectGanttStage: vi.fn(), moveProjectGanttStageParent: vi.fn(),
  createProjectGanttEvent: vi.fn(), updateProjectGanttEvent: vi.fn(), deleteProjectGanttEvent: vi.fn(),
  fetchAutonomousProjectPayments: vi.fn(), createAutonomousProjectPayment: vi.fn(),
  updateAutonomousProjectPayment: vi.fn(), deleteAutonomousProjectPayment: vi.fn(),
}));
vi.mock("../model/projectGantt.api", () => api);
vi.mock("../model/projectPayments.api", () => api);
vi.mock("@/shared/ui/NotificationPopup/notify", () => ({ notify: vi.fn() }));
const makeStage = (id: number, overrides: Partial<ProjectGanttStage> = {}): ProjectGanttStage => ({
  id, projectId: "31", title: `Stage ${id}`, code: `stage-${id}`, stageType: "development", plannedHours: null,
  groupStatus: "not_started", isGroup: false, parentStageId: null, isDefault: false, dependsOnStageId: null,
  dependencyAnchor: null, durationDays: null, sortOrder: id, createdAt: "", updatedAt: "", ...overrides,
});
const project = { id: 31, title: "Test project", projectType: "waterfall", projectAmount: 10000 } as ReportProject;
let stages: ProjectGanttStage[];
let events: ProjectGanttEvent[];
const overall = () => screen.getByRole("progressbar", { name: "Готовность проекта по ручным статусам" });
const row = (id: number) => {
  const element = document.querySelector<HTMLElement>(`[data-planning-stage-id="${id}"]`);
  if (!element) throw new Error(`Missing stage ${id}`);
  return within(element);
};
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("ResizeObserver", class { observe() { /* Geometry is tested separately in Chromium. */ } unobserve() { /* Geometry is tested separately in Chromium. */ } disconnect() { /* Geometry is tested separately in Chromium. */ } });
  vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
  vi.spyOn(window, "confirm").mockReturnValue(true);
  Element.prototype.scrollIntoView = vi.fn();
  stages = [makeStage(99, { code: "payments", stageType: "payments", isDefault: true }),
    makeStage(1, { title: "Разработка CRM", isGroup: true, plannedHours: 80, groupStatus: "in_progress" }),
    makeStage(2, { title: "Настройка CRM", parentStageId: 1, plannedHours: 20, groupStatus: "completed" }),
    makeStage(3, { title: "Интеграция", parentStageId: 1, plannedHours: 60, groupStatus: "in_progress" })];
  events = [{ id: 2, projectId: "31", stageId: 2, title: "Настройка CRM", eventKind: "duration",
    planStartDate: "2026-09-01", planEndDate: "2026-09-04", factStartDate: "2026-09-02", factEndDate: "2026-09-06",
    sortOrder: 0, createdAt: "", updatedAt: "" }];
  api.fetchProjectGanttStages.mockImplementation(async () => structuredClone(stages));
  api.fetchProjectGanttEvents.mockImplementation(async () => structuredClone(events));
  api.fetchAutonomousProjectPayments.mockResolvedValue([]);
  api.updateProjectGanttStage.mockImplementation(async (id: number, payload: Partial<ProjectGanttStage>) => {
    stages = stages.map((item) => item.id === id ? { ...item, ...payload } : item);
    return structuredClone(stages.find((item) => item.id === id));
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("Gantt planning workspace", () => {
  it("uses actual Gantt stage budgets and manual substage completion", async () => {
    render(<ProjectPlanningWorkspace project={project} />);
    await waitFor(() => expect(overall()).toHaveAttribute("aria-valuenow", "25"));
    expect(row(1).getByText("План: 80 ч")).toBeInTheDocument();
    expect(row(2).getByRole("button", { name: "Статус этапа: Настройка CRM" })).toBeInTheDocument();
  });
  it("recalculates the summary when the user reopens a substage without changing dates", async () => {
    render(<ProjectPlanningWorkspace project={project} />);
    await waitFor(() => expect(overall()).toHaveAttribute("aria-valuenow", "25"));
    fireEvent.click(row(2).getByRole("button", { name: "Статус этапа: Настройка CRM" }));
    fireEvent.click(row(2).getByRole("button", { name: "В работе" }));
    await waitFor(() => expect(overall()).toHaveAttribute("aria-valuenow", "0"));
    expect(api.updateProjectGanttEvent).not.toHaveBeenCalled();
    expect(api.updateAutonomousProjectPayment).not.toHaveBeenCalled();
    expect(stages.find((item) => item.id === 1)?.groupStatus).toBe("in_progress");
  });
  it("asks before closing a parent with open children, then closes only the parent", async () => {
    render(<ProjectPlanningWorkspace project={project} />);
    await waitFor(() => expect(overall()).toHaveAttribute("aria-valuenow", "25"));
    fireEvent.click(row(1).getByRole("button", { name: "Статус этапа: Разработка CRM" }));
    fireEvent.click(row(1).getByRole("button", { name: "Завершён" }));
    await waitFor(() => expect(overall()).toHaveAttribute("aria-valuenow", "100"));
    expect(window.confirm).toHaveBeenCalledTimes(1);
    expect(stages.find((item) => item.id === 3)?.groupStatus).toBe("in_progress");
    expect(events[0].factEndDate).toBe("2026-09-06");
  });
  it("persists an edited estimate and refreshes all summaries after saving", async () => {
    render(<ProjectPlanningWorkspace project={project} />);
    await waitFor(() => expect(overall()).toHaveAttribute("aria-valuenow", "25"));
    fireEvent.click(row(1).getByRole("button", { name: "..." }));
    fireEvent.click(row(1).getByRole("button", { name: "Редактировать" }));
    const dialog = within(await screen.findByRole("dialog"));
    fireEvent.change(dialog.getByLabelText("Плановый объём, ч"), { target: { value: "100" } });
    fireEvent.click(dialog.getByRole("button", { name: "Сохранить" }));
    await waitFor(() => expect(overall()).toHaveAttribute("aria-valuenow", "20"));
    expect(api.updateProjectGanttStage).toHaveBeenCalledWith(1, expect.objectContaining({ plannedHours: 100 }));
    expect(api.updateProjectGanttEvent).not.toHaveBeenCalled();
    cleanup();
    render(<ProjectPlanningWorkspace project={project} />);
    await waitFor(() => expect(overall()).toHaveAttribute("aria-valuenow", "20"));
  });
  it("removes green fact bars and manual fact date inputs without deleting stored history", async () => {
    render(<ProjectPlanningWorkspace project={project} />);
    await waitFor(() => expect(overall()).toHaveAttribute("aria-valuenow", "25"));
    expect(document.querySelector('[class*="ganttAutonomousEventFact"]')).toBeNull();
    expect(document.querySelector('[data-gantt-plan-event="2"]')).toBeInTheDocument();
    fireEvent.click(row(2).getByRole("button", { name: "..." }));
    fireEvent.click(row(2).getByRole("button", { name: "Редактировать" }));
    const dialog = within(await screen.findByRole("dialog"));
    expect(dialog.queryByText(/Фактическая дата/)).not.toBeInTheDocument();
    fireEvent.change(dialog.getByLabelText("Плановый объём, ч"), { target: { value: "12,5" } });
    fireEvent.click(dialog.getByRole("button", { name: "Сохранить" }));
    await waitFor(() => expect(api.updateProjectGanttStage).toHaveBeenCalledWith(2, expect.objectContaining({ plannedHours: 12.5 })));
    expect(api.updateProjectGanttEvent).not.toHaveBeenCalled();
    expect(events[0].factStartDate).toBe("2026-09-02");
    expect(events[0].factEndDate).toBe("2026-09-06");
  });
  it("does not let collapsing children change the project's progress", async () => {
    render(<ProjectPlanningWorkspace project={project} />);
    await waitFor(() => expect(overall()).toHaveAttribute("aria-valuenow", "25"));
    fireEvent.click(row(1).getByTitle("Свернуть этапы"));
    expect(document.querySelector('[data-planning-stage-id="2"]')).toBeNull();
    expect(overall()).toHaveAttribute("aria-valuenow", "25");
  });
  it("preserves an unclassified parent when only its estimate changes", async () => {
    stages[1].stageType = null;
    render(<ProjectPlanningWorkspace project={project} />);
    await waitFor(() => expect(overall()).toHaveAttribute("aria-valuenow", "25"));
    fireEvent.click(row(1).getByRole("button", { name: "..." }));
    fireEvent.click(row(1).getByRole("button", { name: "Редактировать" }));
    const dialog = within(await screen.findByRole("dialog"));
    expect(dialog.getByLabelText("Тип этапа")).toHaveValue("");
    fireEvent.change(dialog.getByLabelText("Плановый объём, ч"), { target: { value: "100" } });
    fireEvent.click(dialog.getByRole("button", { name: "Сохранить" }));
    await waitFor(() => expect(overall()).toHaveAttribute("aria-valuenow", "20"));
    expect(stages.find((item) => item.id === 1)?.stageType).toBeNull();
    expect(api.updateProjectGanttEvent).not.toHaveBeenCalled();
  });
  it("opens the parent when selecting a categorized substage from the summary", async () => {
    stages[1].stageType = null;
    stages[1].plannedHours = null;
    stages[2].stageType = "tz_writing";
    render(<ProjectPlanningWorkspace project={project} />);
    await waitFor(() => expect(overall()).toHaveAttribute("aria-valuenow", "25"));
    expect(screen.getByRole("progressbar", { name: "Готовность: ТЗ" })).toHaveAttribute("aria-valuenow", "100");
    fireEvent.click(row(1).getByTitle("Свернуть этапы"));
    expect(document.querySelector('[data-planning-stage-id="2"]')).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Настройка CRM" }));
    await waitFor(() => expect(document.querySelector('[data-planning-stage-id="2"]')).toBeInTheDocument());
  });
  it("keeps existing one-time events unchanged when saving an unclassified substage", async () => {
    stages[2].stageType = null;
    events[0].eventKind = "one_time";
    events[0].planEndDate = null;
    render(<ProjectPlanningWorkspace project={project} />);
    await waitFor(() => expect(overall()).toHaveAttribute("aria-valuenow", "25"));
    fireEvent.click(row(2).getByRole("button", { name: "..." }));
    fireEvent.click(row(2).getByRole("button", { name: "Редактировать" }));
    const dialog = within(await screen.findByRole("dialog"));
    expect(dialog.getByLabelText("Тип этапа")).toHaveValue("");
    expect(dialog.queryByLabelText("Плановая дата завершения")).not.toBeInTheDocument();
    fireEvent.change(dialog.getByLabelText("Плановый объём, ч"), { target: { value: "25" } });
    fireEvent.click(dialog.getByRole("button", { name: "Сохранить" }));
    await waitFor(() => expect(api.updateProjectGanttStage).toHaveBeenCalledWith(2, {
      title: "Настройка CRM", plannedHours: 25, groupStatus: "completed",
    }));
    expect(api.updateProjectGanttEvent).not.toHaveBeenCalled();
    expect(stages.find((item) => item.id === 2)?.stageType).toBeNull();
  });
  it("shows an unavailable summary rather than zero when the source fails", async () => {
    api.fetchProjectGanttStages.mockRejectedValue(new Error("Unavailable"));
    render(<ProjectPlanningWorkspace project={project} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Сводка этапов недоступна");
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });
});
