import { PureAbility } from "@casl/ability";
import { matchRoutes } from "react-router";
import { describe, expect, it } from "vitest";
import { canAccessWorkTrackerPath } from "./routeAccess";

describe("Work Tracker route permissions", () => {
	it.each(["/reports/sales/", "/reports/sales///", "/REPORTS/SALES", "/Reports/Sales/"])("allows the same sales path variants as React Router: %s", (path) => {
		const sales = new PureAbility([{ action: "read", subject: "sales-report" }]);
		expect(matchRoutes([{ path: "/reports/sales" }], path)).not.toBeNull();
		expect(canAccessWorkTrackerPath(sales, path)).toBe(true);
		expect(canAccessWorkTrackerPath(new PureAbility(), path)).toBe(false);
	});

	it("keeps role and employee boundaries when accepting trailing slashes and mixed case", () => {
		const sales = new PureAbility([{ action: "read", subject: "sales-report" }]);
		for (const path of ["/REPORTS/PROFITABILITY/", "/REPORTS/CALENDAR/", "/EMPLOYEE/16/STATS/"]) {
			expect(canAccessWorkTrackerPath(sales, path), path).toBe(false);
		}
		const employee = new PureAbility([{ action: "read", subject: "employee-16" }]);
		expect(matchRoutes([{ path: "/employee/:id/stats" }], "/EMPLOYEE/16/STATS/")).not.toBeNull();
		expect(canAccessWorkTrackerPath(employee, "/EMPLOYEE/16/STATS/")).toBe(true);
		expect(canAccessWorkTrackerPath(employee, "/EMPLOYEE/17/STATS/")).toBe(false);
	});
	it("opens only the sales report plus existing client-account access for a sales role", () => {
		const sales = new PureAbility([
			{ action: "read", subject: "sales-report" },
			{ action: "create-client", subject: "client" },
		]);
		expect(canAccessWorkTrackerPath(sales, "/reports/sales")).toBe(true);
		expect(canAccessWorkTrackerPath(sales, "/create-client-form")).toBe(true);
		for (const path of ["/reports/profitability", "/reports/calendar", "/reports/development", "/reports/migrate", "/development-kanban", "/client-hours-packages", "/employee/16/stats"]) {
			expect(canAccessWorkTrackerPath(sales, path), path).toBe(false);
		}
	});

	it("preserves broader report users' existing pages and sales access", () => {
		const reportUser = new PureAbility([{ action: "read", subject: "post" }]);
		for (const path of ["/reports/sales", "/reports/profitability", "/reports/calendar", "/reports/development", "/development-kanban", "/client-hours-packages"]) {
			expect(canAccessWorkTrackerPath(reportUser, path), path).toBe(true);
		}
		expect(canAccessWorkTrackerPath(reportUser, "/create-client-form")).toBe(false);
	});

	it("requires the exact employee permission and does not infer administrator privileges", () => {
		const employee = new PureAbility([{ action: "read", subject: "employee-16" }]);
		expect(canAccessWorkTrackerPath(employee, "/employee/16/stats")).toBe(true);
		expect(canAccessWorkTrackerPath(employee, "/employee/17/stats")).toBe(false);
		expect(canAccessWorkTrackerPath(employee, "/reports/sales")).toBe(false);
	});

	it.each(["", "reports/sales", "/reports/sales/extra", "/reports/sales-other", "/employee/0/stats", "/not-a-page", "https://outside.example/"])("rejects unrecognized route %s", (path) => {
		expect(canAccessWorkTrackerPath(new PureAbility([{ action: "manage", subject: "all" }]), path)).toBe(false);
	});

	it("denies sales report access for a user with no allowed roles", () => {
		expect(canAccessWorkTrackerPath(new PureAbility(), "/reports/sales")).toBe(false);
	});
});
