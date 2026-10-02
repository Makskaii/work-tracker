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
const rawResponse = (data: unknown) => response(JSON.stringify(data));
beforeEach(() => {
	vi.resetModules();
	transport.mockReset();
});
afterEach(() => {
	vi.restoreAllMocks();
});

describe("Bitrix read cache", () => {
	it("fetches current data after an explicit refresh instead of returning a five-minute-old board", async () => {
		const { $api, clearBitrixReadCache } = await import("./axios.config");
		transport.mockImplementation(async (config) => ({
			...rawResponse({
				result: { items: [{ id: transport.mock.calls.length }] },
			}),
			config,
		}));
		const initial = await $api.get("crm.item.list");
		expect((await $api.get("crm.item.list")).data).toEqual(initial.data);
		clearBitrixReadCache(["crm.item.list"]);
		const refreshed = await $api.get("crm.item.list");
		expect(refreshed.data.result.items).toEqual([{ id: 2 }]);
		expect(transport).toHaveBeenCalledTimes(2);
	});
	it("caches raw JSON returned by the browser adapter and preserves Axios response parsing", async () => {
		const { $api } = await import("./axios.config");
		transport.mockResolvedValue(
			rawResponse({ result: { items: [{ id: 65 }] } }),
		);
		const params = { entityTypeId: 1060, filter: { project: 77 } };

		const initial = await $api.get("crm.item.list", { params });
		const cached = await $api.get("crm.item.list", { params });

		expect(initial.data.result.items).toEqual([{ id: 65 }]);
		expect(cached.data).toEqual(initial.data);
		expect(transport).toHaveBeenCalledTimes(1);
	});
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
	it.each([
		{ error: "QUERY_LIMIT_EXCEEDED" },
		{ result: {} },
		{ result: { items: [{ id: 1 }] }, next: 0 },
		{ result: { items: [{ id: 1 }] }, next: "50" },
	])("does not cache invalid raw JSON responses: %j", async (invalidBody) => {
		const { $api } = await import("./axios.config");
		transport
			.mockResolvedValueOnce(rawResponse(invalidBody))
			.mockResolvedValueOnce(rawResponse({ result: { items: [{ id: 2 }] } }));

		await $api.get("crm.item.list", { params: { start: 0 } });
		const retry = await $api.get("crm.item.list", { params: { start: 0 } });
		const cached = await $api.get("crm.item.list", { params: { start: 0 } });

		expect(retry.data.result.items).toEqual([{ id: 2 }]);
		expect(cached.data).toEqual(retry.data);
		expect(transport).toHaveBeenCalledTimes(2);
	});
	it("retries invalid JSON rather than retaining it in the cache", async () => {
		const { $api } = await import("./axios.config");
		transport
			.mockResolvedValueOnce(response("{ invalid JSON"))
			.mockResolvedValueOnce(rawResponse({ result: { items: [] } }));

		await $api.get("crm.item.list");
		const retry = await $api.get("crm.item.list");

		expect(retry.data.result.items).toEqual([]);
		expect(transport).toHaveBeenCalledTimes(2);
	});
});
