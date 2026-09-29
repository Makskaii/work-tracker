import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClientHoursPackagesPage } from "./ClientHoursPackagesPage";
import type { ClientPackage, SupportProjectOption } from "./clientHoursPackages.types";

const api = vi.hoisted(() => ({
  createSupportHoursPackage: vi.fn(), deleteSupportHoursPackage: vi.fn(),
  updateSupportHoursPackage: vi.fn(), fetchSupportHoursPackages: vi.fn(),
  fetchSupportProjects: vi.fn(), syncSupportProjects: vi.fn(),
  syncSupportHoursReports: vi.fn(), fetchSupportProjectWorkspace: vi.fn(),
}));
const { notify } = vi.hoisted(() => ({ notify: vi.fn() }));
vi.mock("./clientHoursPackages.api", () => api);
vi.mock("./supportWorkspace.api", () => ({ fetchSupportProjectWorkspace: api.fetchSupportProjectWorkspace }));
vi.mock("@/shared/config/bitrixProvider/bitrixContext", () => ({ useB24: () => ({ b24: null }) }));
vi.mock("@/shared/ui/NotificationPopup/notify", () => ({ notify }));
vi.mock("./supportTransfer.api", () => ({
  commitSupportTransfer: vi.fn(), previewSupportTransfer: vi.fn(),
  resumeSupportTransfer: vi.fn(), pendingTransferFromError: () => null,
}));
vi.mock("./supportAnalyst.api", () => ({ supportErrorMessage: (_cause: unknown, fallback: string) => fallback }));
vi.mock("./ClientHoursPackageModal", () => ({ ClientHoursPackageModal: () => null }));
vi.mock("./SupportReportModal", () => ({ SupportReportModal: () => null }));
vi.mock("./SupportProjectsSidebar", () => ({
  SupportProjectsSidebar: ({ projects, packages, selectedProjectId, onSelectPurchase }: {
    projects: SupportProjectOption[]; packages: ClientPackage[]; selectedProjectId: number | null;
    onSelectPurchase: (projectId: number, purchaseId: number | null) => void;
  }) => <nav aria-label="Project catalogue">
    <span data-testid="catalogue-ids">{projects.map((project) => project.id).join(",")}</span>
    <span data-testid="package-project-ids">{packages.map((item) => item.id).join(",")}</span>
    <span data-testid="selected-project">{selectedProjectId ?? "none"}</span>
    {projects.map((project) => <button key={project.id} type="button" onClick={() => onSelectPurchase(project.id, null)}>{project.title}</button>)}
    {projects.map((project) => <button key={`purchase-${project.id}`} type="button" onClick={() => onSelectPurchase(project.id, 7)}>Purchase {project.id}</button>)}
  </nav>,
}));
vi.mock("./SupportProjectDetails", () => ({
  SupportProjectDetails: ({ workspace, workspaceError, selectedPurchaseId, projectPackages }: {
    workspace: { projectId: number } | null; workspaceError: string | null;
    selectedPurchaseId: number | null; projectPackages: ClientPackage | null;
  }) => <section>
    <span data-testid="workspace-id">{workspace?.projectId ?? "none"}</span>
    <span data-testid="selected-purchase">{selectedPurchaseId ?? "none"}</span>
    <span data-testid="purchase-ids">{projectPackages?.purchases.map((purchase) => purchase.id).join(",") ?? "none"}</span>
    {workspaceError && <p role="alert">{workspaceError}</p>}
  </section>,
}));

const selectionKey = "support-hours:selected-project-id";
const projects = [{ id: 1, title: "Project A" }, { id: 2, title: "Project B" }];
const packageGroup = (id: number): ClientPackage => ({
  id, client: `Project ${id}`, lastCharge: "28.09", remainingHours: 12,
  state: "active", status: "Active", statusHint: "", progress: 40,
  purchases: [{ id: id === 1 ? 7 : 8, date: "2026-09-01", hours: 20, remaining: 12,
    state: "Активный", amount: null, comment: null, consumptions: [] }],
});
const workspace = (projectId: number) => ({ projectId, tasks: [], reports: [], packageGroup: packageGroup(projectId) });
const inactiveProjectError = {
  response: { status: 400, data: { message: "Проект больше не относится к техподдержке. Обновите данные" } },
};

beforeEach(() => {
  vi.resetAllMocks();
  window.sessionStorage.clear();
  window.sessionStorage.setItem(selectionKey, "1");
  window.history.replaceState({ [selectionKey]: 1 }, "");
  api.syncSupportProjects.mockResolvedValue(undefined);
  api.syncSupportHoursReports.mockResolvedValue(undefined);
  api.fetchSupportProjects.mockResolvedValue(projects);
  api.fetchSupportHoursPackages.mockResolvedValue([packageGroup(1), packageGroup(2)]);
  api.fetchSupportProjectWorkspace.mockImplementation(async (id: number) => workspace(id));
});
afterEach(cleanup);

