import { $employeeAuthApi, clearBitrixReadCache } from "../axios/axios.config";
import { employeeSessionState, type EmployeeSession } from "./employee.sessions";

type EmployeeCallback = { code: string; state: string; domain?: string };
let startupRequest: Promise<EmployeeSession> | null = null;
let callback: EmployeeCallback | null = null;
let callbackError: Error | null = null;
let callbackRead = false;

export const captureEmployeeCallback = () => {
	if (callbackRead) return;
	callbackRead = true;
	if (window.self !== window.top) return;
	const url = new URL(window.location.href);
	const hasCallback = url.searchParams.has("code") || url.searchParams.has("state") || url.searchParams.has("error");
	if (!hasCallback) return;
	const code = url.searchParams.get("code");
	const state = url.searchParams.get("state");
	const domain = url.searchParams.get("domain");
	for (const key of ["code", "state", "domain", "member_id", "scope", "server_domain", "error", "error_description"]) url.searchParams.delete(key);
	window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
	if (!code || !state) {
		callbackError = new Error("Вход не завершён. Нажмите «Войти через Битрикс24», чтобы повторить попытку.");
		return;
	}
	callback = { code, state, ...(domain ? { domain } : {}) };
};

export const getEmployeeSession = () => {
	captureEmployeeCallback();
	if (startupRequest) return startupRequest;
	if (callbackError) {
		const error = callbackError;
		callbackError = null;
		return Promise.reject(error);
	}
	const pendingCallback = callback;
	callback = null;
	startupRequest = (pendingCallback
		? $employeeAuthApi.post<EmployeeSession>("auth/employee/complete", pendingCallback)
		: $employeeAuthApi.get<EmployeeSession>("auth/employee/me"))
		.then(({ data }) => {
			if (!Number.isSafeInteger(data.user?.id) || data.user.id <= 0 || !data.csrfToken || !Array.isArray(data.rules)) throw new Error("Не удалось получить вашу учётную запись. Повторите вход.");
			employeeSessionState.set(data);
			clearBitrixReadCache();
			return data;
		})
		.finally(() => { startupRequest = null; });
	return startupRequest;
};

export const employeeLoginUrl = (returnTo: string) => {
	const configuredBase = String($employeeAuthApi.defaults.baseURL || "/devapps/work-tracker/api/");
	const base = new URL(configuredBase.endsWith("/") ? configuredBase : `${configuredBase}/`, window.location.origin);
	const url = new URL("auth/employee/login", base);
	url.searchParams.set("returnTo", returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/");
	return url.href;
};

export const logoutEmployee = async () => {
	await $employeeAuthApi.post("auth/employee/logout", {});
	employeeSessionState.set(null);
	clearBitrixReadCache();
};

export const connectEmployeeFrame = async (accessToken: string) => {
	const { data } = await $employeeAuthApi.post<EmployeeSession>("auth/employee/frame", { accessToken });
	if (data.csrfToken) {
		employeeSessionState.set(data);
		clearBitrixReadCache();
	}
};
