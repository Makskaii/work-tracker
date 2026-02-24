import { $api } from "../../../shared/config";
import { Endpoints, TASK_SELECT_FIELDS } from "../../../shared/constants/const";
import type { TaskProps } from "../ui/ProgressReports/types";

export const getTasks = async (userId: string): Promise<TaskProps[]> => {
	try {
		const response = await $api.get(Endpoints.reports, {
			params: {
				entityTypeId: 1072,
				select: TASK_SELECT_FIELDS,
				filter: {
					assignedById: userId,
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
		console.error("Failed to fetch tasks for user:", userId, error);
		return [];
	}
};
