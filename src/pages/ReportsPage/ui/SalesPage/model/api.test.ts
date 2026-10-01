import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchAllCrmItems } from "./api";

const crm = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@/shared/config", () => ({ $api: crm }));
vi.mock("@/shared/config/axios/axios.config", () => ({ $backendApi: {} }));

beforeEach(() => vi.resetAllMocks());

const fetchItems = () =>
	fetchAllCrmItems({
		entityTypeId: 1060,
		select: ["id"],
		filter: { projectId: "77" },
	});

describe("project CRM pages", () => {
	it("accepts an explicitly empty result", async () => {
		crm.get.mockResolvedValue({ data: { result: { items: [] } } });
		await expect(fetchItems()).resolves.toEqual([]);
	});

	it("rejects a malformed response instead of implying the project has no work", async () => {
		crm.get.mockResolvedValue({ data: { result: {} } });
		await expect(fetchItems()).rejects.toThrow("Битрикс24");
	});

	it("rejects a nonadvancing cursor rather than repeating the same page indefinitely", async () => {
		crm.get.mockResolvedValue({
			data: { result: { items: [{ id: 1 }] }, next: 0 },
		});
		await expect(fetchItems()).rejects.toThrow("страницу");
		expect(crm.get).toHaveBeenCalledTimes(1);
	});
});
