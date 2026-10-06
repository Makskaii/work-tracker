import {
	isAppUpdateBlocked,
	subscribeToAppUpdateBlockers,
} from "./blockers";

const RELOAD_ATTEMPT_KEY = "work-tracker:app-update:last-attempt";
const EDITABLE_SELECTOR =
	"input:not([type=hidden]):not([type=button]):not([type=submit]):not([type=reset]), textarea, select, [contenteditable=true]";

export interface AppUpdateMonitorOptions {
	buildId: string;
	versionUrl: string;
	window?: Window;
	document?: Document;
	fetch?: typeof fetch;
	reload?: () => void;
	pollIntervalMs?: number;
	idleMs?: number;
	requestTimeoutMs?: number;
	checkCooldownMs?: number;
}

function readBuildId(metadata: unknown): string | null {
	if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
		return null;
	}
	const buildId = (metadata as { buildId?: unknown }).buildId;
	return typeof buildId === "string" && /^[\w.:-]{1,160}$/.test(buildId)
		? buildId
		: null;
}

function editableTarget(target: EventTarget | null): Element | null {
	if (!(target instanceof Element)) return null;
	const element = target.closest(EDITABLE_SELECTOR);
	if (
		!element ||
		element.matches(":disabled, [readonly]") ||
		element.closest("[data-app-update-ignore-input]")
	) {
		return null;
	}
	return element;
}