const expectSelected = async (id: number) => {
  await waitFor(() => expect(screen.getByTestId("workspace-id")).toHaveTextContent(String(id)));
  expect(screen.getByTestId("selected-project")).toHaveTextContent(String(id));
  expect(window.sessionStorage.getItem(selectionKey)).toBe(String(id));
  expect(window.history.state[selectionKey]).toBe(id);
};
const expectNoWrites = () => {
  expect(api.deleteSupportHoursPackage).not.toHaveBeenCalled();
  expect(api.createSupportHoursPackage).not.toHaveBeenCalled();
  expect(api.updateSupportHoursPackage).not.toHaveBeenCalled();
};

describe("support project type recovery", () => {
  it("recovers on initial load when the stored project is still in the stale catalogue but is now Waterfall", async () => {
    api.fetchSupportProjectWorkspace.mockImplementation(async (id: number) => {
      if (id === 1) throw inactiveProjectError;
      return workspace(id);
    });
    render(<ClientHoursPackagesPage />);
    await expectSelected(2);
    expect(screen.getByTestId("catalogue-ids")).toHaveTextContent(/^2$/);
    expect(screen.getByTestId("package-project-ids")).toHaveTextContent(/^2$/);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(notify).not.toHaveBeenCalled();
    expectNoWrites();
  });

  it("clears stale selection when the last support project changes type", async () => {
    api.fetchSupportProjects.mockResolvedValue([projects[0]]);
    api.fetchSupportProjectWorkspace.mockRejectedValue(inactiveProjectError);
    render(<ClientHoursPackagesPage />);
    await waitFor(() => expect(window.sessionStorage.getItem(selectionKey)).toBeNull());
    expect(screen.getByRole("navigation", { name: "Project catalogue" })).toBeInTheDocument();
    expect(screen.getByTestId("catalogue-ids")).toHaveTextContent(/^$/);
    expect(screen.getByTestId("selected-project")).toHaveTextContent("none");
    expect(screen.getByTestId("workspace-id")).toHaveTextContent("none");
    expect(window.history.state[selectionKey]).toBeNull();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expectNoWrites();
  });

  it("switches to a remaining project and resets the purchase after a successful catalogue refresh", async () => {
    render(<ClientHoursPackagesPage />);
    await expectSelected(1);
    await waitFor(() => expect(screen.getByRole("button", { name: "Обновить данные" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Purchase 1" }));
    expect(screen.getByTestId("selected-purchase")).toHaveTextContent("7");
    api.fetchSupportProjects.mockResolvedValue([projects[1]]);
    fireEvent.click(screen.getByRole("button", { name: "Обновить данные" }));
    await expectSelected(2);
    expect(screen.getByTestId("selected-purchase")).toHaveTextContent("none");
    expect(screen.getByTestId("package-project-ids")).toHaveTextContent(/^2$/);
    expectNoWrites();
  });

  it("keeps other projects accessible without hiding an unrelated server error", async () => {
    api.fetchSupportProjectWorkspace.mockImplementation(async (id: number) => {
      if (id === 1) throw { response: { status: 500, data: { message: "Database unavailable" } } };
      return workspace(id);
    });
    render(<ClientHoursPackagesPage />);
    await screen.findByRole("navigation", { name: "Project catalogue" });
    await waitFor(() => expect(screen.getAllByRole("alert").length).toBeGreaterThan(0));
    expect(screen.getByTestId("catalogue-ids")).toHaveTextContent(/^1,2$/);
    expect(screen.queryByText("Не удалось обновить отчёты. Повторите попытку, чтобы получить актуальный остаток часов.")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Project B" }));
    await expectSelected(2);
    expectNoWrites();
  });

  it("allows a project to return to support with the same project and purchase IDs", async () => {
    api.fetchSupportProjects.mockResolvedValue([projects[1]]);
    render(<ClientHoursPackagesPage />);
    await expectSelected(2);
    await waitFor(() => expect(screen.getByRole("button", { name: "Обновить данные" })).toBeEnabled());
    api.fetchSupportProjects.mockResolvedValue(projects);
    fireEvent.click(screen.getByRole("button", { name: "Обновить данные" }));
    fireEvent.click(await screen.findByRole("button", { name: "Project A" }));
    await expectSelected(1);
    expect(screen.getByTestId("purchase-ids")).toHaveTextContent(/^7$/);
    expectNoWrites();
  });

  it("does not let a late response for the previous project overwrite the new selection", async () => {
    let release!: (value: ReturnType<typeof workspace>) => void;
    const previous = new Promise<ReturnType<typeof workspace>>((resolve) => { release = resolve; });
    api.fetchSupportProjectWorkspace.mockImplementation((id: number) => id === 1 ? previous : Promise.resolve(workspace(id)));
    render(<ClientHoursPackagesPage />);
    await screen.findByRole("button", { name: "Project B" });
    fireEvent.click(screen.getByRole("button", { name: "Project B" }));
    await expectSelected(2);
    await act(async () => release(workspace(1)));
    await expectSelected(2);
    expectNoWrites();
  });
});
