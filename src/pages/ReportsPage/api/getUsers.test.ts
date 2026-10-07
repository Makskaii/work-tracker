import { beforeEach, describe, expect, it, vi } from "vitest";
import { getUsers } from "./getUsers";

const requests = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@/shared/config", () => ({ $api: requests }));
beforeEach(() => vi.resetAllMocks());

describe("report employee reads", () => {
	it("reports CRM errors to callers using strict mode instead of returning an empty team", async () => {
		requests.get.mockResolvedValue({ data: { error: "ACCESS_DENIED", error_description: "Нет доступа к сотрудникам" } });
		await expect(getUsers(undefined, { throwOnError: true })).rejects.toThrow("Нет доступа к сотрудникам");
	});

	it("reports transport failures in strict mode and accepts a successful empty directory", async () => {
		requests.get.mockRejectedValueOnce(new Error("Network unavailable"));
		await expect(getUsers(undefined, { throwOnError: true })).rejects.toThrow("Network unavailable");
		requests.get.mockResolvedValueOnce({ data: { result: [] } });
		await expect(getUsers(undefined, { throwOnError: true })).resolves.toEqual([]);
	});

	it("ignores an aborted employee read without reporting a failure", async () => {
		const controller = new AbortController();
		controller.abort();
		requests.get.mockRejectedValueOnce(new Error("Cancelled"));
		await expect(getUsers(controller.signal, { throwOnError: true })).resolves.toEqual([]);
	});
});
