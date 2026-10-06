import { $api } from "@/shared/config";
import { Endpoints } from "@/shared/constants/const";
import type { Status } from "@/shared/types/types";

// статусы для смарт-процесса канбан-доски
export const getStatuses = async (signal?: AbortSignal): Promise<Status[]> => {
	try {
		const response = await $api.post(Endpoints.status, {
			filter: {
				ENTITY_ID: "DYNAMIC_1072_STAGE_18",
			},
		}, { signal });

		const items = response.data?.result;

		if (!Array.isArray(items)) {
			console.warn("Expected items to be an array, but got:", items);
			return [];
		}

		return items;
	} catch (error) {
		if (signal) throw error;
		console.error("Failed to fetch statusses", error);
		return [];
	}
};
