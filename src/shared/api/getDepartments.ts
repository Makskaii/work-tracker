import { $api } from "../config";
import { Endpoints } from "../constants/const";

export const getDepartmentsHeads = async (): Promise<string[]> => {
	try {
		const departments = await $api.get(Endpoints.department);

		const items = departments.data?.result;

		if (!Array.isArray(items)) {
			console.warn("Expected items to be an array, but got:", items);
			return [];
		}

		return items.map((dep) => dep.UF_HEAD);
	} catch (error) {
		console.error("Failed to fetch departments", error);
		return [];
	}
};
