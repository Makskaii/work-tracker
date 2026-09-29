import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClientHoursPackagesPage } from "./ClientHoursPackagesPage";
import type { ClientPackage } from "./clientHoursPackages.types";

const api = vi.hoisted(() => ({
	createSupportHoursPackage: vi.fn(),
	deleteSupportHoursPackage: vi.fn(),
	fetchSupportHoursPackages: vi.fn(),
	fetchSupportProjects: vi.fn(),
	fetchSupportProjectTasks: vi.fn(),
	fetchSupportProjectWorkspace: vi.fn(),
	syncSupportProjects: vi.fn(),
	syncSupportHoursReports: vi.fn(),
	updateSupportHoursPackage: vi.fn(),
}));
const { notify } = vi.hoisted(() => ({ notify: vi.fn() }));
vi.mock("./clientHoursPackages.api", () => api);
vi.mock("./supportWorkspace.api", () => ({ fetchSupportProjectWorkspace: api.fetchSupportProjectWorkspace }));
vi.mock("@/shared/ui/NotificationPopup/notify", () => ({ notify }));
vi.mock("./SupportProjectsSidebar", () => ({
	SupportProjectsSidebar: ({ onSelectPurchase }: { onSelectPurchase: (projectId: number, purchaseId: number | null) => void }) => <nav aria-label="Проекты"><button type="button" onClick={() => onSelectPurchase(1, null)}>Первый проект</button><button type="button" onClick={() => onSelectPurchase(2, null)}>Второй проект</button></nav>,
}));
vi.mock("./ClientHoursPackageModal", () => ({
	ClientHoursPackageModal: () => null,
}));
vi.mock("./SupportProjectDetails", () => ({
	SupportProjectDetails: ({
		projectPackages,
		onAddReport,
		workspace,
		onRetryWorkspace,
	}: {
		projectPackages: ClientPackage | null;
		onAddReport: () => void;
		workspace?: { projectId: number; reports: unknown[] } | null;
		onRetryWorkspace?: () => void;
	}) => (
		<div data-testid="support-details">
			<span data-testid="workspace-state">{workspace ? `Проект ${workspace.projectId}, отчётов ${workspace.reports.length}` : "Список не загружен"}</span>
			<button type="button" onClick={onRetryWorkspace}>Повторить список</button>
			<button type="button" onClick={onAddReport}>
				Добавить тестовый отчёт
			</button>
			{projectPackages
				? `Остаток: ${projectPackages.remainingHours} ч`
				: "Выберите проект"}
		</div>
	),
}));

vi.mock("./SupportReportModal", () => ({
	SupportReportModal: ({ onSaved }: { onSaved: () => Promise<void> }) => (
		<button type="button" onClick={() => void onSaved()}>
			Сохранить тестовый отчёт
		</button>
	),
}));

const deferred = <T,>() => {
	let resolve!: (value: T) => void;
	let reject!: (reason: unknown) => void;
	const promise = new Promise<T>((resolvePromise, rejectPromise) => {
		resolve = resolvePromise;
		reject = rejectPromise;
	});
	return { promise, resolve, reject };
};
const packages: ClientPackage[] = [
	{
		id: 1,
		client: "МРК",
		lastCharge: "28.09",
		remainingHours: 65.5,
		state: "active",
		status: "Активный пакет",
		statusHint: "Есть остаток",
		progress: 18,
		purchases: [],
	},
];

beforeEach(() => {
	vi.clearAllMocks();
	window.sessionStorage.clear();
	window.history.replaceState(null, "");
	api.syncSupportProjects.mockReset().mockResolvedValue(undefined);
	api.syncSupportHoursReports.mockReset().mockResolvedValue(undefined);
	api.fetchSupportHoursPackages.mockReset().mockResolvedValue(packages);
	api.fetchSupportProjects
		.mockReset()
		.mockResolvedValue([{ id: 1, title: "МРК ТП" }]);
	api.fetchSupportProjectTasks.mockReset().mockResolvedValue([]);
	api.fetchSupportProjectWorkspace.mockReset().mockResolvedValue({
		projectId: 1, tasks: [], reports: [],
		packageGroup: { ...packages[0], purchases: [{ id: 7, date: "2026-09-01", hours: 80, remaining: 65.5, state: "Активный", amount: null, comment: null, consumptions: [] }] },
	});
});

