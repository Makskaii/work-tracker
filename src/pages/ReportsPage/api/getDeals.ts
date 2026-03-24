import { $api } from "@/shared/config";
import { Endpoints } from "@/shared/constants/const";
import { SalesCodes } from "../types/types";

export const getDeals = async (
	filters?: Record<string, string | number>,
): Promise<
	{
		id: string;
		createdTime: string;
		opportunity: string;
		stageId: string;
		isNew: string;
		createdBy: string;
		movedTime: string;
		[SalesCodes.kpSuccess]: number;
		[SalesCodes.ppoSuccess]: number;
	}[]
> => {
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