/** Watches the current frame only. Failed checks and unfinished edits never reload it. */
export function startAppUpdateMonitor(
	options: AppUpdateMonitorOptions,
): () => void {
	const win = options.window ?? window;
	const doc = options.document ?? document;
	const fetchVersion = options.fetch ?? win.fetch.bind(win);
	const versionUrl = new URL(options.versionUrl, win.location.href);
	if (versionUrl.origin !== win.location.origin || !readBuildId(options)) {
		return () => undefined;
	}
	const idleMs = options.idleMs ?? 3_000;
	const cooldownMs = options.checkCooldownMs ?? 5_000;
	const dirtyInputs = new Set<Element>();
	let stopped = false;
	let reloading = false;
	let pendingBuildId: string | null = null;
	let lastInteraction = Date.now();
	let lastCheck = Number.NEGATIVE_INFINITY;
	let inFlight: AbortController | null = null;
	let reloadTimer: number | undefined;
	let requestTimer: number | undefined;

	const clearReloadTimer = () => {
		if (reloadTimer !== undefined) win.clearTimeout(reloadTimer);
		reloadTimer = undefined;
	};
	const forgetPendingUpdate = () => {
		pendingBuildId = null;
		clearReloadTimer();
	};
	const safeToReload = () => {
		for (const element of dirtyInputs) {
			if (!element.isConnected || !editableTarget(element)) {
				dirtyInputs.delete(element);
			}
		}
		return (
			doc.visibilityState === "visible" &&
			win.navigator.onLine !== false &&
			!inFlight &&
			!isAppUpdateBlocked() &&
			dirtyInputs.size === 0 &&
			!editableTarget(doc.activeElement) &&
			!doc.querySelector("dialog[open], [role=dialog], [role=alertdialog]") &&
			!doc.body.classList.contains("modal-open") &&
			!doc.querySelector('[aria-busy="true"], [data-app-update-blocked="true"]') &&
			!win.location.pathname.includes("/client-profile")
		);
	};
	const rememberReloadAttempt = (targetBuildId: string) => {
		try {
			if (win.sessionStorage.getItem(RELOAD_ATTEMPT_KEY) === targetBuildId) {
				return false;
			}
			win.sessionStorage.setItem(RELOAD_ATTEMPT_KEY, targetBuildId);
			return win.sessionStorage.getItem(RELOAD_ATTEMPT_KEY) === targetBuildId;
		} catch {
			// Without a persistent loop guard, wait for the next ordinary navigation.
			return false;
		}
	};
	const scheduleReload = () => {
		clearReloadTimer();
		if (stopped || reloading || !pendingBuildId) return;
		const idleRemaining = Math.max(0, idleMs - (Date.now() - lastInteraction));
		reloadTimer = win.setTimeout(() => {
			reloadTimer = undefined;
			if (stopped || reloading || !pendingBuildId) return;
			if (!safeToReload() || Date.now() - lastInteraction < idleMs) {
				reloadTimer = win.setTimeout(scheduleReload, Math.max(idleRemaining, 1_000));
				return;
			}
			if (!rememberReloadAttempt(pendingBuildId)) {
				forgetPendingUpdate();
				return;
			}
			reloading = true;
			(options.reload ?? (() => win.location.reload()))();
		}, idleRemaining);
	};

	const checkVersion = async () => {
		if (
			stopped ||
			reloading ||
			inFlight ||
			doc.visibilityState !== "visible" ||
			win.navigator.onLine === false ||
			Date.now() - lastCheck < cooldownMs
		) {
			return;
		}
		lastCheck = Date.now();
		const request = new AbortController();
		inFlight = request;
		requestTimer = win.setTimeout(
			() => request.abort(),
			options.requestTimeoutMs ?? 10_000,
		);
		try {
			const response = await fetchVersion(versionUrl.href, {
				cache: "no-store",
				credentials: "same-origin",
				redirect: "error",
				headers: { Accept: "application/json" },
				signal: request.signal,
			});
			if (!response.ok) throw new Error("Version check unavailable");
			const buildId = readBuildId(await response.json());
			if (stopped) return;
			if (request.signal.aborted) {
				forgetPendingUpdate();
				return;
			}
			if (!buildId || buildId === options.buildId) {
				forgetPendingUpdate();
				return;
			}
			pendingBuildId = buildId;
			scheduleReload();
		} catch {
			if (!stopped) forgetPendingUpdate();
		} finally {
			if (requestTimer !== undefined) win.clearTimeout(requestTimer);
			requestTimer = undefined;
			if (inFlight === request) inFlight = null;
		}
	};
	const onInteraction = () => {
		lastInteraction = Date.now();
		scheduleReload();
	};
	const onInput = (event: Event) => {
		const element = editableTarget(event.target);
		if (element && !element.closest("[data-app-update-managed=true]")) {
			dirtyInputs.add(element);
		}
		onInteraction();
	};
	const onReset = (event: Event) => {
		const form = event.target;
		if (!(form instanceof HTMLFormElement)) return;
		win.queueMicrotask(() => {
			if (stopped || event.defaultPrevented) return;
			for (const element of dirtyInputs) {
				if (form.contains(element)) dirtyInputs.delete(element);
			}
			onInteraction();
		});
	};
	const onReturn = () => {
		onInteraction();
		void checkVersion();
	};
	const onOffline = () => forgetPendingUpdate();
	const onVisibility = () => {
		if (doc.visibilityState === "visible") onReturn();
		else clearReloadTimer();
	};
	const onOnline = () => {
		lastCheck = Number.NEGATIVE_INFINITY;
		onReturn();
	};

	try {
		if (win.sessionStorage.getItem(RELOAD_ATTEMPT_KEY) === options.buildId) {
			win.sessionStorage.removeItem(RELOAD_ATTEMPT_KEY);
		}
	} catch {
		// Version detection still works when browser storage is restricted.
	}
	const unsubscribe = subscribeToAppUpdateBlockers(onInteraction);
	doc.addEventListener("pointerdown", onInteraction, true);
	doc.addEventListener("keydown", onInteraction, true);
	doc.addEventListener("scroll", onInteraction, true);
	doc.addEventListener("focusin", onInteraction, true);
	doc.addEventListener("input", onInput, true);
	doc.addEventListener("change", onInput, true);
	doc.addEventListener("reset", onReset, true);
	doc.addEventListener("visibilitychange", onVisibility);
	win.addEventListener("focus", onReturn);
	win.addEventListener("online", onOnline);
	win.addEventListener("offline", onOffline);
	const pollTimer = win.setInterval(
		() => void checkVersion(),
		options.pollIntervalMs ?? 60_000,
	);
	void checkVersion();

	return () => {
		stopped = true;
		inFlight?.abort();
		if (requestTimer !== undefined) win.clearTimeout(requestTimer);
		win.clearInterval(pollTimer);
		clearReloadTimer();
		unsubscribe();
		dirtyInputs.clear();
		doc.removeEventListener("pointerdown", onInteraction, true);
		doc.removeEventListener("keydown", onInteraction, true);
		doc.removeEventListener("scroll", onInteraction, true);
		doc.removeEventListener("focusin", onInteraction, true);
		doc.removeEventListener("input", onInput, true);
		doc.removeEventListener("change", onInput, true);
		doc.removeEventListener("reset", onReset, true);
		doc.removeEventListener("visibilitychange", onVisibility);
		win.removeEventListener("focus", onReturn);
		win.removeEventListener("online", onOnline);
		win.removeEventListener("offline", onOffline);
	};
}
