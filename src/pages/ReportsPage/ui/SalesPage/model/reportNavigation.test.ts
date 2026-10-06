import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	DEFAULT_REPORT_NAVIGATION,
	getReportNavigationStorageKey,
	readReportNavigation,
	writeReportNavigation,
} from "./reportNavigation";

const key = getReportNavigationStorageKey({ origin: "https://crm.example", pathname: "/devapps/work-tracker/" }, 42);

beforeEach(() => window.sessionStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("Project report navigation preferences", () => {
	it("stores only tab preferences and an opaque project ID, separately for each portal and user", () => {
		const navigation = { ...DEFAULT_REPORT_NAVIGATION, selectedProjectId: "db-32", activeTab: "projectReports" as const };
		writeReportNavigation(key, navigation);
		expect(readReportNavigation(key)).toEqual(navigation);
		expect(JSON.parse(window.sessionStorage.getItem(key) ?? "{}")).toEqual({ version: 1, ...navigation });
		expect(getReportNavigationStorageKey({ origin: "https://other.example", pathname: "/devapps/work-tracker/" }, 42)).not.toBe(key);
		expect(getReportNavigationStorageKey({ origin: "https://crm.example", pathname: "/devapps/work-tracker/" }, 43)).not.toBe(key);
	});

	it.each(["malformed-json", '{"version":2}', 'null', '"value"'])("ignores unusable stored preferences: %s", (raw) => {
		window.sessionStorage.setItem(key, raw);
		expect(readReportNavigation(key)).toEqual(DEFAULT_REPORT_NAVIGATION);
	});

	it.each(["db-0", "db--2", "db-9007199254740993", "https://other.example/", 12])("rejects an invalid project reference: %s", (projectId) => {
		window.sessionStorage.setItem(key, JSON.stringify({ version: 1, selectedProjectId: projectId, activeTab: "not-a-tab", paymentsScope: "any", isStructureCollapsed: "yes" }));
		expect(readReportNavigation(key)).toEqual(DEFAULT_REPORT_NAVIGATION);
	});

	it("works without browser storage when embedded storage is disabled", () => {
		vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new DOMException("Storage disabled", "SecurityError"); });
		vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("Storage disabled", "SecurityError"); });
		expect(readReportNavigation(key)).toEqual(DEFAULT_REPORT_NAVIGATION);
		expect(() => writeReportNavigation(key, DEFAULT_REPORT_NAVIGATION)).not.toThrow();
	});

	it("also tolerates a browser that rejects access to the storage property itself", () => {
		vi.spyOn(window, "sessionStorage", "get").mockImplementation(() => { throw new DOMException("Storage disabled", "SecurityError"); });
		expect(readReportNavigation(key)).toEqual(DEFAULT_REPORT_NAVIGATION);
		expect(() => writeReportNavigation(key, DEFAULT_REPORT_NAVIGATION)).not.toThrow();
	});
});
