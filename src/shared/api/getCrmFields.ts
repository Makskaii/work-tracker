import { $api } from "@/shared/config";
import { Endpoints } from "@/shared/constants/const";
import type { ClientListItems } from "../types/types";

export const getClientsFromList = async (): Promise<ClientListItems[]> => {
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

export const getProjectsFromList = async (): Promise<ClientListItems[]> => {
	try {
		const response = await $api.post(Endpoints.lists, {
			IBLOCK_TYPE_ID: "lists",
			IBLOCK_ID: "24",
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

export const getActivities = async (): Promise<{
	[key: string]: { items: { ID: string; VALUE: string }[] };
}> => {
	try {
		const response = await $api.post(Endpoints.crmFeilds, {
			entityTypeId: 1060,
		});

		const items = response.data.result.fields;

		return items;
	} catch (error) {
		console.error(`Failed to fetch fields`, error);
		return {};
	}
};
