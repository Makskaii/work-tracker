import { $api } from "../axios/axios.config";
import type { WorkTrackerBitrix } from "./bitrixContext";

export const createStandaloneBitrix = (): WorkTrackerBitrix => ({
	actions: {
		v2: {
			call: {
				make: async <T = unknown>({ method, params, requestId }: { method: string; params?: TypeCallParams; requestId?: string }) => {
					const { data, status } = await $api.post<Payload<T>>(method, params ?? {});
					return new AjaxResult<T>({ answer: data, query: { method, params: params ?? {}, requestId: requestId ?? "" }, status });
				},
			},
		},
	},
});
import { AjaxResult, type Payload, type TypeCallParams } from "@bitrix24/b24jssdk";
