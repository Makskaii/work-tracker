import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const transport = vi.hoisted(() => vi.fn());
vi.mock("axios", async (importOriginal) => {
	const original = await importOriginal<typeof import("axios")>();
	return { ...original, default: { ...original.default, getAdapter: () => transport } };
});
const session = { user: { id: 30, name: "Сотрудник", departmentIds: [23], isAdmin: false }, rules: [{ action: "read", subject: "post" }], portalOrigin: "https://crm.evolution-soft.ru", csrfToken: "csrf-example", expiresAt: "2026-10-09" };
const response = (config: InternalAxiosRequestConfig, data: unknown = { result: { items: [{ id: 5 }] }, next: 50, total: 75 }) => ({ data, status: 200, statusText: "OK", headers: new AxiosHeaders(), config });
beforeEach(() => { vi.resetModules(); transport.mockReset(); sessionStorage.clear(); vi.stubEnv("DEV", true); });
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });
async function setup() {
	const state = await import("../auth/employee.sessions");
	const clients = await import("./axios.config");
	clients.$employeeAuthApi.defaults.adapter = transport;
	clients.$backendApi.defaults.adapter = transport;
	transport.mockImplementation(async (config) => response(config));
	return { ...state, ...clients };
}

describe("employee cookie and iframe transports", () => {
	it("proxies employee reads and preserves native pagination and read caching", async () => {
		const { employeeSessionState, $api } = await setup(); employeeSessionState.set(session);
		const params = { entityTypeId: 1072, filter: { stageId: "SPRINT" }, start: 0 };
		const first = await $api.get("crm.item.list", { params });
		expect(first.data.next).toBe(50); expect(first.data.total).toBe(75);
		expect((await $api.get("crm.item.list", { params })).data).toEqual(first.data);
		expect(transport).toHaveBeenCalledTimes(1);
		const request = transport.mock.calls[0][0];
		expect(request.url).toBe("auth/employee/rest");
		expect(JSON.parse(request.data)).toEqual({ method: "crm.item.list", params });
		expect(request.withCredentials).toBe(true);
		expect(request.headers.get("X-Work-Tracker-CSRF")).toBe("csrf-example");
		expect(request.headers.has("Authorization")).toBe(false);
		expect(request.headers.has("X-Bitrix-Token")).toBe(false);
	});
	it("proxies writes through the employee session without exposing OAuth credentials", async () => {
		const { employeeSessionState, $api } = await setup(); employeeSessionState.set(session);
		await $api.post("crm.item.update", { entityTypeId: 1072, id: 5, fields: { title: "Обновлено" } });
		expect(JSON.parse(transport.mock.calls[0][0].data)).toEqual({ method: "crm.item.update", params: { entityTypeId: 1072, id: 5, fields: { title: "Обновлено" } } });
	});
	it("does not reuse an old in-flight read after logout and login, even for the same employee", async () => {
		const { employeeSessionState, $api } = await setup(); employeeSessionState.set(session);
		let finishOld!: (value: ReturnType<typeof response>) => void;
		transport.mockImplementationOnce((config) => new Promise((resolve) => { finishOld = (value) => resolve({ ...value, config }); }));
		const oldRead = $api.get("crm.item.list");
		await vi.waitFor(() => expect(transport).toHaveBeenCalledTimes(1));
		employeeSessionState.set(null); employeeSessionState.set(session);
		const currentRead = await $api.get("crm.item.list");
		expect(transport).toHaveBeenCalledTimes(2);
		finishOld(response(transport.mock.calls[0][0], { result: { items: [{ id: 999 }] } }));
		await oldRead;
		expect((await $api.get("crm.item.list")).data).toEqual(currentRead.data);
	});
	it("authenticates iframe proxy reads and staff backend requests with the fresh SDK token when a cookie is unavailable", async () => {
		const { setIframeTokenProvider, $api, $backendApi } = await setup();
		const token = vi.fn().mockResolvedValue("real-sdk-user-token"); setIframeTokenProvider(token);
		await $api.get("department.get"); await $backendApi.get("support-hours-packages");
		expect(token).toHaveBeenCalledTimes(2);
		expect(transport.mock.calls[0][0].url).toBe("auth/employee/rest");
		for (const [config] of transport.mock.calls) expect(config.headers.get("X-Bitrix-Token")).toBe("real-sdk-user-token");
	});
	it("keeps the real refreshable iframe token ahead of an expiring optional cookie session", async () => {
		const { employeeSessionState, setIframeTokenProvider, $api, $backendApi } = await setup();
		employeeSessionState.set(session);
		const token = vi.fn().mockResolvedValue("fresh-sdk-token"); setIframeTokenProvider(token);
		await $api.get("user.get"); await $backendApi.post("support-hours-packages/projects/5/transfers", {});
		expect(token).toHaveBeenCalledTimes(2);
		for (const [config] of transport.mock.calls) expect(config.headers.get("X-Bitrix-Token")).toBe("fresh-sdk-token");
	});
	it("removes the support transfer placeholder and any cabinet JWT from staff requests", async () => {
		const { employeeSessionState, $backendApi } = await setup(); employeeSessionState.set(session);
		const { authStorage } = await import("../auth/auth.sessions");
		authStorage.set({ accessToken: "client-jwt", clientId: "c", crmClientId: 5, clientName: "Клиент", email: "client@example.test" });
		await $backendApi.post("support-hours-packages/projects/5/transfers", {}, { headers: { "X-Bitrix-Token": "employee-session" } });
		const config = transport.mock.calls[0][0];
		expect(config.headers.get("X-Work-Tracker-CSRF")).toBe("csrf-example");
		expect(config.headers.has("X-Bitrix-Token")).toBe(false);
		expect(config.headers.has("Authorization")).toBe(false);
	});
	it("leaves the existing client-cabinet JWT requests separate from employee login", async () => {
		const { employeeSessionState, $backendApi } = await setup(); employeeSessionState.set(session);
		const { authStorage } = await import("../auth/auth.sessions");
		authStorage.set({ accessToken: "client-jwt", clientId: "c", crmClientId: 5, clientName: "Клиент", email: "client@example.test" });
		await $backendApi.get("clients/me/tasks");
		expect(transport.mock.calls[0][0].headers.get("Authorization")).toBe("Bearer client-jwt");
		expect(transport.mock.calls[0][0].headers.has("X-Work-Tracker-CSRF")).toBe(false);
	});
	it("expires only the employee session on a staff 401 and retains a separate client login", async () => {
		const { employeeSessionState, $backendApi } = await setup(); employeeSessionState.set(session);
		const { authStorage } = await import("../auth/auth.sessions");
		authStorage.set({ accessToken: "client-jwt", clientId: "c", crmClientId: 5, clientName: "Клиент", email: "client@example.test" });
		const expired = vi.fn(); employeeSessionState.subscribeExpired(expired);
		transport.mockImplementation(async (config) => { throw new AxiosError("expired", "401", config, undefined, { ...response(config), status: 401 }); });
		await expect($backendApi.get("support-hours-packages")).rejects.toThrow();
		expect(expired).toHaveBeenCalledTimes(1); expect(employeeSessionState.get()).toBeNull();
		expect(authStorage.get()?.accessToken).toBe("client-jwt");
	});
	it("keeps the employee session and displayed data on temporary backend failures", async () => {
		const { employeeSessionState, $backendApi } = await setup(); employeeSessionState.set(session);
		const expired = vi.fn(); employeeSessionState.subscribeExpired(expired);
		transport.mockImplementation(async (config) => { throw new AxiosError("upstream unavailable", "502", config, undefined, { ...response(config), status: 502 }); });
		await expect($backendApi.get("support-hours-packages")).rejects.toThrow();
		expect(expired).not.toHaveBeenCalled(); expect(employeeSessionState.get()?.user.id).toBe(30);
	});
	it("rejects absolute REST URLs instead of calling a browser-supplied portal or webhook", async () => {
		const { employeeSessionState, $api } = await setup(); employeeSessionState.set(session);
		await expect($api.get("https://other.example/rest/secret/crm.item.list")).rejects.toThrow("Недопустимый запрос");
		expect(transport).not.toHaveBeenCalled();
	});
});