describe("support hours reconciliation on page load", () => {
	it("loads balances only after project and report reconciliation both finish", async () => {
		const projectSync = deferred<void>();
		const reportSync = deferred<void>();
		api.syncSupportProjects.mockReturnValueOnce(projectSync.promise);
		api.syncSupportHoursReports.mockReturnValueOnce(reportSync.promise);
		render(<ClientHoursPackagesPage />);
		expect(screen.getByRole("status")).toHaveTextContent("Сверяем отчёты");
		expect(api.syncSupportProjects).toHaveBeenCalledTimes(1);
		expect(api.syncSupportHoursReports).not.toHaveBeenCalled();
		expect(api.fetchSupportHoursPackages).not.toHaveBeenCalled();
		expect(screen.queryByTestId("support-details")).not.toBeInTheDocument();

		await act(async () => projectSync.resolve());
		expect(api.syncSupportHoursReports).toHaveBeenCalledTimes(1);
		expect(api.fetchSupportHoursPackages).not.toHaveBeenCalled();
		expect(api.fetchSupportProjects).not.toHaveBeenCalled();
		expect(
			screen.queryByRole("navigation", { name: "Проекты" }),
		).not.toBeInTheDocument();

		await act(async () => reportSync.resolve());
		await waitFor(() =>
			expect(screen.getByTestId("support-details")).toHaveTextContent(
				"Остаток: 65.5 ч",
			),
		);
		expect(api.fetchSupportHoursPackages).toHaveBeenCalledTimes(1);
		expect(api.fetchSupportProjects).toHaveBeenCalledTimes(1);
		const signal = api.syncSupportProjects.mock.calls[0][0];
		expect(signal).toBeInstanceOf(AbortSignal);
		expect(api.syncSupportHoursReports).toHaveBeenCalledWith(signal);
		expect(api.fetchSupportHoursPackages).toHaveBeenCalledWith(signal);
		expect(screen.queryByRole("status")).not.toBeInTheDocument();
	});

	it("shows a retry instead of old balances when reconciliation fails, then loads fresh data", async () => {
		api.syncSupportHoursReports.mockRejectedValueOnce(
			new Error("Bitrix unavailable"),
		);
		api.fetchSupportHoursPackages.mockResolvedValueOnce([
			{ ...packages[0], remainingHours: -14.5 },
		]);
		render(<ClientHoursPackagesPage />);
		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Не удалось обновить отчёты",
		);
		expect(screen.queryByTestId("support-details")).not.toBeInTheDocument();
		expect(screen.queryByText(/-14.5/)).not.toBeInTheDocument();
		expect(api.fetchSupportHoursPackages).not.toHaveBeenCalled();
		expect(notify).toHaveBeenCalledWith(
			expect.objectContaining({ type: "error" }),
		);

		// A successful reconciliation provides a fresh server snapshot on retry.
		api.fetchSupportHoursPackages.mockReset().mockResolvedValue(packages);
		const retriedSync = deferred<void>();
		api.syncSupportHoursReports.mockReturnValueOnce(retriedSync.promise);
		fireEvent.click(screen.getByRole("button", { name: "Повторить загрузку" }));
		await waitFor(() =>
			expect(api.syncSupportHoursReports).toHaveBeenCalledTimes(2),
		);
		expect(screen.getByRole("status")).toHaveTextContent("Сверяем отчёты");
		expect(screen.queryByTestId("support-details")).not.toBeInTheDocument();
		await act(async () => retriedSync.resolve());
		await waitFor(() =>
			expect(screen.getByTestId("support-details")).toHaveTextContent(
				"Остаток: 65.5 ч",
			),
		);
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
		expect(api.syncSupportProjects).toHaveBeenCalledTimes(2);
	});

	it("aborts an abandoned load and ignores its late result after a new page opens", async () => {
		const abandonedSnapshot = deferred<ClientPackage[]>();
		api.fetchSupportHoursPackages.mockReturnValueOnce(
			abandonedSnapshot.promise,
		);
		const firstPage = render(<ClientHoursPackagesPage />);
		await waitFor(() =>
			expect(api.fetchSupportHoursPackages).toHaveBeenCalledTimes(1),
		);
		const abandonedSignal = api.fetchSupportHoursPackages.mock
			.calls[0][0] as AbortSignal;
		expect(abandonedSignal.aborted).toBe(false);
		firstPage.unmount();
		expect(abandonedSignal.aborted).toBe(true);

		render(<ClientHoursPackagesPage />);
		await waitFor(() =>
			expect(screen.getByTestId("support-details")).toHaveTextContent(
				"Остаток: 65.5 ч",
			),
		);
		await act(async () =>
			abandonedSnapshot.resolve([{ ...packages[0], remainingHours: -14.5 }]),
		);
		expect(screen.getByTestId("support-details")).toHaveTextContent(
			"Остаток: 65.5 ч",
		);
		expect(screen.queryByText(/-14.5/)).not.toBeInTheDocument();
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
		expect(notify).not.toHaveBeenCalled();
	});
});

it("runs a new reconciliation after a report save even if an earlier focus refresh is still running", async () => {
	render(<ClientHoursPackagesPage />);
	await screen.findByTestId("support-details");
	const olderRefresh = deferred<void>();
	api.syncSupportHoursReports.mockReturnValueOnce(olderRefresh.promise);
	fireEvent.click(screen.getByRole("button", { name: "Обновить данные" }));
	await waitFor(() =>
		expect(api.syncSupportHoursReports).toHaveBeenCalledTimes(2),
	);
	fireEvent.click(
		screen.getByRole("button", { name: "Добавить тестовый отчёт" }),
	);
	fireEvent.click(
		screen.getByRole("button", { name: "Сохранить тестовый отчёт" }),
	);
	expect(api.syncSupportHoursReports).toHaveBeenCalledTimes(2);
	await act(async () => olderRefresh.resolve());
	await waitFor(() =>
		expect(api.syncSupportHoursReports).toHaveBeenCalledTimes(3),
	);
	expect(api.fetchSupportHoursPackages).toHaveBeenCalledTimes(3);
});

