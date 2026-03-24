/** biome-ignore-all lint/suspicious/noExplicitAny: <to avoid biome errors> */
import axios from "axios";

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
