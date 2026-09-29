import { $api } from "@/shared/config";
import { DEPARTMENT_IDS, Endpoints } from "@/shared/constants/const";

export type DeveloperUser = {
	ID: string;
	NAME: string;
	LAST_NAME: string;
	UF_DEPARTMENT: number[];
	WORK_POSITION: string;
	PERSONAL_PHOTO: string;
	ACTIVE?: boolean | "Y" | "N" | 0 | 1 | "0" | "1";
};

type UserListResponse = {
	result?: DeveloperUser[];
	next?: number | null;
};

export const getDevelopers = async (): Promise<DeveloperUser[]> => {
	try {
		const users: DeveloperUser[] = [];
		let start = 0;

		while (true) {
			const response = await $api.get<UserListResponse>(Endpoints.users, {
				params: {
					start,
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
						"ACTIVE",
					],
				},
			});

			const items = response.data?.result;
			if (!Array.isArray(items)) {
				console.warn("Expected user.get result to be an array");
				return [];
			}
			users.push(...items);

			const next = response.data.next;
			if (next === null || next === undefined || next <= start) break;
			start = next;
		}

		return users;
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
