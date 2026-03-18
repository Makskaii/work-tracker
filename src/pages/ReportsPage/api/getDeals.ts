import { $api } from "@/shared/config";
import { Endpoints } from "@/shared/constants/const";
import { SalesCodes } from "../types/types";

export const getDeals = async (
	start: string,
	end: string,
): Promise<
	{
		id: string;
		createdTime: string;
		opportunity: string;
		stageId: string;
		isNew: string;
		createdBy: string;
		movedTime: string;
		[SalesCodes.kpSuccess]: string;
		[SalesCodes.ppoSuccess]: string;
	}[]
> => {
	try {
		const response = await $api.post(Endpoints.crmItems, {
			entityTypeId: 2,
			filter: {
				">=createdTime": start,
				"<=createdTime": end,
			},
			select: [
				"createdTime",
				"opportunity",
				"stageId",
				"isNew",
				"createdBy",
				"movedTime",
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
