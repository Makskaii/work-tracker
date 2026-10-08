import { cleanup, render, screen } from "@testing-library/react";
import { RouterProvider } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/layout/MainLayout", () => ({ MainLayout: () => <p>Employee login handler</p> }));
afterEach(() => { cleanup(); vi.unstubAllEnvs(); vi.resetModules(); });

describe("registered employee OAuth handler routing", () => {
	it.each(["/devapps/work-tracker", "/devapps/work-tracker/"])("renders the application at %s", async (path) => {
		vi.stubEnv("BASE_URL", "/devapps/work-tracker/");
		window.history.replaceState({}, "", path);
		const { router } = await import("./router.config");
		try {
			render(<RouterProvider router={router} />);
			expect(await screen.findByText("Employee login handler")).toBeInTheDocument();
		} finally { router.dispose(); }
	});
});
