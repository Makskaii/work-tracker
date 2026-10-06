import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider, useOutletContext } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReportsContext } from "@/shared/types/types";
import ReportsPage from "./ReportsPage";

const requests = vi.hoisted(() => ({ get: vi.fn(), users: vi.fn(), statuses: vi.fn(), activities: vi.fn() }));
vi.mock("@/shared/config", () => ({ $api: { get: requests.get } }));
vi.mock("./api/getDevelopers", () => ({ getDevelopers: requests.users }));
vi.mock("./api/getStatusFields", () => ({ getStatuses: requests.statuses }));
vi.mock("@/shared/api/getCrmFields", () => ({ getActivitiesList: requests.activities }));
vi.mock("@/components/protectedRoute/CheckPermission", () => ({ CheckPermission: ({ children }: { children: React.ReactNode }) => children }));

const Probe = () => {
	const context = useOutletContext<ReportsContext>();
	return <output data-testid="context">{JSON.stringify({ users: context.users, activities: context.activities, projects: context.projects, tasks: context.tasks })}</output>;
};
const mount = (path: string) => {
	const router = createMemoryRouter([{ path: "/reports", element: <ReportsPage />, children: [{ path: ":section", element: <Probe /> }] }], { initialEntries: [path] });
	render(<RouterProvider router={router} />);
	return router;
};
beforeEach(() => {
	vi.resetAllMocks();
	requests.users.mockResolvedValue([{ ID: "7", NAME: "Имя", LAST_NAME: "Фамилия", UF_DEPARTMENT: [1] }]);
	requests.statuses.mockResolvedValue([]);
	requests.activities.mockResolvedValue([{ ID: "1", NAME: "Разработка" }]);
	requests.get.mockResolvedValue({ data: { result: { items: [] } } });
});
afterEach(cleanup);

describe("report data on demand", () => {
	it.each(["/reports/calendar/", "/REPORTS/CALENDAR", "/Reports/Calendar/"])("loads calendar resources for the router-compatible path %s", async (path) => {
		mount(path);
		await waitFor(() => expect(screen.getByTestId("context")).toHaveTextContent("Имя Фамилия"));
		await waitFor(() => expect(screen.getByTestId("context")).toHaveTextContent("Разработка"));
		expect(requests.users).toHaveBeenCalledTimes(1);
		expect(requests.activities).toHaveBeenCalledTimes(1);
		expect(requests.get).toHaveBeenCalledTimes(1);
		expect(requests.statuses).not.toHaveBeenCalled();
	});

	it("does not load unrelated CRM users, tasks, statuses or catalog for the project report", async () => {
		mount("/reports/profitability");
		await waitFor(() => expect(screen.getByTestId("context")).toHaveTextContent("Разработка"));
		expect(requests.activities).toHaveBeenCalledTimes(1);
		expect(requests.users).not.toHaveBeenCalled();
		expect(requests.statuses).not.toHaveBeenCalled();
		expect(requests.get).not.toHaveBeenCalled();
	});
	it("loads shared data only when its report opens and retains it between report tabs", async () => {
		const router = mount("/reports/projects-plan");
		expect(requests.activities).not.toHaveBeenCalled();
		expect(requests.get).not.toHaveBeenCalled();
		await act(() => router.navigate("/reports/calendar"));
		await waitFor(() => expect(screen.getByTestId("context")).toHaveTextContent("Имя Фамилия"));
		expect(requests.users).toHaveBeenCalledTimes(1);
		expect(requests.activities).toHaveBeenCalledTimes(1);
		expect(requests.get).toHaveBeenCalledTimes(1);
		expect(requests.statuses).not.toHaveBeenCalled();
		await act(() => router.navigate("/reports/developers"));
		await waitFor(() => expect(requests.statuses).toHaveBeenCalledTimes(1));
		await act(() => router.navigate("/reports/projects-plan"));
		await act(() => router.navigate("/reports/calendar"));
		expect(requests.users).toHaveBeenCalledTimes(1);
		expect(requests.activities).toHaveBeenCalledTimes(1);
		expect(requests.get).toHaveBeenCalledTimes(1);
		expect(JSON.parse(screen.getByTestId("context").textContent ?? "{}").tasks).toEqual([]);
	});
	it("aborts data a departed report no longer needs and ignores late responses", async () => {
		let finish: ((users: unknown[]) => void) | undefined;
		requests.users.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
		const router = mount("/reports/calendar");
		const signal = requests.users.mock.calls[0][0] as AbortSignal;
		await act(() => router.navigate("/reports/projects-plan"));
		expect(signal.aborted).toBe(true);
		await act(async () => finish?.([{ ID: "9", NAME: "Устаревший", LAST_NAME: "ответ", UF_DEPARTMENT: [] }]));
		expect(screen.getByTestId("context")).not.toHaveTextContent("Устаревший");
		await act(() => router.navigate("/reports/calendar"));
		await waitFor(() => expect(screen.getByTestId("context")).toHaveTextContent("Имя Фамилия"));
		expect(requests.users).toHaveBeenCalledTimes(2);
	});
});
