import type { B24Frame } from "@bitrix24/b24jssdk";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	initialize: vi.fn(), departments: vi.fn(), call: vi.fn(), ability: vi.fn(),
	navigate: vi.fn(), outlet: vi.fn(), options: vi.fn(),
}));
vi.mock("@bitrix24/b24jssdk", () => ({
	initializeB24Frame: mocks.initialize,
	LoggerFactory: { createForBrowser: () => ({ error: vi.fn() }) },
}));
vi.mock("@/shared/api/getDepartments", () => ({
	getWorkTrackerDepartmentAccess: async () => ({
		heads: await mocks.departments(),
		reportDepartmentIds: [23, 25],
	}),
}));
vi.mock("@/shared/config/ability/casl", () => ({ ability: { update: mocks.ability, can: () => true } }));
vi.mock("./AppHeader", () => ({ AppHeader: () => null }));
vi.mock("../spinner/Spinner", () => ({ Spinner: () => <p>Инициализация</p> }));
vi.mock("react-router", async (importOriginal) => ({
	...(await importOriginal<typeof import("react-router")>()),
	Outlet: mocks.outlet, useNavigate: () => mocks.navigate,
}));
vi.mock("@/pages/ClientHoursPackages/supportAnalyst.api", () => ({
	fetchSupportReportOptions: mocks.options,
	getSupportReportForEdit: vi.fn(), prepareSupportReportFields: vi.fn(),
	supportErrorMessage: (_error: unknown, fallback: string) => fallback,
}));

const originalTop = Object.getOwnPropertyDescriptor(window, "top");
const embedded = () => Object.defineProperty(window, "top", { configurable: true, value: {} });
const frame = () => ({
	destroy: vi.fn(), actions: { v2: { call: { make: mocks.call } } },
}) as unknown as B24Frame;

async function renderLayout(strict = false) {
	const { useB24 } = await import("@/shared/config/bitrixProvider/bitrixContext");
	const { MainLayout } = await import("./MainLayout");
	mocks.outlet.mockImplementation(() => {
		const context = useB24();
		return <output data-testid="sdk-status">{context.b24 ? "connected" : "missing"}:{context.status}</output>;
	});
	const element = <MemoryRouter><MainLayout /></MemoryRouter>;
	return render(strict ? <StrictMode>{element}</StrictMode> : element);
}

