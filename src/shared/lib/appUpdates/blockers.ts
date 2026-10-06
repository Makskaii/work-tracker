import { useLayoutEffect } from "react";

const blockers = new Set<symbol>();
const listeners = new Set<() => void>();

export function isAppUpdateBlocked(): boolean {
	return blockers.size > 0;
}

export function subscribeToAppUpdateBlockers(listener: () => void): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

/** Acquire before starting an asynchronous save, and release in finally. */
export function acquireAppUpdateBlocker(): () => void {
	const token = Symbol("app-update-blocker");
	blockers.add(token);
	for (const listener of listeners) listener();
	return () => {
		if (!blockers.delete(token)) return;
		for (const listener of listeners) listener();
	};
}

/** Keep an open editor or an unsaved draft safe across application releases. */
export function useAppUpdateBlocker(blocked: boolean): void {
	useLayoutEffect(() => {
		if (blocked) return acquireAppUpdateBlocker();
	}, [blocked]);
}
