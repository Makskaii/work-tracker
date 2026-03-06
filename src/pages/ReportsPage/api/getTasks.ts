import { $api } from "@/shared/config";
import {
	Endpoints,
	EntityTypeIds,
	TASK_SELECT_FIELDS,
} from "@/shared/constants/const";
import type { AnyObject } from "../../../shared/types/types";
import type { TaskProps } from "../ui/ProgressReports/types";

export const getTasks = async (filters: AnyObject): Promise<TaskProps[]> => {
	try {
		const response = await $api.get(Endpoints.crmItems, {
			params: {
				entityTypeId: EntityTypeIds.tasks,
				select: TASK_SELECT_FIELDS,
				filter: {
					...filters,
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
		console.error(
			"Failed to fetch tasks for user:",
			filters.filter.assignedById,
			error,
		);
		return [];
	}
};
