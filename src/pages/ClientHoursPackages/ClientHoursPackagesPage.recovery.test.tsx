import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClientHoursPackagesPage } from "./ClientHoursPackagesPage";

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
const { notify } = vi.hoisted(() => ({ notify: vi.fn() }));
vi.mock("./clientHoursPackages.api", () => api);
vi.mock("./supportWorkspace.api", () => ({ fetchSupportProjectWorkspace: api.fetchSupportProjectWorkspace }));
vi.mock("@/shared/config/bitrixProvider/bitrixContext", () => ({ useB24: () => ({ b24: null }) }));
vi.mock("@/shared/ui/NotificationPopup/notify", () => ({ notify }));
vi.mock("./ClientHoursPackageModal", () => ({ ClientHoursPackageModal: () => null }));
vi.mock("./SupportReportModal", () => ({ SupportReportModal: () => null }));
vi.mock("./SupportProjectsSidebar", () => ({
	SupportProjectsSidebar: ({ projects, packages, onSelectPurchase }: {
		projects: Array<{ id: number; title: string }>;
		packages: Array<{ id: number }>;
		onSelectPurchase: (id: number, purchaseId: number | null) => void;
	}) => (
		<nav aria-label="Recovery projects">
			<span data-testid="visible-package-projects">{packages.map((item) => item.id).join(",")}</span>
			{projects.map((project) => <button key={project.id} type="button" onClick={() => onSelectPurchase(project.id, null)}>{project.title}</button>)}
		</nav>
	),
}));
vi.mock("./SupportProjectDetails", () => ({
	SupportProjectDetails: ({ project, workspace, workspaceError }: {
		project: { id: number; title: string } | null;
		workspace: { projectId: number } | null;
		workspaceError: string | null;
	}) => (
		<div>
			<span data-testid="recovery-selection">{project?.id ?? "none"}</span>
			<span data-testid="recovery-workspace">{workspace?.projectId ?? "none"}</span>
			{workspaceError && <div role="alert">{workspaceError}</div>}
		</div>
	),
}));

const storageKey = "support-hours:selected-project-id";
const projects = [{ id: 1, title: "Project one" }, { id: 2, title: "Project two" }];
const packageGroup = (id: number) => ({
	id, client: `Project ${id}`, lastCharge: "-", remainingHours: 20,
	state: "active", status: "Активный пакет", statusHint: "Есть остаток", progress: 0,
	purchases: [{ id: id * 10, hours: 20, remaining: 20, date: "2026-09-01", consumptions: [] }],
});
const workspace = (id: number) => ({ projectId: id, tasks: [], reports: [], packageGroup: packageGroup(id) });
const inactiveError = () => ({
	response: { status: 400, data: { message: "Проект больше не относится к техподдержке. Обновите данные" } },
});

beforeEach(() => {
	vi.clearAllMocks();
	window.sessionStorage.clear();
	window.history.replaceState({ [storageKey]: 1 }, "");
	api.syncSupportProjects.mockReset().mockResolvedValue(undefined);
	api.syncSupportHoursReports.mockReset().mockResolvedValue(undefined);
	api.fetchSupportProjects.mockReset().mockResolvedValue(projects);
	api.fetchSupportHoursPackages.mockReset().mockResolvedValue([packageGroup(1), packageGroup(2)]);
	api.fetchSupportProjectWorkspace.mockReset().mockImplementation(async (id: number) => workspace(id));
});

const refresh = async () => {
	const button = await screen.findByRole("button", { name: "Обновить данные" });
	await waitFor(() => expect(button).not.toBeDisabled());
	fireEvent.click(button);
	await waitFor(() => expect(api.syncSupportProjects).toHaveBeenCalledTimes(2));
};

