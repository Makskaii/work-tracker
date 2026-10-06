import { afterEach, describe, expect, it, vi } from "vitest";
import { getAppNavigationKey, isAppNavigationPath, readAppNavigation, saveAppNavigation } from "./appNavigation";

afterEach(() => vi.restoreAllMocks());

describe("application navigation restoration", () => {
	it("scopes saved paths to the user, portal, and application", () => {
		const key = getAppNavigationKey(30, "https://crm.example", "/work-tracker/");
		expect(key).not.toBe(getAppNavigationKey(31, "https://crm.example", "/work-tracker/"));
		expect(key).not.toBe(getAppNavigationKey(30, "https://other.example", "/work-tracker/"));
		expect(key).not.toBe(getAppNavigationKey(30, "https://crm.example", "/other/"));
	});

	it("stores only approved paths without session credentials or form input", () => {
		const setItem = vi.fn();
		saveAppNavigation("key", "/reports/profitability", { setItem });
		expect(setItem).toHaveBeenCalledExactlyOnceWith("key", JSON.stringify({ pathname: "/reports/profitability" }));
		saveAppNavigation("key", "/reports/profitability?AUTH_ID=secret", { setItem });
		saveAppNavigation("key", "https://other.example/reports/profitability", { setItem });
		saveAppNavigation("key", "/client-profile/44", { setItem });
		expect(setItem).toHaveBeenCalledTimes(1);
	});

	it("restores only paths permitted for the current user's roles", () => {
		const getItem = () => JSON.stringify({ pathname: "/reports/profitability" });
		expect(readAppNavigation("key", () => true, { getItem })).toBe("/reports/profitability");
		expect(readAppNavigation("key", () => false, { getItem })).toBeNull();
	});

	it.each(["null", "broken", "{}", '{"pathname":"//other.example"}', '{"pathname":"/client-profile/44"}'])("ignores invalid saved state: %s", (value) => {
		expect(readAppNavigation("key", () => true, { getItem: () => value })).toBeNull();
	});

	it("keeps navigation functional when embedded session storage is blocked", () => {
		vi.spyOn(window, "sessionStorage", "get").mockImplementation(() => { throw new DOMException("blocked", "SecurityError"); });
		expect(readAppNavigation("key", () => true)).toBeNull();
		expect(() => saveAppNavigation("key", "/reports/profitability")).not.toThrow();
	});

	it("recognizes internal app routes and rejects authentication-only routes", () => {
		expect(isAppNavigationPath("/development-kanban")).toBe(true);
		expect(isAppNavigationPath("/employee/10/stats")).toBe(true);
		expect(isAppNavigationPath("/client-profile")).toBe(false);
	});
});
