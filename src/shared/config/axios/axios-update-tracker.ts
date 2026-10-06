import axios, { type AxiosAdapter, type AxiosInstance } from "axios";
import { acquireAppUpdateBlocker } from "@/shared/lib/appUpdates";

/** Register before other request interceptors so their final adapter is tracked. */
export const trackAppUpdateRequests = (client: AxiosInstance) => {
	client.interceptors.request.use((config) => {
		const selectedAdapter = config.adapter ?? axios.defaults.adapter;
		const adapter =
			typeof selectedAdapter === "function"
				? selectedAdapter
				: axios.getAdapter(selectedAdapter);

		config.adapter = ((requestConfig) => {
			const release = acquireAppUpdateBlocker();
			return Promise.resolve()
				.then(() => adapter(requestConfig))
				.finally(release);
		}) satisfies AxiosAdapter;

		return config;
	});
};