describe("support project type recovery", () => {
	it("opens the next project when a remembered project's live type is no longer support", async () => {
		api.fetchSupportProjectWorkspace.mockImplementation(async (id: number) => {
			if (id === 1) throw inactiveError();
			return workspace(id);
		});
		render(<ClientHoursPackagesPage />);
		await waitFor(() => expect(screen.getByTestId("recovery-workspace")).toHaveTextContent("2"));
		expect(screen.queryByRole("button", { name: "Project one" })).not.toBeInTheDocument();
		expect(screen.getByRole("navigation", { name: "Recovery projects" })).toBeVisible();
		expect(window.sessionStorage.getItem(storageKey)).toBe("2");
		expect(window.history.state[storageKey]).toBe(2);
		expect(api.deleteSupportHoursPackage).not.toHaveBeenCalled();
		expect(notify).not.toHaveBeenCalled();
	});

	it("switches away when the selected project disappears on refresh", async () => {
		render(<ClientHoursPackagesPage />);
		await waitFor(() => expect(screen.getByTestId("recovery-workspace")).toHaveTextContent("1"));
		api.fetchSupportProjects.mockResolvedValue([projects[1]]);
		await refresh();
		await waitFor(() => expect(screen.getByTestId("recovery-workspace")).toHaveTextContent("2"));
		expect(screen.getByTestId("visible-package-projects")).toHaveTextContent(/^2$/);
		expect(api.deleteSupportHoursPackage).not.toHaveBeenCalled();
	});

	it("recovers when the type changes after the catalogue response during refresh", async () => {
		render(<ClientHoursPackagesPage />);
		await waitFor(() => expect(screen.getByTestId("recovery-workspace")).toHaveTextContent("1"));
		api.fetchSupportProjectWorkspace.mockImplementation(async (id: number) => {
			if (id === 1) throw inactiveError();
			return workspace(id);
		});
		await refresh();
		await waitFor(() => expect(screen.getByTestId("recovery-workspace")).toHaveTextContent("2"));
		expect(screen.queryByText("Не удалось обновить отчёты. Повторите попытку, чтобы получить актуальный остаток часов.")).not.toBeInTheDocument();
	});

	it("clears selection and workspace when the last support project leaves", async () => {
		api.fetchSupportProjects.mockResolvedValue([projects[0]]);
		render(<ClientHoursPackagesPage />);
		await waitFor(() => expect(screen.getByTestId("recovery-workspace")).toHaveTextContent("1"));
		api.fetchSupportProjects.mockResolvedValue([]);
		await refresh();
		// The catalogue removes the project before the selection effect clears
		// its workspace and remembered ID. Await the complete recovered state.
		await waitFor(() => {
			expect(screen.getByTestId("recovery-selection")).toHaveTextContent("none");
			expect(screen.getByTestId("recovery-workspace")).toHaveTextContent("none");
			expect(window.sessionStorage.getItem(storageKey)).toBeNull();
			expect(window.history.state[storageKey]).toBeNull();
		});
		expect(api.deleteSupportHoursPackage).not.toHaveBeenCalled();
	});

	it("keeps navigation usable on an unrelated workspace error without hiding that error", async () => {
		api.fetchSupportProjectWorkspace.mockImplementation(async (id: number) => {
			if (id === 1) throw { response: { status: 503, data: { message: "Unavailable" } } };
			return workspace(id);
		});
		render(<ClientHoursPackagesPage />);
		const second = await screen.findByRole("button", { name: "Project two" });
		await waitFor(() => expect(screen.getAllByRole("alert").length).toBeGreaterThan(0));
		expect(screen.getByRole("button", { name: "Project one" })).toBeVisible();
		fireEvent.click(second);
		await waitFor(() => expect(screen.getByTestId("recovery-workspace")).toHaveTextContent("2"));
	});

	it("retains the loaded project but does not report a successful global reconciliation when it fails", async () => {
		api.syncSupportHoursReports.mockRejectedValue(new Error("Bitrix unavailable"));
		render(<ClientHoursPackagesPage />);
		expect(await screen.findByRole("alert")).toHaveTextContent("Сверка не завершена. Показаны данные последней успешной загрузки.");
		expect(screen.getByRole("navigation", { name: "Recovery projects" })).toBeVisible();
		expect(screen.getByTestId("recovery-selection")).toHaveTextContent("1");
		expect(screen.getByTestId("recovery-workspace")).toHaveTextContent("1");
		expect(screen.queryByText(/Последняя сверка:/)).not.toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Обновить данные" })).toBeEnabled();
		expect(api.fetchSupportHoursPackages).toHaveBeenCalledTimes(1);
		expect(notify).toHaveBeenCalledExactlyOnceWith({
			message: "Не удалось сверить отчёты с Битрикс24. Остатки часов не обновлены.",
			type: "error",
		});
	});

	it("accepts a returning support project without creating or deleting packages", async () => {
		api.fetchSupportProjects.mockResolvedValue([projects[1]]);
		render(<ClientHoursPackagesPage />);
		await waitFor(() => expect(screen.getByTestId("recovery-workspace")).toHaveTextContent("2"));
		api.fetchSupportProjects.mockResolvedValue(projects);
		await refresh();
		fireEvent.click(await screen.findByRole("button", { name: "Project one" }));
		await waitFor(() => expect(screen.getByTestId("recovery-workspace")).toHaveTextContent("1"));
		expect(api.createSupportHoursPackage).not.toHaveBeenCalled();
		expect(api.deleteSupportHoursPackage).not.toHaveBeenCalled();
	});

	it("does not let a late old-project response replace the newly selected workspace", async () => {
		let resolveOld!: (value: ReturnType<typeof workspace>) => void;
		api.fetchSupportProjectWorkspace.mockImplementation((id: number) => id === 1
			? new Promise<ReturnType<typeof workspace>>((resolve) => { resolveOld = resolve; })
			: Promise.resolve(workspace(id)));
		render(<ClientHoursPackagesPage />);
		fireEvent.click(await screen.findByRole("button", { name: "Project two" }));
		await waitFor(() => expect(screen.getByTestId("recovery-workspace")).toHaveTextContent("2"));
		await act(async () => resolveOld(workspace(1)));
		expect(screen.getByTestId("recovery-workspace")).toHaveTextContent("2");
		expect(screen.getByTestId("recovery-selection")).toHaveTextContent("2");
	});
});
