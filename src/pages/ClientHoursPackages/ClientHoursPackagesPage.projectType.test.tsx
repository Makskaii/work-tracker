import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClientHoursPackagesPage } from "./ClientHoursPackagesPage";
import type { ClientPackage, SupportProjectOption } from "./clientHoursPackages.types";

const api = vi.hoisted(() => ({
	createSupportHoursPackage: vi.fn(),
	deleteSupportHoursPackage: vi.fn(),
	fetchSupportHoursPackages: vi.fn(),
	fetchSupportProjects: vi.fn(),
	fetchSupportProjectWorkspace: vi.fn(),
	syncSupportProjects: vi.fn(),
	syncSupportHoursReports: vi.fn(),
	updateSupportHoursPackage: vi.fn(),
}));
vi.mock("./clientHoursPackages.api", () => api);
vi.mock("./supportWorkspace.api", () => ({ fetchSupportProjectWorkspace: api.fetchSupportProjectWorkspace }));
vi.mock("@/shared/config/bitrixProvider/bitrixContext", () => ({ useB24: () => ({ b24: null }) }));
vi.mock("@/shared/ui/NotificationPopup/notify", () => ({ notify: vi.fn() }));
vi.mock("./supportAnalyst.api", () => ({ supportErrorMessage: (_error: unknown, fallback: string) => fallback }));
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
		<span data-testid="catalogue-packages">{packages.map((item) => item.id).join(",")}</span>
		{projects.map((project) => <button type="button" key={project.id} onClick={() => onSelectPurchase(project.id, null)}>{project.title}</button>)}
	</nav>,
}));
vi.mock("./SupportProjectDetails", () => ({
	SupportProjectDetails: ({ project, workspace, workspaceError, selectedPurchaseId }: {
		project: SupportProjectOption | null;
		workspace: { projectId: number; packageGroup: ClientPackage } | null;
		workspaceError: string | null; selectedPurchaseId: number | null;
	}) => <section>
		<span data-testid="selected-project">{project?.id ?? "none"}</span>
		<span data-testid="selected-purchase">{selectedPurchaseId ?? "none"}</span>
		<span data-testid="workspace">{workspace ? `workspace:${workspace.projectId}` : "empty"}</span>
		<span data-testid="workspace-purchases">{workspace?.packageGroup.purchases.map((item) => item.id).join(",")}</span>
		{workspaceError && <p role="alert">{workspaceError}</p>}
	</section>,
}));

const key = "support-hours:selected-project-id";
const projects = [{ id: 1, title: "Первый ТП" }, { id: 2, title: "Второй ТП" }];
const group = (id: number): ClientPackage => ({
	id, client: `Project ${id}`, lastCharge: "29.09", remainingHours: 60,
	state: "active", status: "Активный пакет", statusHint: "Есть остаток", progress: 25,
	purchases: [{ id: id * 10, date: "2026-09-01", hours: 80, remaining: 60, state: "Активный", amount: null, comment: null, consumptions: [] }],
});
const workspace = (id: number) => ({ projectId: id, reports: [], tasks: [], packageGroup: group(id) });
const inactive = () => ({ response: { status: 400, data: { message: "Проект больше не относится к техподдержке. Обновите данные" } } });
const refresh = async () => {
	await waitFor(() => expect(screen.getByRole("button", { name: "Обновить данные" })).toBeEnabled());
	fireEvent.click(screen.getByRole("button", { name: "Обновить данные" }));
};

beforeEach(() => {
	vi.clearAllMocks();
	window.sessionStorage.clear();
	window.sessionStorage.setItem(key, "1");
	window.history.replaceState({ [key]: 1, preserved: "router-state" }, "");
	api.syncSupportProjects.mockReset().mockResolvedValue(undefined);
	api.syncSupportHoursReports.mockReset().mockResolvedValue(undefined);
	api.fetchSupportProjects.mockReset().mockResolvedValue(projects);
	api.fetchSupportHoursPackages.mockReset().mockResolvedValue([group(1), group(2)]);
	api.fetchSupportProjectWorkspace.mockReset().mockImplementation(async (id: number) => workspace(id));
});

