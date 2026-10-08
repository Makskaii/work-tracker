/** biome-ignore-all lint/suspicious/noExplicitAny: <to avoid biome errors> */
import axios, {
	type AxiosAdapter,
	type AxiosResponse,
	type InternalAxiosRequestConfig,
} from "axios";
import { authStorage } from "../auth/auth.sessions";
import { employeeSessionState, getIframeTokenProvider, isClientCabinetRequest, isProductionStandalone } from "../auth/employee.sessions";
import { trackAppUpdateRequests } from "./axios-update-tracker";

const defaultConfig = {
	timeout: 30000,
	headers: {
		"Content-Type": "application/json",
		Accept: "application/json",
	},
};

export const $api = axios.create({
	baseURL: import.meta.env.VITE_API_URL,
	...defaultConfig,
});

export const $backendApi = axios.create({
	baseURL: import.meta.env.VITE_BFF_API_URL,
	withCredentials: true,
	...defaultConfig,
});

// Auth endpoints intentionally bypass the client-cabinet JWT interceptor.
export const $employeeAuthApi = axios.create({
	baseURL: import.meta.env.VITE_BFF_API_URL || "/devapps/work-tracker/api/",
	withCredentials: true,
	...defaultConfig,
});
$employeeAuthApi.interceptors.request.use((config) => {
	const session = employeeSessionState.get();
	if (session && config.method !== "get") config.headers.set("X-Work-Tracker-CSRF", session.csrfToken);
	return config;
});

const employeeRestAdapter: AxiosAdapter = async (config) => {
	const method = String(config.url ?? "").replace(/^\/+|\.json$/g, "");
	if (!/^[a-z][a-z0-9_.]+$/i.test(method)) throw new Error("Недопустимый запрос к Битрикс24");
	const body = typeof config.data === "string" ? JSON.parse(config.data) : config.data;
	const params = { ...(config.params ?? {}), ...(body && typeof body === "object" ? body : {}) };
	const tokenProvider = getIframeTokenProvider();
	const token = tokenProvider ? await tokenProvider() : null;
	const { data, status, statusText, headers } = await $employeeAuthApi.post("auth/employee/rest", { method, params }, { signal: config.signal, timeout: config.timeout, ...(token ? { headers: { "X-Bitrix-Token": token } } : {}) });
	return { data, status, statusText, headers, config };
};
const shouldUseEmployeeProxy = () => Boolean(employeeSessionState.get() || getIframeTokenProvider() || isProductionStandalone());
const getApiAdapter = () => shouldUseEmployeeProxy() ? employeeRestAdapter : defaultApiAdapter;

trackAppUpdateRequests($api);
trackAppUpdateRequests($backendApi);

const BITRIX_CACHE_TTL_MS = 5 * 60 * 1000;
const BITRIX_CACHEABLE_ENDPOINTS = new Set([
	"user.get",
	"crm.status.list",
	"lists.element.get",
	"crm.item.fields",
	"crm.deal.list",
	"crm.item.list",
]);

const bitrixResponseCache = new Map<
	string,
	{ expiresAt: number; response: AxiosResponse }
>();
const bitrixInflightRequests = new Map<string, Promise<AxiosResponse>>();
const defaultApiAdapter = axios.getAdapter(axios.defaults.adapter);

export const clearBitrixReadCache = (endpoints?: readonly string[]) => {
	for (const [key, entry] of bitrixResponseCache) {
		if (!endpoints || endpoints.includes(String(entry.response.config.url))) {
			bitrixResponseCache.delete(key);
		}
	}
};

const getBitrixResponseBody = (data: unknown): unknown => {
	if (typeof data !== "string") {
		return data;
	}

	try {
		return JSON.parse(data);
	} catch {
		return null;
	}
};

const normalizeCacheValue = (value: unknown): unknown => {
	if (Array.isArray(value)) {
		return value.map(normalizeCacheValue);
	}

	if (value && typeof value === "object") {
		return Object.fromEntries(
			Object.entries(value)
				.sort(([left], [right]) => left.localeCompare(right))
				.map(([key, item]) => [key, normalizeCacheValue(item)]),
		);
	}

	return value;
};

const getBitrixCacheKey = (config: InternalAxiosRequestConfig) => {
	const url = String(config.url ?? "");

	if (!BITRIX_CACHEABLE_ENDPOINTS.has(url)) {
		return null;
	}

	return JSON.stringify({
		user: employeeSessionState.get()?.user.id ?? null,
		sessionRevision: employeeSessionState.getRevision(),
		data: normalizeCacheValue(config.data),
		method: String(config.method ?? "get").toLowerCase(),
		params: normalizeCacheValue(config.params),
		url,
	});
};

