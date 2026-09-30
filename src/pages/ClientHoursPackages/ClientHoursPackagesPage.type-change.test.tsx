import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClientHoursPackagesPage } from "./ClientHoursPackagesPage";
import type { ClientPackage, SupportProjectOption } from "./clientHoursPackages.types";

const api = vi.hoisted(() => ({
  createSupportHoursPackage: vi.fn(), deleteSupportHoursPackage: vi.fn(),
  fetchSupportHoursPackages: vi.fn(), fetchSupportProjects: vi.fn(),
  syncSupportProjects: vi.fn(), syncSupportHoursReports: vi.fn(),
  updateSupportHoursPackage: vi.fn(), fetchSupportProjectWorkspace: vi.fn(),
}));
vi.mock("./clientHoursPackages.api", () => api);
vi.mock("./supportWorkspace.api", () => ({ fetchSupportProjectWorkspace: api.fetchSupportProjectWorkspace }));
vi.mock("@/shared/config/bitrixProvider/bitrixContext", () => ({ useB24: () => ({ b24: null }) }));
vi.mock("@/shared/ui/NotificationPopup/notify", () => ({ notify: vi.fn() }));
vi.mock("./supportAnalyst.api", () => ({ supportErrorMessage: (_cause: unknown, fallback: string) => fallback }));
vi.mock("./supportTransfer.api", () => ({
  commitSupportTransfer: vi.fn(), previewSupportTransfer: vi.fn(), resumeSupportTransfer: vi.fn(),
  pendingTransferFromError: () => null,
}));
vi.mock("./ClientHoursPackageModal", () => ({ ClientHoursPackageModal: () => null }));
vi.mock("./SupportReportModal", () => ({ SupportReportModal: () => null }));
vi.mock("./SupportProjectsSidebar", () => ({
  SupportProjectsSidebar: ({ projects, packages, onSelectPurchase }: {
    projects: SupportProjectOption[]; packages: ClientPackage[];
    onSelectPurchase: (projectId: number, purchaseId: number | null) => void;
  }) => <nav aria-label="Каталог ТП">
    <span data-testid="visible-package-ids">{packages.map((item) => item.id).join(",")}</span>
    {projects.map((project) => <button type="button" key={project.id} onClick={() => onSelectPurchase(project.id, null)}>{project.title}</button>)}
  </nav>,
}));
vi.mock("./SupportProjectDetails", () => ({
  SupportProjectDetails: ({ project, workspace, workspaceError, selectedPurchaseId, onSelectPackage }: {
    project: SupportProjectOption | null;
    workspace: { projectId: number } | null;
    workspaceError: string | null;
    selectedPurchaseId: number | null;
    onSelectPackage: (id: number) => void;
  }) => <section>
    <span data-testid="selected-project">{project?.id ?? "none"}</span>
    <span data-testid="workspace-project">{workspace?.projectId ?? "none"}</span>
    <span data-testid="selected-purchase">{selectedPurchaseId ?? "none"}</span>
    {workspaceError && <p data-testid="workspace-error">{workspaceError}</p>}
    <button type="button" onClick={() => onSelectPackage(7)}>Выбрать пакет</button>
  </section>,
}));

const key = "support-hours:selected-project-id";
const project1 = { id: 1, title: "Первый ТП" };
const project2 = { id: 2, title: "Второй ТП" };
const packageFor = (id: number): ClientPackage => ({
  id, client: `Клиент ${id}`, lastCharge: "29.09", remainingHours: 12,
  state: "active", status: "Активный пакет", statusHint: "Есть остаток", progress: 40,
  purchases: [{ id: id === 1 ? 7 : 8, date: "2026-09-01", hours: 20, remaining: 12, state: "Активный", amount: null, comment: null, consumptions: [] }],
});
const workspaceFor = (projectId: number) => ({ projectId, tasks: [], reports: [], packageGroup: packageFor(projectId) });
const inactiveError = () => ({ response: { status: 400, data: { message: "Проект больше не относится к техподдержке. Обновите данные" } } });
const refresh = async () => {
  const button = await screen.findByRole("button", { name: "Обновить данные" });
  await waitFor(() => expect(button).toBeEnabled());
  fireEvent.click(button);
  await waitFor(() => expect(button).toBeEnabled());
};

