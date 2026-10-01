import type { InternalAxiosRequestConfig } from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const transport = vi.hoisted(() => vi.fn());
vi.mock("axios", async (importOriginal) => {
	const original = await importOriginal<typeof import("axios")>();
	return {
		...original,
		default: { ...original.default, getAdapter: () => transport },
	};
});

const response = (data: unknown) => ({
	data,
	status: 200,
	statusText: "OK",
	headers: {},
	config: {} as InternalAxiosRequestConfig,
});
beforeEach(() => {
	vi.resetModules();
	transport.mockReset();
});
afterEach(() => {
	vi.restoreAllMocks();
});

describe("Bitrix read cache", () => {
	it("retries an HTTP 200 CRM error and then caches the successful response", async () => {
		const { $api } = await import("./axios.config");
		transport
			.mockResolvedValueOnce(response({ error: "QUERY_LIMIT_EXCEEDED" }))
			.mockResolvedValueOnce(response({ result: { items: [{ id: 65 }] } }));
		const params = { entityTypeId: 1060, filter: { project: 77 } };
		await $api.get("crm.item.list", { params });
		const retry = await $api.get("crm.item.list", { params });
		const cached = await $api.get("crm.item.list", { params });
		expect(retry.data.result.items).toEqual([{ id: 65 }]);
		expect(cached.data).toEqual(retry.data);
		expect(transport).toHaveBeenCalledTimes(2);
	});
	it("does not freeze malformed list responses for five minutes", async () => {
		const { $api } = await import("./axios.config");
		transport
			.mockResolvedValueOnce(response({ result: {} }))
			.mockResolvedValueOnce(response({ result: { items: [] } }));
		await $api.get("crm.item.list");
		const retry = await $api.get("crm.item.list");
		expect(retry.data.result.items).toEqual([]);
		expect(transport).toHaveBeenCalledTimes(2);
	});
	it("retries a list page whose next cursor did not advance", async () => {
		const { $api } = await import("./axios.config");
		transport
			.mockResolvedValueOnce(
				response({ result: { items: [{ id: 1 }] }, next: 0 }),
			)
			.mockResolvedValueOnce(
				response({ result: { items: [{ id: 2 }] }, next: null }),
			);
		await $api.get("crm.item.list", { params: { start: 0 } });
		const retry = await $api.get("crm.item.list", { params: { start: 0 } });
		expect(retry.data.result.items).toEqual([{ id: 2 }]);
		expect(transport).toHaveBeenCalledTimes(2);
	});
});
