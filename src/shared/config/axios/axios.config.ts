/** biome-ignore-all lint/suspicious/noExplicitAny: <to avoid biome errors> */
import axios from "axios";
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
		if (error.response?.status === 401) {
			authStorage.clear();

			if (window.location.pathname !== "/client-profile") {
				window.location.replace("/client-profile");
			}
		}

		return Promise.reject(error);
	},
);
