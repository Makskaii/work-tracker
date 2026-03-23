/** biome-ignore-all lint/suspicious/noExplicitAny: <to avoid biome errors> */
import axios from "axios";

export const $api = axios.create({
	baseURL: import.meta.env.VITE_API_URL,
	timeout: 30000,
	headers: {
		"Content-Type": "application/json",
		Accept: "application/json",
	},
});
