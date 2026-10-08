import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useB24 } from "@/shared/config/bitrixProvider/bitrixContext";
import { getAppNavigationKey } from "@/shared/lib/appNavigation";
import { MainLayout } from "./MainLayout";

const mocks = vi.hoisted(() => ({
	userId: 30,
	departmentIds: [23] as number[],
	isAdmin: false,
	rules: [] as Array<{ action: string; subject: string }>,
}));
vi.mock("@bitrix24/b24jssdk", () => ({
	initializeB24Frame: async () => ({
		auth: { isAdmin: mocks.isAdmin },
		actions: { v2: { call: { make: async () => ({ getData: () => ({ result: { ID: String(mocks.userId), UF_DEPARTMENT: mocks.departmentIds } }) }) } } },
	}),
	LoggerFactory: { createForBrowser: () => ({ error: vi.fn() }) },
}));
vi.mock("@/shared/api/getDepartments", () => ({
	getWorkTrackerDepartmentAccess: async () => ({ heads: [], reportDepartmentIds: [23, 25], salesDepartmentIds: [19] }),
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
		sessionStorage.clear(); mocks.userId = 30; mocks.departmentIds = [23]; mocks.isAdmin = false; mocks.rules = [];
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

	it("restores the sales report using its narrow permission and keeps current frame authentication", async () => {
		mocks.departmentIds = [19];
		sessionStorage.setItem(getAppNavigationKey(30), JSON.stringify({ pathname: "/reports/sales" }));
		open("/?AUTH_ID=current-session#frame");
		await waitFor(() => expect(screen.getByTestId("screen")).toHaveTextContent("30:/reports/sales?AUTH_ID=current-session#frame"));
		expect(mocks.rules).toContainEqual({ action: "read", subject: "sales-report" });
		expect(mocks.rules).not.toContainEqual({ action: "read", subject: "post" });
	});

	it("ignores a saved profitability section for sales-only users and opens their sales report", async () => {
		mocks.departmentIds = [19];
		sessionStorage.setItem(getAppNavigationKey(30), JSON.stringify({ pathname: "/reports/profitability" }));
		open("/reports");
		await waitFor(() => expect(screen.getByTestId("screen")).toHaveTextContent("30:/reports/sales"));
	});

	it.each(["/reports/calendar", "/reports/calendar/", "/REPORTS/CALENDAR", "/Reports/Calendar///", "/REPORTS/"])("opens the sales report for a new sales-only user at the denied landing %s", async (path) => {
		mocks.departmentIds = [19];
		open(`${path}?AUTH_ID=current-session#frame`);
		await waitFor(() => expect(screen.getByTestId("screen")).toHaveTextContent("30:/reports/sales?AUTH_ID=current-session#frame"));
		expect(mocks.rules).toEqual([
			{ action: "read", subject: "sales-report" },
			{ action: "create-client", subject: "client" },
		]);
		expect(sessionStorage.getItem(getAppNavigationKey(30))).toBe(JSON.stringify({ pathname: "/reports/sales" }));
	});

	it("falls back to sales from the default calendar when the saved section is no longer allowed", async () => {
		mocks.departmentIds = [19];
		sessionStorage.setItem(getAppNavigationKey(30), JSON.stringify({ pathname: "/reports/profitability" }));
		open("/Reports/Calendar/");
		await waitFor(() => expect(screen.getByTestId("screen")).toHaveTextContent("30:/reports/sales"));
	});

	it("still restores a permitted saved client-account section from the calendar landing", async () => {
		mocks.departmentIds = [19];
		sessionStorage.setItem(getAppNavigationKey(30), JSON.stringify({ pathname: "/create-client-form" }));
		open("/REPORTS/CALENDAR/");
		await waitFor(() => expect(screen.getByTestId("screen")).toHaveTextContent("30:/create-client-form"));
	});

	it.each(["/reports/sales", "/Reports/Sales/", "/create-client-form", "/CREATE-CLIENT-FORM/"])("keeps the sales employee's allowed explicit page %s", async (path) => {
		mocks.departmentIds = [19];
		sessionStorage.setItem(getAppNavigationKey(30), JSON.stringify({ pathname: "/reports/sales" }));
		open(path);
		expect(await screen.findByTestId("screen")).toHaveTextContent(`30:${path}`);
	});

	it("keeps a sales-only user's unrelated explicit report denied", async () => {
		mocks.departmentIds = [19];
		open("/reports/profitability");
		expect(await screen.findByText("У вас нет прав на просмотр этой страницы")).toBeInTheDocument();
		expect(screen.queryByTestId("screen")).not.toBeInTheDocument();
		expect(mocks.rules).not.toContainEqual({ action: "read", subject: "post" });
	});

	it.each([
		{ departments: [23], admin: false },
		{ departments: [25], admin: false },
		{ departments: [19, 23], admin: false },
		{ departments: [], admin: true },
	])("keeps the permitted explicit calendar for the existing broad role %j", async ({ departments, admin }) => {
		mocks.departmentIds = departments;
		mocks.isAdmin = admin;
		open("/Reports/Calendar/");
		expect(await screen.findByTestId("screen")).toHaveTextContent("30:/Reports/Calendar/");
		expect(mocks.rules).toContainEqual({ action: "read", subject: "post" });
	});

	it("does not turn a denied unrelated section into sales access", async () => {
		mocks.departmentIds = [7];
		open("/REPORTS/CALENDAR/");
		expect(await screen.findByText("У вас нет прав на просмотр этой страницы")).toBeInTheDocument();
		expect(screen.queryByTestId("screen")).not.toBeInTheDocument();
		expect(mocks.rules).toEqual([]);
	});
});