it("reloads the previous project when returning before the next project's workspace finishes", async () => {
	api.fetchSupportProjects.mockResolvedValue([{ id: 1, title: "Первый" }, { id: 2, title: "Второй" }]);
	const firstWorkspace = { projectId: 1, tasks: [], reports: [], packageGroup: { ...packages[0], purchases: [{ id: 7, date: "2026-09-01", hours: 80, remaining: 65.5, state: "Активный", amount: null, comment: null, consumptions: [] }] } };
	const pendingSecond = deferred<typeof firstWorkspace>();
	api.fetchSupportProjectWorkspace.mockImplementation((projectId: number) => projectId === 2 ? pendingSecond.promise : Promise.resolve(firstWorkspace));
	render(<ClientHoursPackagesPage />);
	await waitFor(() => expect(screen.getByTestId("workspace-state")).toHaveTextContent("Проект 1"));
	fireEvent.click(screen.getByRole("button", { name: "Второй проект" }));
	await waitFor(() => expect(api.fetchSupportProjectWorkspace).toHaveBeenCalledWith(2, expect.any(AbortSignal)));
	expect(screen.getByTestId("workspace-state")).toHaveTextContent("Список не загружен");
	fireEvent.click(screen.getByRole("button", { name: "Первый проект" }));
	await waitFor(() => expect(screen.getByTestId("workspace-state")).toHaveTextContent("Проект 1"));
	await act(async () => pendingSecond.resolve({ ...firstWorkspace, projectId: 2, packageGroup: { ...firstWorkspace.packageGroup, id: 2, remainingHours: -90 } }));
	expect(screen.getByTestId("workspace-state")).toHaveTextContent("Проект 1");
	expect(screen.getByTestId("support-details")).toHaveTextContent("Остаток: 65.5 ч");
});

it("uses the fully reconciled workspace balance after saving, not the older package listing", async () => {
	render(<ClientHoursPackagesPage />);
	await waitFor(() => expect(screen.getByTestId("workspace-state")).toHaveTextContent("Проект 1"));
	api.fetchSupportProjectWorkspace.mockResolvedValue({ projectId: 1, tasks: [], reports: [{ id: "5430" }], packageGroup: { ...packages[0], remainingHours: 0.5, purchases: [{ id: 7, date: "2026-09-01", hours: 80, remaining: 0.5, state: "Активный", amount: null, comment: null, consumptions: [] }] } });
	fireEvent.click(screen.getByRole("button", { name: "Добавить тестовый отчёт" }));
	fireEvent.click(screen.getByRole("button", { name: "Сохранить тестовый отчёт" }));
	await waitFor(() => expect(screen.getByTestId("support-details")).toHaveTextContent("Остаток: 0.5 ч"));
	expect(screen.getByTestId("workspace-state")).toHaveTextContent("отчётов 1");
	expect(notify).toHaveBeenCalledWith(expect.objectContaining({ message: "Отчёт сохранён. Остаток проекта: 65.5 → 0.5 ч.", type: "success" }));
});

it("does not let an older reconciliation invalidate the newly selected project's request", async () => {
	api.fetchSupportProjects.mockResolvedValue([{ id: 1, title: "Первый" }, { id: 2, title: "Второй" }]);
	render(<ClientHoursPackagesPage />);
	await waitFor(() => expect(screen.getByTestId("workspace-state")).toHaveTextContent("Проект 1"));
	const firstWorkspace = await api.fetchSupportProjectWorkspace.mock.results[0].value;
	const pendingFirst = deferred<typeof firstWorkspace>();
	const pendingSecond = deferred<typeof firstWorkspace>();
	api.fetchSupportProjectWorkspace.mockImplementation((projectId: number) => projectId === 1 ? pendingFirst.promise : pendingSecond.promise);
	const initialCalls = api.fetchSupportProjectWorkspace.mock.calls.length;
	fireEvent.click(screen.getByRole("button", { name: "Повторить список" }));
	fireEvent.click(screen.getByRole("button", { name: "Обновить данные" }));
	await waitFor(() => expect(api.fetchSupportHoursPackages).toHaveBeenCalledTimes(2));
	fireEvent.click(screen.getByRole("button", { name: "Второй проект" }));
	await waitFor(() => expect(api.fetchSupportProjectWorkspace).toHaveBeenCalledWith(2, expect.any(AbortSignal)));
	await act(async () => pendingFirst.resolve(firstWorkspace));
	await act(async () => pendingSecond.resolve({ ...firstWorkspace, projectId: 2, packageGroup: { ...firstWorkspace.packageGroup, id: 2, remainingHours: 10 } }));
	await waitFor(() => expect(screen.getByTestId("workspace-state")).toHaveTextContent("Проект 2"));
	expect(api.fetchSupportProjectWorkspace.mock.calls).toHaveLength(initialCalls + 2);
});
