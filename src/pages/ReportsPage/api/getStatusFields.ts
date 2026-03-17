import { $api } from "@/shared/config";
import { Endpoints } from "@/shared/constants/const";
import type { Status } from "@/shared/types/types";

// статусы для смарт-процесса канбан-доски
export const getStatuses = async (): Promise<Status[]> => {
	try {
		const response = await $api.post(Endpoints.status, {
			filter: {
				ENTITY_ID: "DEAL_STAGE",
			},
		});

		const items = response.data?.result;

		if (!Array.isArray(items)) {
			console.warn("Expected items to be an array, but got:", items);
			return [];
		}

		return items;
	} catch (error) {
		console.error("Failed to fetch statusses", error);
		return [];
	}
};