const getCachedBitrixResponse = (
	cacheKey: string,
	config: InternalAxiosRequestConfig,
) => {
	const cached = bitrixResponseCache.get(cacheKey);

	if (!cached) {
		return null;
	}

	if (cached.expiresAt <= Date.now()) {
		bitrixResponseCache.delete(cacheKey);
		return null;
	}

	return {
		...cached.response,
		config,
	};
};

$api.interceptors.request.use((config) => {
	const cacheKey = getBitrixCacheKey(config);

	if (!cacheKey) {
		if (shouldUseEmployeeProxy()) config.adapter = employeeRestAdapter;
		return config;
	}

	const cachedResponse = getCachedBitrixResponse(cacheKey, config);

	if (cachedResponse) {
		config.adapter = () => Promise.resolve(cachedResponse);
		return config;
	}

	const existingRequest = bitrixInflightRequests.get(cacheKey);

	if (existingRequest && !config.signal) {
		config.adapter = () =>
			existingRequest.then((response) => ({
				...response,
				config,
			}));
		return config;
	}

	config.adapter = ((requestConfig) => {
		const request = getApiAdapter()(requestConfig)
			.then((response) => {
				// Bitrix may return an API error with HTTP 200. A retry must reach CRM.
				// Adapters return raw JSON before Axios applies transformResponse.
				// Inspect a parsed copy while leaving the response for Axios to transform.
				const data = getBitrixResponseBody(response.data);
				const validResult =
					data !== null &&
					typeof data === "object" &&
					"result" in data &&
					!("error" in data && data.error);
				const validItems =
					requestConfig.url !== "crm.item.list" ||
					(validResult &&
						typeof data.result === "object" &&
						data.result !== null &&
						"items" in data.result &&
						Array.isArray(data.result.items));
				const validCursor =
					requestConfig.url !== "crm.item.list" ||
					(validResult &&
						(!("next" in data) ||
							data.next === null ||
							(typeof data.next === "number" &&
								Number.isFinite(data.next) &&
								data.next > Number(requestConfig.params?.start ?? 0))));
				if (validResult && validItems && validCursor) {
					bitrixResponseCache.set(cacheKey, {
						expiresAt: Date.now() + BITRIX_CACHE_TTL_MS,
						response,
					});
				}

				return response;
			})
			.finally(() => {
				bitrixInflightRequests.delete(cacheKey);
			});

		if (!requestConfig.signal) {
			bitrixInflightRequests.set(cacheKey, request);
		}

		return request;
	}) satisfies AxiosAdapter;

	return config;
});

$backendApi.interceptors.request.use(async (config) => {
	const employee = employeeSessionState.get();
	const clientRequest = isClientCabinetRequest(String(config.url ?? ""));
	const iframeToken = getIframeTokenProvider();
	if (iframeToken && !clientRequest) {
		config.headers.delete("Authorization");
		config.headers.set("X-Bitrix-Token", await iframeToken());
		return config;
	}
	if (employee && !clientRequest) {
		config.headers.delete("Authorization");
		config.headers.delete("X-Bitrix-Token");
		if (config.method !== "get") config.headers.set("X-Work-Tracker-CSRF", employee.csrfToken);
		return config;
	}
	if (isProductionStandalone() && !clientRequest) {
		config.headers.delete("Authorization");
		config.headers.delete("X-Bitrix-Token");
		return config;
	}
	const session = authStorage.get();

	if (session?.accessToken) {
		config.headers.Authorization = `Bearer ${session.accessToken}`;
	}

	return config;
});

$backendApi.interceptors.response.use(
	(response) => response,
	(error) => {
		if (error.response?.status === 401 && (employeeSessionState.get() || getIframeTokenProvider() || isProductionStandalone()) && !isClientCabinetRequest(String(error.config?.url ?? ""))) {
			employeeSessionState.expire();
			clearBitrixReadCache();
			return Promise.reject(error);
		}
		if (
			error.response?.status === 401 &&
			!error.config?.headers?.["X-Bitrix-Token"]
		) {
			authStorage.clear();

			if (window.location.pathname !== "/client-profile") {
				window.location.replace("/client-profile");
			}
		}

		return Promise.reject(error);
	},
);

$employeeAuthApi.interceptors.response.use((response) => response, (error) => {
	if (error.response?.status === 401 && !/auth\/employee\/(?:me|complete|frame)/.test(String(error.config?.url ?? ""))) {
		employeeSessionState.expire();
		clearBitrixReadCache();
	}
	return Promise.reject(error);
});
