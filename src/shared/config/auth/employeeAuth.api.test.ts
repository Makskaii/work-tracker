import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), clear: vi.fn(), defaults: { baseURL: "/devapps/work-tracker/api/" } }));
vi.mock("../axios/axios.config", () => ({ $employeeAuthApi: api, clearBitrixReadCache: api.clear }));
const session = {
	user: { id: 89, name: "Валерия", departmentIds: [26], isAdmin: false },
	rules: [{ action: "read", subject: "post" }], portalOrigin: "https://crm.evolution-soft.ru",
	csrfToken: "csrf-example", expiresAt: "2026-10-09T00:00:00.000Z", returnTo: "/development-kanban",
};
beforeEach(() => {
	vi.resetModules(); vi.clearAllMocks();
	window.history.replaceState({}, "", "/devapps/work-tracker/");
	api.get.mockResolvedValue({ data: session }); api.post.mockResolvedValue({ data: session });
});

describe("employee OAuth browser lifecycle", () => {
	it("strips one-time callback credentials before any request and posts them once across concurrent mounts", async () => {
		window.history.replaceState({}, "", "/devapps/work-tracker?code=one-time-code&state=one-time-state&domain=crm.evolution-soft.ru&member_id=member&scope=crm&server_domain=oauth&view=calendar#selected");
		const { captureEmployeeCallback, getEmployeeSession } = await import("./employeeAuth.api");
		captureEmployeeCallback();
		expect(window.location.search).toBe("?view=calendar");
		expect(window.location.hash).toBe("#selected");
		expect(api.post).not.toHaveBeenCalled();
		const [first, second] = await Promise.all([getEmployeeSession(), getEmployeeSession()]);
		expect(first).toEqual(session); expect(second).toEqual(session);
		expect(api.post).toHaveBeenCalledExactlyOnceWith("auth/employee/complete", { code: "one-time-code", state: "one-time-state", domain: "crm.evolution-soft.ru" });
		expect(api.get).not.toHaveBeenCalled();
		expect(sessionStorage.length).toBe(0); expect(localStorage.length).toBe(0);
	});
	it("checks a cookie session without trusting display state saved by the browser", async () => {
		const { getEmployeeSession } = await import("./employeeAuth.api");
		const { employeeSessionState } = await import("./employee.sessions");
		expect(await getEmployeeSession()).toEqual(session);
		expect(api.get).toHaveBeenCalledExactlyOnceWith("auth/employee/me");
		expect(employeeSessionState.get()?.user.id).toBe(89);
	});
	it("cleans a malformed callback and does not try to authorize without OAuth state", async () => {
		window.history.replaceState({}, "", "/devapps/work-tracker?code=code-only&domain=crm.evolution-soft.ru");
		const { getEmployeeSession } = await import("./employeeAuth.api");
		await expect(getEmployeeSession()).rejects.toThrow("Вход не завершён");
		expect(window.location.search).toBe("");
		expect(api.post).not.toHaveBeenCalled();
		await getEmployeeSession();
		expect(api.get).toHaveBeenCalledExactlyOnceWith("auth/employee/me");
	});
	it("preserves an active session until logout is confirmed by the server", async () => {
		const { logoutEmployee, getEmployeeSession } = await import("./employeeAuth.api");
		const { employeeSessionState } = await import("./employee.sessions");
		await getEmployeeSession();
		api.post.mockRejectedValueOnce(new Error("network failed"));
		await expect(logoutEmployee()).rejects.toThrow();
		expect(employeeSessionState.get()?.user.id).toBe(89);
		await logoutEmployee();
		expect(employeeSessionState.get()).toBeNull();
		expect(api.post).toHaveBeenLastCalledWith("auth/employee/logout", {});
	});
	it("builds the login link from the public backend path with a safe return route", async () => {
		const { employeeLoginUrl } = await import("./employeeAuth.api");
		const url = new URL(employeeLoginUrl("/reports/sales?period=month"));
		expect(url.pathname).toBe("/devapps/work-tracker/api/auth/employee/login");
		expect(url.searchParams.get("returnTo")).toBe("/reports/sales?period=month");
		expect(new URL(employeeLoginUrl("//evil.example")).searchParams.get("returnTo")).toBe("/");
	});
	it("does not consume the real portal iframe's SDK callback parameters", async () => {
		const original = Object.getOwnPropertyDescriptor(window, "top");
		Object.defineProperty(window, "top", { configurable: true, value: {} });
		window.history.replaceState({}, "", "/devapps/work-tracker?code=iframe-code&state=iframe-state");
		try {
			const { captureEmployeeCallback } = await import("./employeeAuth.api");
			captureEmployeeCallback();
			expect(window.location.search).toContain("iframe-code");
		} finally { if (original) Object.defineProperty(window, "top", original); }
	});
});