describe("Bitrix SDK readiness and ownership", () => {
	beforeEach(() => {
		sessionStorage.clear();
		vi.resetModules(); vi.clearAllMocks(); vi.stubEnv("DEV", false);
		embedded();
		mocks.departments.mockResolvedValue([]);
		mocks.call.mockResolvedValue({ isSuccess: true, getData: () => ({ result: { ID: "30", UF_DEPARTMENT: [] } }) });
		mocks.options.mockResolvedValue({ activities: [{ id: 3, title: "Разработка" }] });
		vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
	});
	afterEach(() => {
		cleanup(); vi.restoreAllMocks(); vi.unstubAllEnvs();
		if (originalTop) Object.defineProperty(window, "top", originalTop);
	});

	it("keeps the initialized portal session when user.current fails without granting roles", async () => {
		mocks.initialize.mockResolvedValue(frame());
		mocks.call.mockRejectedValueOnce(new Error("temporary user lookup failure"));
		await renderLayout();
		expect(await screen.findByTestId("sdk-status")).toHaveTextContent("connected:ready");
		expect(mocks.ability).toHaveBeenLastCalledWith([]);
		expect(mocks.navigate).not.toHaveBeenCalled();
	});

	it.each(["departments", "user"])("starts role lookups together after SDK readiness and waits for both (%s resolves first)", async (first) => {
		let resolveFrame!: (value: B24Frame) => void;
		let resolveDepartments!: (value: string[]) => void;
		let resolveUser!: (value: { getData: () => { result: { ID: string; UF_DEPARTMENT: number[] } } }) => void;
		mocks.initialize.mockReturnValue(new Promise<B24Frame>((resolve) => { resolveFrame = resolve; }));
		mocks.departments.mockReturnValue(new Promise<string[]>((resolve) => { resolveDepartments = resolve; }));
		mocks.call.mockReturnValue(new Promise((resolve) => { resolveUser = resolve; }));
		await renderLayout();
		expect(mocks.departments).not.toHaveBeenCalled();
		expect(mocks.call).not.toHaveBeenCalled();

		await act(async () => resolveFrame(frame()));
		expect(mocks.departments).toHaveBeenCalledTimes(1);
		expect(mocks.call).toHaveBeenCalledExactlyOnceWith({ method: "user.current" });
		expect(mocks.ability).not.toHaveBeenCalled();
		const finishDepartments = () => resolveDepartments(["30"]);
		const finishUser = () => resolveUser({ getData: () => ({ result: { ID: "30", UF_DEPARTMENT: [] } }) });
		await act(async () => (first === "departments" ? finishDepartments() : finishUser()));
		expect(screen.getByText("Инициализация")).toBeVisible();
		expect(mocks.ability).not.toHaveBeenCalled();

		await act(async () => (first === "departments" ? finishUser() : finishDepartments()));
		expect(await screen.findByTestId("sdk-status")).toHaveTextContent("connected:ready");
		expect(mocks.ability).toHaveBeenLastCalledWith([
			{ action: "read", subject: "post" },
			{ action: "create-client", subject: "client" },
		]);
		expect(mocks.navigate).not.toHaveBeenCalled();
	});

	it("keeps SDK readiness independent of failed department metadata", async () => {
		mocks.initialize.mockResolvedValue(frame());
		mocks.departments.mockRejectedValueOnce(new Error("department service unavailable"));
		await renderLayout();
		expect(await screen.findByTestId("sdk-status")).toHaveTextContent("connected:ready");
		expect(mocks.ability).toHaveBeenLastCalledWith([]);
	});

	it("does not destroy the SDK singleton when a stale StrictMode initialization resolves", async () => {
		const current = frame();
		let resolve!: (value: B24Frame) => void;
		mocks.initialize.mockReturnValue(new Promise<B24Frame>((done) => { resolve = done; }));
		const view = await renderLayout(true);
		await act(async () => resolve(current));
		expect(await screen.findByTestId("sdk-status")).toHaveTextContent("connected:ready");
		expect(current.destroy).not.toHaveBeenCalled();
		view.unmount();
		expect(current.destroy).not.toHaveBeenCalled();
	});

	it("reuses a live SDK frame after layout remount", async () => {
		const current = frame();
		mocks.initialize.mockResolvedValue(current);
		const first = await renderLayout();
		await screen.findByTestId("sdk-status");
		first.unmount();
		await renderLayout();
		expect(await screen.findByTestId("sdk-status")).toHaveTextContent("connected:ready");
		expect(current.destroy).not.toHaveBeenCalled();
	});

	it("initializes the user's real session for development builds embedded in Bitrix", async () => {
		vi.stubEnv("DEV", true);
		mocks.initialize.mockResolvedValue(frame());
		await renderLayout();
		expect(await screen.findByTestId("sdk-status")).toHaveTextContent("connected:ready");
		expect(mocks.initialize).toHaveBeenCalledTimes(1);
		expect(mocks.ability).toHaveBeenLastCalledWith([]);
	});

	it("explains an SDK connection failure and offers reconnect instead of claiming the portal is absent", async () => {
		mocks.initialize.mockRejectedValue(new Error("frame handshake failed"));
		await renderLayout();
		expect(await screen.findByText("Не удалось подключиться к Битрикс24")).toBeVisible();
		expect(screen.getByRole("button", { name: "Подключиться заново" })).toBeEnabled();
		expect(screen.queryByTestId("sdk-status")).not.toBeInTheDocument();
		expect(mocks.call).not.toHaveBeenCalled();
	});

	it("does not show the outside-portal warning or block the report form after a role lookup failure", async () => {
		mocks.initialize.mockResolvedValue(frame());
		mocks.call.mockRejectedValueOnce(new Error("temporary user lookup failure"));
		const { MainLayout } = await import("./MainLayout");
		const { SupportReportModal } = await import("@/pages/ClientHoursPackages/SupportReportModal");
		mocks.outlet.mockImplementation(() => <SupportReportModal projectId={31} projectTitle="Техподдержка" tasks={[]} onClose={vi.fn()} onSaved={vi.fn()}/>);
		render(<MemoryRouter><MainLayout /></MemoryRouter>);
		await waitFor(() => expect(screen.getByRole("button", { name: "Сохранить отчёт" })).toBeEnabled());
		expect(screen.queryByText(/Для сохранения откройте Work Tracker внутри/)).not.toBeInTheDocument();
		expect(mocks.call).toHaveBeenCalledTimes(1);
		expect(mocks.call).toHaveBeenCalledWith({ method: "user.current" });
	});

	it("keeps saving disabled for an unavailable SDK without misidentifying an embedded window", async () => {
		const { B24Context } = await import("@/shared/config/bitrixProvider/bitrixContext");
		const { SupportReportModal } = await import("@/pages/ClientHoursPackages/SupportReportModal");
		render(<B24Context.Provider value={{ b24: null, status: "unavailable" }}><SupportReportModal projectId={31} projectTitle="Техподдержка" tasks={[]} onClose={vi.fn()} onSaved={vi.fn()}/></B24Context.Provider>);
		expect(await screen.findByText(/Не удалось подключиться к текущей сессии Битрикс24/)).toBeVisible();
		expect(screen.queryByText(/Для сохранения откройте Work Tracker внутри/)).not.toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Сохранить отчёт" })).toBeDisabled();
		expect(mocks.call).not.toHaveBeenCalled();
	});
});
