import { $api } from "@/shared/config";
import { DEPARTMENT_IDS, Endpoints } from "@/shared/constants/const";

export const getDevelopers = async (): Promise<
	{
		ID: string;
		NAME: string;
		LAST_NAME: string;
		UF_DEPARTMENT: number[];
		WORK_POSITION: string;
		PERSONAL_PHOTO: string;
	}[]
> => {
	try {
		const response = await $api.get(Endpoints.users, {
			params: {
				filter: {
					"@UF_DEPARTMENT": [DEPARTMENT_IDS.ANALYTICS, DEPARTMENT_IDS.DEV],
				},
				select: [
					"NAME",
					"ID",
					"LAST_NAME",
					"UF_DEPARTMENT",
					"WORK_POSITION",
					"PERSONAL_PHOTO",
				],
			},
		});

		const items = response.data?.result;

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

export type BitrixUser = {
	ID: string;
	NAME: string;
	LAST_NAME: string;
};

export const getUsersByIds = async (userIds: number[]) => {
	try {
		if (userIds.length === 0) {
			return [];
		}

		const response = await $api.get(Endpoints.users, {
			params: {
				filter: {
					"@ID": userIds,
				},
				select: ["NAME", "ID", "LAST_NAME"],
			},
		});

		const items = response.data?.result;

		if (!Array.isArray(items)) {
			console.warn("Expected items to be an array, but got:", items);
			return [];
		}

		return items as BitrixUser[];
	} catch (error) {
		console.error("Failed to fetch users by ids", error);
		return [];
	}
};
