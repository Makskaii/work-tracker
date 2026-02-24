import { $api } from "@/shared/config";
import { Endpoints } from "@/shared/constants/const";
import type { TaskProps } from "@/shared/types/types";

export const getDevelopers = async (): Promise<TaskProps[]> => {
	try {
		const response = await $api.get(Endpoints.users, {
			params: {
				UF_DEPARTMENT: 23,
			},
		});

		const items = response.data?.result;

		if (!Array.isArray(items)) {
			console.warn("Expected items to be an array, but got:", items);
			return [];
		}

		return items;
	} catch (error) {
		console.error("Failed to fetch developers", error);
		return [];
	}
};