beforeEach(() => {
  vi.resetAllMocks();
  window.sessionStorage.clear();
  window.sessionStorage.setItem(key, "1");
  window.history.replaceState({ [key]: 1, keep: "router-state" }, "");
  api.syncSupportProjects.mockResolvedValue(undefined);
  api.syncSupportHoursReports.mockResolvedValue(undefined);
  api.fetchSupportProjects.mockResolvedValue([project1, project2]);
  api.fetchSupportHoursPackages.mockResolvedValue([packageFor(1), packageFor(2)]);
  api.fetchSupportProjectWorkspace.mockImplementation(async (id: number) => workspaceFor(id));
});

describe("support project type transitions", () => {
  it("recovers a remembered Waterfall project without blocking the entire page", async () => {
    api.fetchSupportProjectWorkspace.mockImplementation(async (id: number) => {
      if (id === 1) throw inactiveError();
      return workspaceFor(id);
    });
    render(<ClientHoursPackagesPage />);
    await waitFor(() => expect(screen.getByTestId("workspace-project")).toHaveTextContent("2"));
    expect(screen.getByRole("navigation", { name: "Каталог ТП" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Первый ТП" })).not.toBeInTheDocument();
    expect(screen.queryByText("Не удалось обновить отчёты", { exact: false })).not.toBeInTheDocument();
    expect(screen.getByTestId("visible-package-ids")).toHaveTextContent(/^2$/);
    expect(window.sessionStorage.getItem(key)).toBe("2");
    expect(window.history.state).toMatchObject({ [key]: 2, keep: "router-state" });
    expect(api.deleteSupportHoursPackage).not.toHaveBeenCalled();
  });

  it("does not request a remembered project that has disappeared from the catalogue", async () => {
    api.fetchSupportProjects.mockResolvedValue([project2]);
    render(<ClientHoursPackagesPage />);
    await waitFor(() => expect(screen.getByTestId("workspace-project")).toHaveTextContent("2"));
    expect(api.fetchSupportProjectWorkspace.mock.calls.every(([id]) => id === 2)).toBe(true);
    expect(window.sessionStorage.getItem(key)).toBe("2");
  });

  it("selects another project and clears the previous package after a refresh removes the selected project", async () => {
    render(<ClientHoursPackagesPage />);
    await waitFor(() => expect(screen.getByTestId("workspace-project")).toHaveTextContent("1"));
    fireEvent.click(screen.getByRole("button", { name: "Выбрать пакет" }));
    expect(screen.getByTestId("selected-purchase")).toHaveTextContent("7");
    api.fetchSupportProjects.mockResolvedValue([project2]);
    await refresh();
    await waitFor(() => expect(screen.getByTestId("workspace-project")).toHaveTextContent("2"));
    expect(screen.getByTestId("selected-purchase")).toHaveTextContent("none");
    expect(screen.getByTestId("visible-package-ids")).toHaveTextContent(/^2$/);
  });

  it("handles a type change between catalogue synchronization and workspace loading", async () => {
    render(<ClientHoursPackagesPage />);
    await waitFor(() => expect(screen.getByTestId("workspace-project")).toHaveTextContent("1"));
    api.fetchSupportProjectWorkspace.mockImplementation(async (id: number) => {
      if (id === 1) throw inactiveError();
      return workspaceFor(id);
    });
    await refresh();
    await waitFor(() => expect(screen.getByTestId("workspace-project")).toHaveTextContent("2"));
    expect(screen.queryByRole("button", { name: "Первый ТП" })).not.toBeInTheDocument();
    expect(screen.queryByText("Сверка не завершена.", { exact: false })).not.toBeInTheDocument();
  });

  it("clears persisted selection when no support projects remain", async () => {
    api.fetchSupportProjects.mockResolvedValue([]);
    render(<ClientHoursPackagesPage />);
    await waitFor(() => expect(screen.getByTestId("selected-project")).toHaveTextContent("none"));
    expect(screen.getByTestId("workspace-project")).toHaveTextContent("none");
    expect(window.sessionStorage.getItem(key)).toBeNull();
    expect(window.history.state).toMatchObject({ [key]: null, keep: "router-state" });
    expect(api.fetchSupportProjectWorkspace).not.toHaveBeenCalled();
    expect(api.deleteSupportHoursPackage).not.toHaveBeenCalled();
  });

  it("keeps navigation available but exposes a real workspace error without hiding its project", async () => {
    api.fetchSupportProjectWorkspace.mockRejectedValue({ response: { status: 502, data: { message: "Upstream unavailable" } } });
    render(<ClientHoursPackagesPage />);
    expect(await screen.findByTestId("workspace-error")).toHaveTextContent("Не удалось загрузить все работы проекта");
    expect(screen.getByRole("button", { name: "Первый ТП" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Второй ТП" })).toBeInTheDocument();
    api.fetchSupportProjectWorkspace.mockImplementation(async (id: number) => workspaceFor(id));
    fireEvent.click(screen.getByRole("button", { name: "Второй ТП" }));
    await waitFor(() => expect(screen.getByTestId("workspace-project")).toHaveTextContent("2"));
  });

  it("shows the original project and package again after Waterfall returns to support", async () => {
    api.fetchSupportProjects.mockResolvedValue([project2]);
    render(<ClientHoursPackagesPage />);
    await waitFor(() => expect(screen.getByTestId("workspace-project")).toHaveTextContent("2"));
    api.fetchSupportProjects.mockResolvedValue([project1, project2]);
    await refresh();
    fireEvent.click(await screen.findByRole("button", { name: "Первый ТП" }));
    await waitFor(() => expect(screen.getByTestId("workspace-project")).toHaveTextContent("1"));
    expect(screen.getByTestId("visible-package-ids")).toHaveTextContent("1");
    expect(api.createSupportHoursPackage).not.toHaveBeenCalled();
    expect(api.deleteSupportHoursPackage).not.toHaveBeenCalled();
  });

  it("ignores a late workspace response from a project removed during refresh", async () => {
    let resolveOld!: (value: ReturnType<typeof workspaceFor>) => void;
    const old = new Promise<ReturnType<typeof workspaceFor>>((resolve) => { resolveOld = resolve; });
    window.sessionStorage.setItem(key, "2");
    window.history.replaceState({ [key]: 2 }, "");
    render(<ClientHoursPackagesPage />);
    await waitFor(() => expect(screen.getByTestId("workspace-project")).toHaveTextContent("2"));
    await waitFor(() => expect(screen.getByRole("button", { name: "Обновить данные" })).toBeEnabled());

    // Start a later project selection while the initial reconciliation is complete.
    // Its response must not restore a project removed by a subsequent refresh.
    api.fetchSupportProjectWorkspace.mockImplementation((id: number) => id === 1 ? old : Promise.resolve(workspaceFor(id)));
    fireEvent.click(screen.getByRole("button", { name: "Первый ТП" }));
    await waitFor(() => expect(api.fetchSupportProjectWorkspace).toHaveBeenCalledWith(1, expect.any(AbortSignal)));
    api.fetchSupportProjects.mockResolvedValue([project2]);
    await refresh();
    await waitFor(() => expect(screen.getByTestId("workspace-project")).toHaveTextContent("2"));
    await act(async () => resolveOld(workspaceFor(1)));
    expect(screen.getByTestId("workspace-project")).toHaveTextContent("2");
    expect(window.sessionStorage.getItem(key)).toBe("2");
  });
});
