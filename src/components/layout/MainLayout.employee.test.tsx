import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ initialize: vi.fn(), session: vi.fn(), logout: vi.fn(), navigate: vi.fn(), update: vi.fn(), rules: [] as { action: string; subject: string }[] }));
vi.mock("@bitrix24/b24jssdk", async (importOriginal) => ({
	...(await importOriginal<typeof import("@bitrix24/b24jssdk")>()),
	initializeB24Frame: mocks.initialize,
}));
vi.mock("@/shared/config/auth/employeeAuth.api", () => ({
	captureEmployeeCallback: vi.fn(), getEmployeeSession: mocks.session, logoutEmployee: mocks.logout,
	connectEmployeeFrame: vi.fn(), employeeLoginUrl: (returnTo: string) => `/devapps/work-tracker/api/auth/employee/login?returnTo=${encodeURIComponent(returnTo)}`,
}));
vi.mock("@/shared/config/ability/casl", () => ({
	ability: {
		get rules() { return mocks.rules; },
		update: (rules: { action: string; subject: string }[]) => { mocks.rules = rules; mocks.update(rules); },
		can: (action: string, subject: string) => mocks.rules.some((rule) => rule.action === action && rule.subject === subject),
	},
}));
vi.mock("react-router", async (importOriginal) => ({
	...(await importOriginal<typeof import("react-router")>()), useNavigate: () => mocks.navigate,
	Outlet: () => <div data-testid="work-page">Рабочая страница с задачами</div>,
}));
vi.mock("./AppHeader", () => ({ AppHeader: () => <nav>Разделы приложения</nav> }));
const session = { user: { id: 89, name: "Валерия Меньшикова-Винокурова", departmentIds: [26], isAdmin: false }, rules: [{ action: "read", subject: "post" }], portalOrigin: "https://crm.evolution-soft.ru", csrfToken: "csrf-example", expiresAt: "2026-10-09" };
beforeEach(() => {
	vi.resetModules(); vi.clearAllMocks(); vi.stubEnv("DEV", false); sessionStorage.clear(); mocks.rules = [];
	mocks.session.mockResolvedValue(session); mocks.logout.mockResolvedValue(undefined);
});
afterEach(() => { cleanup(); vi.unstubAllEnvs(); });
async function renderLayout(path = "/development-kanban") {
	const { MainLayout } = await import("./MainLayout");
	return render(<MemoryRouter initialEntries={[path]}><MainLayout /></MemoryRouter>);
}

describe("Work Tracker outside the portal", () => {
	it("opens the real employee workspace with server-provided roles and an account/logout header", async () => {
		await renderLayout();
		expect(await screen.findByTestId("work-page")).toBeVisible();
		expect(screen.getByText("Валерия Меньшикова-Винокурова")).toBeVisible();
		expect(screen.getByRole("button", { name: "Выйти" })).toBeEnabled();
		expect(mocks.update).toHaveBeenLastCalledWith(session.rules);
		expect(mocks.initialize).not.toHaveBeenCalled();
	});
	it("offers Bitrix login for a missing cookie without sending the employee to the client cabinet", async () => {
		mocks.session.mockRejectedValue({ response: { status: 401 } }); await renderLayout();
		const login = await screen.findByRole("link", { name: /Войти через Битрикс24/ });
		expect(login).toHaveAttribute("href", "/devapps/work-tracker/api/auth/employee/login?returnTo=%2Fdevelopment-kanban");
		expect(screen.queryByTestId("work-page")).not.toBeInTheDocument();
		expect(mocks.navigate).not.toHaveBeenCalled();
	});
	it("does not grant developer access to an authenticated sales employee", async () => {
		mocks.session.mockResolvedValue({ ...session, rules: [{ action: "read", subject: "sales-report" }] });
		await renderLayout();
		expect(await screen.findByText("У вас нет прав на просмотр этой страницы")).toBeVisible();
		expect(screen.queryByTestId("work-page")).not.toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Выйти" })).toBeVisible();
	});
	it("explains denied portal membership without showing application data", async () => {
		mocks.session.mockRejectedValue({ response: { status: 403 } }); await renderLayout();
		expect(await screen.findByRole("alert")).toHaveTextContent("нет доступа к Work Tracker");
		expect(screen.queryByTestId("work-page")).not.toBeInTheDocument();
	});
	it("keeps an authenticated screen when logout temporarily fails, then clears it on successful logout", async () => {
		mocks.logout.mockRejectedValueOnce(new Error("network failure")); await renderLayout();
		fireEvent.click(await screen.findByRole("button", { name: "Выйти" }));
		expect(await screen.findByRole("alert")).toHaveTextContent("Не удалось выйти");
		expect(screen.getByTestId("work-page")).toBeVisible();
		fireEvent.click(screen.getByRole("button", { name: "Выйти" }));
		expect(await screen.findByRole("link", { name: /Войти через Битрикс24/ })).toBeVisible();
		expect(screen.queryByTestId("work-page")).not.toBeInTheDocument();
	});
	it("shows a login screen after actual employee-session expiration without a client-profile redirect", async () => {
		await renderLayout(); await screen.findByTestId("work-page");
		const { employeeSessionState } = await import("@/shared/config/auth/employee.sessions");
		await act(async () => employeeSessionState.expire());
		expect(await screen.findByRole("alert")).toHaveTextContent("Сессия завершилась");
		expect(screen.getByRole("link", { name: /Войти через Битрикс24/ })).toBeVisible();
		expect(mocks.navigate).not.toHaveBeenCalled();
	});
	it("allows a failed connection to be retried without exposing raw server error messages", async () => {
		mocks.session.mockRejectedValueOnce(new Error("Network Error: secret internal address")); await renderLayout();
		expect(await screen.findByRole("alert")).toHaveTextContent("Не удалось подключиться");
		expect(screen.queryByText(/secret internal address/)).not.toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Повторить подключение" }));
		expect(await screen.findByTestId("work-page")).toBeVisible();
		expect(mocks.session).toHaveBeenCalledTimes(2);
	});
	it("returns an employee with only personal-statistics access to the proper landing page", async () => {
		mocks.session.mockResolvedValue({ ...session, user: { ...session.user, id: 10 }, rules: [{ action: "read", subject: "employee-10" }] });
		await renderLayout("/");
		await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith("/employee/10/stats", { replace: true }));
	});
	it("uses the safe callback return route instead of imposing another department's landing page", async () => {
		mocks.session.mockResolvedValue({ ...session, returnTo: "/client-hours-packages" });
		await renderLayout("/");
		await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith("/client-hours-packages", { replace: true }));
	});
});
