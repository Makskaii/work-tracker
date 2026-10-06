import { render } from "@testing-library/react";
import { StrictMode } from "react";
import { describe, expect, it } from "vitest";
import {
	acquireAppUpdateBlocker,
	isAppUpdateBlocked,
	useAppUpdateBlocker,
} from "./blockers";

function Editor({ blocked }: { blocked: boolean }) {
	useAppUpdateBlocker(blocked);
	return <div>Editor</div>;
}

describe("application update blockers", () => {
	it("keeps independent operations blocked until each has finished", () => {
		const releaseOne = acquireAppUpdateBlocker();
		const releaseTwo = acquireAppUpdateBlocker();
		expect(isAppUpdateBlocked()).toBe(true);
		releaseOne();
		releaseOne();
		expect(isAppUpdateBlocked()).toBe(true);
		releaseTwo();
		expect(isAppUpdateBlocked()).toBe(false);
	});

	it("handles StrictMode cleanup and changes to an editor's dirty state", () => {
		const view = render(<StrictMode><Editor blocked /></StrictMode>);
		expect(isAppUpdateBlocked()).toBe(true);
		view.rerender(<StrictMode><Editor blocked={false} /></StrictMode>);
		expect(isAppUpdateBlocked()).toBe(false);
		view.rerender(<StrictMode><Editor blocked /></StrictMode>);
		expect(isAppUpdateBlocked()).toBe(true);
		view.unmount();
		expect(isAppUpdateBlocked()).toBe(false);
	});
});
