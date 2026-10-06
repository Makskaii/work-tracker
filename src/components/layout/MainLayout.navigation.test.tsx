import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useB24 } from "@/shared/config/bitrixProvider/bitrixContext";
import { getAppNavigationKey } from "@/shared/lib/appNavigation";
import { MainLayout } from "./MainLayout";

const mocks = vi.hoisted(() => ({
	userId: 30,
	rules: [] as Array<{ action: string; subject: string }>,
}));
vi.mock("@bitrix24/b24jssdk", () => ({
	initializeB24Frame: async () => ({
		auth: { isAdmin: false },
		actions: { v2: { call: { make: async () => ({ getData: () => ({ result: { ID: String(mocks.userId), UF_DEPARTMENT: [23] } }) }) } } },
	}),
	LoggerFactory: { createForBrowser: () => ({ error: vi.fn() }) },
}));
vi.mock("@/shared/api/getDepartments", () => ({
	getWorkTrackerDepartmentAccess: async () => ({ heads: [], reportDepartmentIds: [23] }),
}));
vi.mock("@/shared/config/ability/casl", () => ({
	ability: {
		update: (rules: Array<{ action: string; subject: string }>) => { mocks.rules = rules; },
		can: (action: string, subject: string) => mocks.rules.some((rule) => rule.action === action && rule.subject === subject),
	},
}));
vi.mock("./AppHeader", () => ({ AppHeader: () => null }));
vi.mock("../spinner/Spinner", () => ({ Spinner: () => <p>Подключение</p> }));

const originalTop = Object.getOwnPropertyDescriptor(window, "top");
const CurrentScreen = () => {
	const location = useLocation();
	const { currentUserId } = useB24();
	return <output data-testid="screen">{currentUserId}:{location.pathname}{location.search}{location.hash}</output>;
};
const open = (path: string) => render(
	<MemoryRouter initialEntries={[path]}>
		<Routes><Route path="/*" element={<MainLayout />}><Route path="*" element={<CurrentScreen />} /></Route></Routes>
	</MemoryRouter>,
);

describe("Bitrix frame navigation after reopening", () => {
	beforeEach(() => {
		sessionStorage.clear(); mocks.userId = 30; mocks.rules = [];
		Object.defineProperty(window, "top", { configurable: true, value: {} });
	});
	afterEach(() => {
		cleanup(); vi.restoreAllMocks();
		if (originalTop) Object.defineProperty(window, "top", originalTop);
	});

	it("restores the previous section after permissions resolve and keeps current frame auth in the URL only", async () => {
		const key = getAppNavigationKey(30);
		sessionStorage.setItem(key, JSON.stringify({ pathname: "/reports/profitability" }));
		open("/?DOMAIN=crm.example&AUTH_ID=current-session#frame");
		await waitFor(() => expect(screen.getByTestId("screen")).toHaveTextContent("30:/reports/profitability?DOMAIN=crm.example&AUTH_ID=current-session#frame"));
		expect(sessionStorage.getItem(key)).toBe(JSON.stringify({ pathname: "/reports/profitability" }));
	});

	it("keeps an explicit deep link instead of replacing it with the previous section", async () => {
		sessionStorage.setItem(getAppNavigationKey(30), JSON.stringify({ pathname: "/reports/profitability" }));
		open("/development-kanban");
		expect(await screen.findByTestId("screen")).toHaveTextContent("30:/development-kanban");
	});

	it("does not restore a previously saved section that this user cannot access", async () => {
		sessionStorage.setItem(getAppNavigationKey(30), JSON.stringify({ pathname: "/create-client-form" }));
		open("/reports/calendar");
		expect(await screen.findByTestId("screen")).toHaveTextContent("30:/reports/calendar");
	});

	it("does not carry another user's section into the current session", async () => {
		sessionStorage.setItem(getAppNavigationKey(30), JSON.stringify({ pathname: "/reports/profitability" }));
		mocks.userId = 31;
		open("/reports/calendar");
		expect(await screen.findByTestId("screen")).toHaveTextContent("31:/reports/calendar");
	});

	it("preserves permission initialization when the iframe cannot use session storage", async () => {
		vi.spyOn(window, "sessionStorage", "get").mockImplementation(() => { throw new DOMException("blocked", "SecurityError"); });
		open("/reports/profitability");
		expect(await screen.findByTestId("screen")).toHaveTextContent("30:/reports/profitability");
		expect(mocks.rules).toContainEqual({ action: "read", subject: "post" });
	});
});
