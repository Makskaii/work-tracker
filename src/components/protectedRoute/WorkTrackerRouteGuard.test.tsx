import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ability } from "@/shared/config/ability/casl";
import { WorkTrackerRouteGuard } from "./WorkTrackerRouteGuard";

afterEach(() => { cleanup(); ability.update([]); });

describe("Work Tracker route guard", () => {
	it("does not mount an unauthorized page or start its data loading", () => {
		ability.update([{ action: "read", subject: "sales-report" }]);
		const load = vi.fn();
		const ConfidentialPage = () => { load(); return <p>Financial data</p>; };
		render(<WorkTrackerRouteGuard pathname="/reports/profitability"><ConfidentialPage /></WorkTrackerRouteGuard>);
		expect(screen.getByText("У вас нет прав на просмотр этой страницы")).toBeInTheDocument();
		expect(load).not.toHaveBeenCalled();
	});

	it("mounts the sales report for its specific role", () => {
		ability.update([{ action: "read", subject: "sales-report" }]);
		render(<WorkTrackerRouteGuard pathname="/reports/sales"><p>Sales data</p></WorkTrackerRouteGuard>);
		expect(screen.getByText("Sales data")).toBeInTheDocument();
	});
});
