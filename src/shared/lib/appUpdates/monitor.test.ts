import { fireEvent } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { acquireAppUpdateBlocker } from "./blockers";
import { startAppUpdateMonitor } from "./monitor";

function metadata(buildId: string): Response {
	return { ok: true, json: () => Promise.resolve({ buildId }) } as Response;
}

describe("automatic application updates", () => {
	const cleanups: (() => void)[] = [];
	const fetchVersion = vi.fn<typeof fetch>();
	const reload = vi.fn();
	let initialUrl: string;

	function start(
		extra: Partial<Parameters<typeof startAppUpdateMonitor>[0]> = {},
	) {
		const stop = startAppUpdateMonitor({
			buildId: "build-one",
			versionUrl: "/version.json",
			fetch: fetchVersion,
			reload,
			checkCooldownMs: 0,
			...extra,
		});
		cleanups.push(stop);
		return stop;
	}

	beforeEach(() => {
		vi.useFakeTimers();
		fetchVersion.mockReset().mockResolvedValue(metadata("build-two"));
		reload.mockReset();
		window.sessionStorage.clear();
		initialUrl = window.location.href;
		Object.defineProperty(document, "visibilityState", {
			configurable: true,
			value: "visible",
		});
		Object.defineProperty(window.navigator, "onLine", {
			configurable: true,
			value: true,
		});
	});

	afterEach(() => {
		for (const stop of cleanups.splice(0)) stop();
		document.body.replaceChildren();
		document.body.classList.remove("modal-open");
		window.history.replaceState(null, "", initialUrl);
		vi.restoreAllMocks();
		vi.useRealTimers();
	});

	it("checks same-origin metadata without cache and reloads only after idle grace", async () => {
		start();
		await vi.advanceTimersByTimeAsync(2_999);
		expect(reload).not.toHaveBeenCalled();
		await vi.advanceTimersByTimeAsync(1);
		expect(reload).toHaveBeenCalledTimes(1);
		expect(fetchVersion).toHaveBeenCalledWith(
			new URL("/version.json", window.location.href).href,
			expect.objectContaining({
				cache: "no-store",
				credentials: "same-origin",
				redirect: "error",
				signal: expect.any(AbortSignal),
			}),
		);
	});

	it("ignores the current build and discovers a later release by polling", async () => {
		fetchVersion.mockResolvedValueOnce(metadata("build-one"));
		start();
		await vi.advanceTimersByTimeAsync(59_999);
		expect(reload).not.toHaveBeenCalled();
		await vi.advanceTimersByTimeAsync(1);
		expect(fetchVersion).toHaveBeenCalledTimes(2);
		await vi.advanceTimersByTimeAsync(1);
		expect(reload).toHaveBeenCalledTimes(1);
	});

	it.each([
		["HTTP failure", () => Promise.resolve({ ok: false } as Response)],
		["network failure", () => Promise.reject(new Error("offline"))],
		["HTML instead of JSON", () => Promise.resolve({ ok: true, json: () => Promise.reject(new SyntaxError("HTML")) } as Response)],
		["invalid metadata", () => Promise.resolve({ ok: true, json: () => Promise.resolve({ buildId: "" }) } as Response)],
	])("keeps the current view on %s", async (_name, result) => {
		fetchVersion.mockImplementation(result);
		start();
		await vi.advanceTimersByTimeAsync(65_000);
		expect(reload).not.toHaveBeenCalled();
	});

	it("defers while a component is dirty or saving, with fresh grace after release", async () => {
		const release = acquireAppUpdateBlocker();
		cleanups.push(release);
		start();
		await vi.advanceTimersByTimeAsync(20_000);
		expect(reload).not.toHaveBeenCalled();
		release();
		await vi.advanceTimersByTimeAsync(2_999);
		expect(reload).not.toHaveBeenCalled();
		await vi.advanceTimersByTimeAsync(1);
		expect(reload).toHaveBeenCalledTimes(1);
	});

	it("does not reload an open dialog or a focused input", async () => {
		const dialog = document.createElement("dialog");
		dialog.setAttribute("open", "");
		const input = document.createElement("input");
		dialog.append(input);
		document.body.append(dialog);
		start();
		await vi.advanceTimersByTimeAsync(5_000);
		expect(reload).not.toHaveBeenCalled();
		dialog.removeAttribute("open");
		input.focus();
		await vi.advanceTimersByTimeAsync(5_000);
		expect(reload).not.toHaveBeenCalled();
		input.blur();
		await vi.advanceTimersByTimeAsync(2_000);
		expect(reload).toHaveBeenCalledTimes(1);
	});

	it("protects blurred edits without persisting their values and permits navigation away", async () => {
		const input = document.createElement("input");
		input.type = "password";
		document.body.append(input);
		start();
		fireEvent.input(input, { target: { value: "private-form-value" } });
		input.blur();
		await vi.advanceTimersByTimeAsync(10_000);
		expect(reload).not.toHaveBeenCalled();
		expect(JSON.stringify(window.sessionStorage)).not.toContain("private-form-value");
		expect(window.sessionStorage.length).toBe(0);
		input.remove();
		await vi.advanceTimersByTimeAsync(2_000);
		expect(reload).toHaveBeenCalledTimes(1);
	});

	it("clears conservative dirty tracking after a form reset", async () => {
		const form = document.createElement("form");
		const input = document.createElement("textarea");
		form.append(input);
		document.body.append(form);
		start();
		fireEvent.input(input, { target: { value: "draft" } });
		await vi.advanceTimersByTimeAsync(5_000);
		expect(reload).not.toHaveBeenCalled();
		fireEvent.reset(form);
		await vi.advanceTimersByTimeAsync(3_000);
		expect(reload).toHaveBeenCalledTimes(1);
	});

	it("lets explicitly managed editors own their saved and dirty states", async () => {
		const editor = document.createElement("div");
		editor.dataset.appUpdateManaged = "true";
		const input = document.createElement("input");
		editor.append(input);
		document.body.append(editor);
		const release = acquireAppUpdateBlocker();
		cleanups.push(release);
		start();
		fireEvent.input(input, { target: { value: "draft" } });
		await vi.advanceTimersByTimeAsync(5_000);
		expect(reload).not.toHaveBeenCalled();
		release();
		await vi.advanceTimersByTimeAsync(3_000);
		expect(reload).toHaveBeenCalledTimes(1);
	});

	it("defers while busy, and restarts idle grace when the user interacts", async () => {
		const busy = document.createElement("div");
		busy.setAttribute("aria-busy", "true");
		document.body.append(busy);
		start();
		await vi.advanceTimersByTimeAsync(5_000);
		expect(reload).not.toHaveBeenCalled();
		busy.remove();
		fireEvent.pointerDown(document.body);
		await vi.advanceTimersByTimeAsync(2_999);
		expect(reload).not.toHaveBeenCalled();
		await vi.advanceTimersByTimeAsync(1);
		expect(reload).toHaveBeenCalledTimes(1);
	});

	it("avoids hidden and offline reloads, then checks again on return", async () => {
		Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
		start();
		await vi.advanceTimersByTimeAsync(60_000);
		expect(fetchVersion).not.toHaveBeenCalled();
		Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
		fireEvent(document, new Event("visibilitychange"));
		await vi.advanceTimersByTimeAsync(1_000);
		Object.defineProperty(window.navigator, "onLine", { configurable: true, value: false });
		fireEvent(window, new Event("offline"));
		await vi.advanceTimersByTimeAsync(5_000);
		expect(reload).not.toHaveBeenCalled();
		Object.defineProperty(window.navigator, "onLine", { configurable: true, value: true });
		fireEvent(window, new Event("online"));
		await vi.advanceTimersByTimeAsync(3_000);
		expect(reload).toHaveBeenCalledTimes(1);
	});

	it("allows only one in-flight check and aborts it during cleanup", async () => {
		fetchVersion.mockImplementation(() => new Promise(() => undefined));
		const stop = start();
		fireEvent(window, new Event("focus"));
		fireEvent(document, new Event("visibilitychange"));
		await vi.advanceTimersByTimeAsync(5_000);
		expect(fetchVersion).toHaveBeenCalledTimes(1);
		const signal = fetchVersion.mock.calls[0][1]?.signal;
		expect(signal?.aborted).toBe(false);
		stop();
		expect(signal?.aborted).toBe(true);
		expect(vi.getTimerCount()).toBe(0);
	});

	it("aborts a hung check without reloading", async () => {
		fetchVersion.mockImplementation((_url, init) => new Promise((_resolve, reject) => {
			init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
		}));
		start({ buildId: "build-one", versionUrl: "/version.json", requestTimeoutMs: 100 });
		await vi.advanceTimersByTimeAsync(5_000);
		expect(fetchVersion.mock.calls[0][1]?.signal?.aborted).toBe(true);
		expect(reload).not.toHaveBeenCalled();
	});

	it("prevents reload loops when old HTML continues serving the old bundle", async () => {
		const stop = start();
		await vi.advanceTimersByTimeAsync(3_000);
		expect(reload).toHaveBeenCalledTimes(1);
		stop();
		reload.mockClear();
		start();
		await vi.advanceTimersByTimeAsync(65_000);
		expect(reload).not.toHaveBeenCalled();
		fetchVersion.mockResolvedValue(metadata("build-three"));
		await vi.advanceTimersByTimeAsync(55_000);
		await vi.advanceTimersByTimeAsync(1);
		expect(reload).toHaveBeenCalledTimes(1);
	});

	it("does not reload if the loop guard cannot be persisted", async () => {
		vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
			throw new DOMException("storage denied", "SecurityError");
		});
		start();
		await vi.advanceTimersByTimeAsync(5_000);
		expect(reload).not.toHaveBeenCalled();
	});

	it("does not auto-refresh the separate client login and gated profile", async () => {
		window.history.replaceState(null, "", "/devapps/work-tracker/client-profile/123");
		start();
		await vi.advanceTimersByTimeAsync(65_000);
		expect(reload).not.toHaveBeenCalled();
	});

	it("refuses external metadata URLs", async () => {
		start({ buildId: "build-one", versionUrl: "https://outside.example/version.json" });
		await vi.advanceTimersByTimeAsync(5_000);
		expect(fetchVersion).not.toHaveBeenCalled();
		expect(reload).not.toHaveBeenCalled();
	});
});
