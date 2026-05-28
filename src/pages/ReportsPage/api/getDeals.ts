import { $api } from "@/shared/config";
import { Endpoints } from "@/shared/constants/const";
import { type Deal, DealCodes } from "../types/deals.types";
import { SalesCodes } from "../types/types";

export const getDeals = async (
	filters?: Record<string, string | number | undefined>,
	signal?: AbortSignal,
): Promise<Deal[]> => {
	try {
		const response = await $api.post(
			Endpoints.crmItems,
			{
				entityTypeId: 2,
				filter: {
					...filters,
				},
				select: [
					"id",
					"createdTime",
					"opportunity",
					"stageId",
					"isNew",
					"createdBy",
					"movedTime",
					"assignedById",
					"companyId",
					DealCodes.purchasedHours,
					SalesCodes.kpSuccess,
					SalesCodes.ppoSuccess,
					SalesCodes.kpday,
					SalesCodes.ppoDay,
					SalesCodes.analytic,
					SalesCodes.totalCost,
					SalesCodes.costFile,
					SalesCodes.estimateCost,
					"title",
				],
			},
			{
				signal,
			},
		);

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
