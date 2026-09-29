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
	syncSupportProjects: vi.fn(),
	syncSupportHoursReports: vi.fn(),
	updateSupportHoursPackage: vi.fn(),
}));
const { notify } = vi.hoisted(() => ({ notify: vi.fn() }));
vi.mock("./clientHoursPackages.api", () => api);
vi.mock("@/shared/ui/NotificationPopup/notify", () => ({ notify }));
vi.mock("./SupportProjectsSidebar", () => ({
	SupportProjectsSidebar: () => <nav aria-label="Проекты" />,
}));
vi.mock("./ClientHoursPackageModal", () => ({
	ClientHoursPackageModal: () => null,
}));
vi.mock("./SupportProjectDetails", () => ({
	SupportProjectDetails: ({
		projectPackages,
	}: {
		projectPackages: ClientPackage | null;
	}) => (
		<div data-testid="support-details">
			{projectPackages
				? `Остаток: ${projectPackages.remainingHours} ч`
				: "Выберите проект"}
		</div>
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
