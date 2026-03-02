import { $api } from "@/shared/config";
import { Endpoints } from "@/shared/constants/const";

export const getProjectsFromList = async (): Promise<
	{
		ID: string;
		NAME: string;
	}[]
> => {
	try {
		const response = await $api.post(Endpoints.lists, {
			IBLOCK_TYPE_ID: "lists",
			IBLOCK_ID: "23",
			SELECT: ["ID", "NAME"],
		});

		const items = response.data.result;

		if (!Array.isArray(items)) {
			console.warn("Expected items to be an array, but got:", items);
			return [];
		}

		return items;
	} catch (error) {
		console.error(`Failed to fetch fields`, error);
		return [];
	}
};
