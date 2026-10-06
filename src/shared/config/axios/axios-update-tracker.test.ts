import axios, { CanceledError, type AxiosAdapter } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { trackAppUpdateRequests } from "./axios-update-tracker";

const blockers = vi.hoisted(() => ({ acquire: vi.fn(), release: vi.fn() }));
vi.mock("@/shared/lib/appUpdates", () => ({
	acquireAppUpdateBlocker: blockers.acquire,
}));

beforeEach(() => {
	blockers.acquire.mockReset().mockReturnValue(blockers.release);
	blockers.release.mockReset();
});

const successfulAdapter: AxiosAdapter = (config) => Promise.resolve({
	data: { ok: true },
	status: 200,
	statusText: "OK",
	headers: {},
	config,
});

describe("automatic update request guard", () => {
	it("blocks until a request completes and preserves its response", async () => {
		let complete: (() => void) | undefined;
		const started = new Promise<void>((resolve) => {
			complete = resolve;
		});
		const client = axios.create({ adapter: (config) => started.then(() => successfulAdapter(config)) });
		trackAppUpdateRequests(client);
		const request = client.patch("project/7", { title: "Changed" });
		await vi.waitFor(() => expect(blockers.acquire).toHaveBeenCalledTimes(1));
		expect(blockers.release).not.toHaveBeenCalled();
		complete?.();
		expect((await request).data).toEqual({ ok: true });
		expect(blockers.release).toHaveBeenCalledTimes(1);
	});

	it.each(["failure", "sync failure", "cancellation"])("releases the guard after %s", async (outcome) => {
		const failure = outcome === "cancellation" ? new CanceledError("Cancelled") : new Error("Request failed");
		const adapter: AxiosAdapter = () => {
			if (outcome === "sync failure") throw failure;
			return Promise.reject(failure);
		};
		const client = axios.create({ adapter });
		trackAppUpdateRequests(client);
		await expect(client.post("save", {})).rejects.toBe(failure);
		expect(blockers.acquire).toHaveBeenCalledTimes(1);
		expect(blockers.release).toHaveBeenCalledTimes(1);
	});

	it("preserves a per-request adapter selected by a later interceptor", async () => {
		const original = vi.fn(successfulAdapter);
		const cached = vi.fn(successfulAdapter);
		const client = axios.create({ adapter: original });
		trackAppUpdateRequests(client);
		client.interceptors.request.use((config) => {
			config.adapter = cached;
			return config;
		});
		await client.get("crm.item.list");
		expect(cached).toHaveBeenCalledTimes(1);
		expect(original).not.toHaveBeenCalled();
		expect(blockers.acquire).toHaveBeenCalledTimes(1);
		expect(blockers.release).toHaveBeenCalledTimes(1);
	});

	it("tracks concurrent requests independently", async () => {
		const client = axios.create({ adapter: successfulAdapter });
		trackAppUpdateRequests(client);
		await Promise.all([client.get("first"), client.delete("second")]);
		expect(blockers.acquire).toHaveBeenCalledTimes(2);
		expect(blockers.release).toHaveBeenCalledTimes(2);
	});

	it("does not acquire a guard for requests rejected before transport", async () => {
		const client = axios.create({ adapter: successfulAdapter });
		trackAppUpdateRequests(client);
		const controller = new AbortController();
		controller.abort();
		await expect(client.get("save", { signal: controller.signal })).rejects.toBeInstanceOf(CanceledError);
		expect(blockers.acquire).not.toHaveBeenCalled();
		expect(blockers.release).not.toHaveBeenCalled();
	});
});
