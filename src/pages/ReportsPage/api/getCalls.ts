import dayjs from "dayjs";
import { $api } from "@/shared/config";

export const getCalls = async (start: string, end: string): Promise<number> => {
	try {
		const response = await $api.get("voximplant.statistic.get", {
			params: {
				filter: {
					">=CALL_START_DATE": start,
					"<=CALL_START_DATE": dayjs(end).add(1, "day").format("YYYY-MM-DD"),
					"!PORTAL_USER_ID": 11,
				},
			},
		});

		const total = response.data.total ?? 0;

		return total;
	} catch (error) {
		console.error("Failed to fetch calls", error);
		return 0;
	}
};
