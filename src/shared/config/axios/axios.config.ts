/** biome-ignore-all lint/suspicious/noExplicitAny: <to avoid biome errors> */
import axios, {
	type AxiosAdapter,
	type AxiosResponse,
	type InternalAxiosRequestConfig,
} from "axios";
import { authStorage } from "../auth/auth.sessions";

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
	...defaultConfig,
});

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
		const request = defaultApiAdapter(requestConfig)
			.then((response) => {
				// Bitrix may return an API error with HTTP 200. A retry must reach CRM.
				const data: unknown = response.data;
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

$backendApi.interceptors.request.use((config) => {
	const session = authStorage.get();

	if (session?.accessToken) {
		config.headers.Authorization = `Bearer ${session.accessToken}`;
	}

	return config;
});

$backendApi.interceptors.response.use(
	(response) => response,
	(error) => {
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
