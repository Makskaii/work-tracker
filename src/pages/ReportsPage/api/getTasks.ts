import { $api } from "@/shared/config";
import { Endpoints } from "@/shared/constants/const";
import type { AnyObject } from "../../../shared/types/types";

export const getItems = async <T>({
	typeId,
	filters,
	select,
}: {
	typeId: number;
	filters?: AnyObject;
	select?: readonly string[];
}): Promise<T[]> => {
	try {
		const response = await $api.get(Endpoints.crmItems, {
			params: {
				entityTypeId: typeId,
				select,
				filter: {
					...filters,
				},
			},
		});

		const items = response.data?.result?.items;

		if (!Array.isArray(items)) {
			console.warn("Expected items to be an array, but got:", items);
			return [];
		}

		return items;
	} catch (error) {
		console.error("Failed to fetch tasks", error);
		return [];
	}
};
