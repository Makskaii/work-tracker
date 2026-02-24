import { $api } from "../../../shared/config";
import { Endpoints } from "../../../shared/constants/const";

export const getCrmFields = async (
	crmId: number,
	filedName: string,
): Promise<
	{
		ID: string;
		VALUE: string;
	}[]
> => {
	try {
		const response = await $api.post(Endpoints.crmFeilds, {
			entityTypeId: crmId,
		});

		const items = response.data.result.fields[filedName].items;
		console.log({ items });
		if (!Array.isArray(items)) {
			console.warn("Expected items to be an array, but got:", items);
			return [];
		}

		return items;
	} catch (error) {
		console.error(`Failed to fetch fields for ${filedName}`, error);
		return [];
	}
};
