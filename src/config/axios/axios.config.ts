/** biome-ignore-all lint/suspicious/noExplicitAny: <to avoid biome errors> */
import axios from "axios";
import { tasks } from "./mockData";

export const $api = axios.create({
	baseURL: import.meta.env.VITE_API_URL,
	timeout: 3000,
	headers: {
		"Content-Type": "application/json",
		Accept: "application/json",
	},
});

export const fakeApiCall = (): Promise<any> => {
	return new Promise((resolve) => {
		setTimeout(() => {
			resolve(tasks);
		}, 2000);
	});
};