describe("support project type recovery", () => {
	it("recovers from a persisted stale project without blocking other projects or deleting packages", async () => {
		api.fetchSupportProjectWorkspace.mockImplementation(async (id: number) => {
			if (id === 1) throw inactive();
			return workspace(id);
		});
		render(<ClientHoursPackagesPage />);
		await waitFor(() => expect(screen.getByTestId("workspace")).toHaveTextContent("workspace:2"));
		expect(screen.getByRole("navigation", { name: "Каталог ТП" })).toBeVisible();
		expect(screen.queryByRole("button", { name: "Первый ТП" })).not.toBeInTheDocument();
		expect(screen.getByTestId("catalogue-packages")).toHaveTextContent(/^2$/);
		expect(window.sessionStorage.getItem(key)).toBe("2");
		expect(window.history.state).toEqual({ [key]: 2, preserved: "router-state" });
		expect(api.deleteSupportHoursPackage).not.toHaveBeenCalled();
		expect(screen.queryByText(/Не удалось обновить отчёты/)).not.toBeInTheDocument();
	});

	it("does not request an old selection when the refreshed catalogue already excludes it", async () => {
		api.fetchSupportProjects.mockResolvedValue([projects[1]]);
		render(<ClientHoursPackagesPage />);
		await waitFor(() => expect(screen.getByTestId("workspace")).toHaveTextContent("workspace:2"));
		expect(api.fetchSupportProjectWorkspace.mock.calls.every(([id]) => id === 2)).toBe(true);
	});

	it("clears the saved selection when the last support project changes type", async () => {
		api.fetchSupportProjects.mockResolvedValue([projects[0]]);
		api.fetchSupportProjectWorkspace.mockRejectedValue(inactive());
		render(<ClientHoursPackagesPage />);
		await waitFor(() => expect(screen.getByTestId("selected-project")).toHaveTextContent("none"));
		expect(screen.getByRole("navigation", { name: "Каталог ТП" })).toBeVisible();
		expect(window.sessionStorage.getItem(key)).toBeNull();
		expect(window.history.state[key]).toBeNull();
		expect(screen.getByTestId("workspace")).toHaveTextContent("empty");
		expect(api.deleteSupportHoursPackage).not.toHaveBeenCalled();
	});

	it("switches away from a project removed during refresh rather than only on first initialization", async () => {
		render(<ClientHoursPackagesPage />);
		await waitFor(() => expect(screen.getByTestId("workspace")).toHaveTextContent("workspace:1"));
		api.fetchSupportProjects.mockResolvedValue([projects[1]]);
		await refresh();
		await waitFor(() => expect(screen.getByTestId("workspace")).toHaveTextContent("workspace:2"));
		expect(screen.getByTestId("selected-purchase")).toHaveTextContent("none");
		expect(window.sessionStorage.getItem(key)).toBe("2");
	});

	it("keeps the catalogue usable when one workspace has an unrelated server error", async () => {
		api.fetchSupportProjectWorkspace.mockImplementation(async (id: number) => {
			if (id === 1) throw { response: { status: 500 } };
			return workspace(id);
		});
		render(<ClientHoursPackagesPage />);
		await screen.findByText(/Не удалось загрузить все работы проекта/);
		expect(screen.getByRole("button", { name: "Первый ТП" })).toBeVisible();
		fireEvent.click(screen.getByRole("button", { name: "Второй ТП" }));
		await waitFor(() => expect(screen.getByTestId("workspace")).toHaveTextContent("workspace:2"));
		expect(screen.queryByText(/Не удалось обновить отчёты/)).not.toBeInTheDocument();
	});

	it("does not let a late failure from the previous project clear the selected workspace", async () => {
		let rejectPrevious!: (reason: unknown) => void;
		const previous = new Promise<ReturnType<typeof workspace>>((_resolve, reject) => { rejectPrevious = reject; });
		api.fetchSupportProjectWorkspace.mockImplementation((id: number) => id === 1 ? previous : Promise.resolve(workspace(id)));
		render(<ClientHoursPackagesPage />);
		await screen.findByRole("button", { name: "Второй ТП" });
		fireEvent.click(screen.getByRole("button", { name: "Второй ТП" }));
		await waitFor(() => expect(screen.getByTestId("workspace")).toHaveTextContent("workspace:2"));
		await act(async () => rejectPrevious(inactive()));
		expect(screen.getByTestId("workspace")).toHaveTextContent("workspace:2");
		expect(window.sessionStorage.getItem(key)).toBe("2");
	});

	it("makes the same project and its saved packages available when it returns to support", async () => {
		let firstIsSupport = false;
		api.fetchSupportProjectWorkspace.mockImplementation(async (id: number) => {
			if (id === 1 && !firstIsSupport) throw inactive();
			return workspace(id);
		});
		render(<ClientHoursPackagesPage />);
		await waitFor(() => expect(screen.getByTestId("workspace")).toHaveTextContent("workspace:2"));
		firstIsSupport = true;
		await refresh();
		fireEvent.click(await screen.findByRole("button", { name: "Первый ТП" }));
		await waitFor(() => expect(screen.getByTestId("workspace")).toHaveTextContent("workspace:1"));
		expect(screen.getByTestId("workspace-purchases")).toHaveTextContent(/^10$/);
		expect(api.createSupportHoursPackage).not.toHaveBeenCalled();
		expect(api.deleteSupportHoursPackage).not.toHaveBeenCalled();
	});
});
