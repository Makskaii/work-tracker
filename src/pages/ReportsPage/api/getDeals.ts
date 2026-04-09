import { $api } from "@/shared/config";
import { Endpoints } from "@/shared/constants/const";
import type { Deal } from "../types/deals.types";
import { SalesCodes } from "../types/types";

export const getDeals = async (
	filters?: Record<string, string | number>,
): Promise<Deal[]> => {
	try {
		const response = await $api.post(Endpoints.crmItems, {
			entityTypeId: 2,
			filter: {
				...filters,
			},
			select: [
				"createdTime",
				"opportunity",
				"stageId",
				"isNew",
				"createdBy",
				"movedTime",
				SalesCodes.kpSuccess,
				SalesCodes.ppoSuccess,
				SalesCodes.kpday,
				SalesCodes.ppoDay,
				"title",
			],
		});

		const items = response.data?.result.items;

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
