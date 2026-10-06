import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { RouterProvider } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ salesLoads: 0, reportLoads: 0, profitabilityLoads: 0 }));
vi.mock("@bitrix24/b24jssdk", () => ({
	initializeB24Frame: async () => ({
		auth: { isAdmin: false },
		actions: { v2: { call: { make: async () => ({ getData: () => ({ result: { ID: "30", UF_DEPARTMENT: [19] } }) }) } } },
	}),
	LoggerFactory: { createForBrowser: () => ({ error: vi.fn() }) },
}));
vi.mock("@/shared/api/getDepartments", () => ({
	getWorkTrackerDepartmentAccess: async () => ({ heads: [], reportDepartmentIds: [23, 25], salesDepartmentIds: [19] }),
}));
vi.mock("@/components/layout/AppHeader", () => ({ AppHeader: () => null }));
vi.mock("@/pages/ReportsPage/ui/SalesPage/SalesPage", () => {
	mocks.salesLoads += 1;
	return { SalesPage: () => <p>Sales report ready</p> };
});
vi.mock("@/pages/ReportsPage/ReportsPage", () => {
	mocks.reportLoads += 1;
	return { default: () => <p>Shared reports workspace</p> };
});
vi.mock("@/pages/ReportsPage/ui/SalesPage/SalesProfitabilityPage", () => {
	mocks.profitabilityLoads += 1;
	return { SalesProfitabilityPage: () => <p>Profitability report</p> };
});

const originalTop = Object.getOwnPropertyDescriptor(window, "top");
afterEach(() => {
	cleanup(); vi.unstubAllEnvs(); sessionStorage.clear();
	if (originalTop) Object.defineProperty(window, "top", originalTop);
});

describe("sales report route and lazy permissions", () => {
	it("opens sales without importing the shared reports workspace, and does not load unauthorized profitability", async () => {
		vi.stubEnv("DEV", false);
		vi.stubEnv("BASE_URL", "/");
		Object.defineProperty(window, "top", { configurable: true, value: {} });
		window.history.replaceState(null, "", "/");
		const { router } = await import("./router.config");
		try {
			render(<RouterProvider router={router} />);
			expect(await screen.findByText("Sales report ready")).toBeInTheDocument();
			expect(mocks.salesLoads).toBe(1);
			expect(mocks.reportLoads).toBe(0);
			expect(mocks.profitabilityLoads).toBe(0);
			await act(async () => { await router.navigate("/reports/profitability"); });
			await waitFor(() => expect(screen.getByText("У вас нет прав на просмотр этой страницы")).toBeInTheDocument());
			expect(mocks.reportLoads).toBe(0);
			expect(mocks.profitabilityLoads).toBe(0);
		} finally {
			router.dispose();
		}
	});
});
