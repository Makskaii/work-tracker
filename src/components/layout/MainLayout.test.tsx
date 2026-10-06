/** biome-ignore-all lint/suspicious/noExplicitAny: test mocks */

import { act, cleanup, render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const mockNavigate = vi.fn();
const mockInitializeB24Frame = vi.fn();
const mockAbilityUpdate = vi.fn();
const mockCallMake = vi.fn();
const mockGetDepartmentsHeads = vi.fn();
const mockReportDepartmentIds = vi.fn();
const originalTopDescriptor = Object.getOwnPropertyDescriptor(window, "top");

vi.mock("@bitrix24/b24jssdk", () => ({
	initializeB24Frame: mockInitializeB24Frame,
	LoggerFactory: {
		createForBrowser: vi.fn().mockReturnValue({
			error: vi.fn(),
			info: vi.fn(),
		}),
	},
}));

vi.mock("../../shared/config/ability/casl", () => ({
	ability: {
		update: mockAbilityUpdate,
		can: () => true,
	},
}));

vi.mock("@/shared/api/getDepartments", () => ({
	getWorkTrackerDepartmentAccess: async () => ({
		heads: await mockGetDepartmentsHeads(),
		reportDepartmentIds: mockReportDepartmentIds(),
	}),
}));

vi.mock("react-router", async () => {
	const actual =
		await vi.importActual<typeof import("react-router")>("react-router");

	return {
		...actual,
		useNavigate: () => mockNavigate,
	};
});

describe("MainLayout", () => {
	const createMockB24Instance = () => ({
		destroy: vi.fn(),
		auth: {
			isAdmin: false,
		},
		actions: {
			v2: {
				call: {
					make: mockCallMake,
				},
			},
		},
	});

	beforeEach(() => {
		sessionStorage.clear();
		vi.clearAllMocks();
		vi.resetModules();
		mockGetDepartmentsHeads.mockResolvedValue([]);
		mockReportDepartmentIds.mockReturnValue([23, 25]);
	});

	afterEach(() => {
		cleanup();
		vi.unstubAllEnvs();
		if (originalTopDescriptor) {
			Object.defineProperty(window, "top", originalTopDescriptor);
		}
	});

	const mockEmbeddedWindow = () => {
		Object.defineProperty(window, "top", {
			configurable: true,
			value: {},
		});
	};

	const renderComponent = async (pathname = "/") => {
		const { MainLayout } = await import("./MainLayout");

		return render(
			<MemoryRouter initialEntries={[pathname]}>
				<MainLayout />
			</MemoryRouter>,
		);
	};

	describe("dev mode", () => {
		it("не должен обновлять ability дважды в devMode", async () => {
			vi.stubEnv("DEV", true);

			await renderComponent();

			await waitFor(() => {
				expect(mockAbilityUpdate).toHaveBeenCalledTimes(1);
			});

			expect(mockAbilityUpdate).toHaveBeenCalledWith([
				{
					action: "read",
					subject: "post",
				},
				{
					action: "create-client",
					subject: "client",
				},
			]);

			expect(mockInitializeB24Frame).not.toHaveBeenCalled();
			expect(mockCallMake).not.toHaveBeenCalled();
			expect(mockGetDepartmentsHeads).not.toHaveBeenCalled();
		});
	});

	describe("production mode", () => {
		it.each([
			false,
			true,
		])("allows ordinary developers inside Bitrix (DEV=%s)", async (devMode) => {
			vi.stubEnv("DEV", devMode);
			mockEmbeddedWindow();
			mockInitializeB24Frame.mockResolvedValue(createMockB24Instance());
			mockCallMake.mockResolvedValue({
				getData: () => ({ result: { ID: "30", UF_DEPARTMENT: [23] } }),
			});
			await renderComponent();
			await waitFor(() =>
				expect(mockAbilityUpdate).toHaveBeenLastCalledWith([
					{ action: "read", subject: "post" },
				]),
			);
			expect(mockNavigate).not.toHaveBeenCalled();
		});

		it.each([
			{ departments: [7, "23"] },
			{ departments: [7, "25"] },
			{ departments: "23" },
		])("recognizes eligible departments across every membership and scalar API values: %s", async ({
			departments,
		}) => {
			vi.stubEnv("DEV", false);
			mockEmbeddedWindow();
			mockInitializeB24Frame.mockResolvedValue(createMockB24Instance());
			mockCallMake.mockResolvedValue({
				getData: () => ({ result: { ID: "30", UF_DEPARTMENT: departments } }),
			});
			await renderComponent("/development-kanban");
			await waitFor(() =>
				expect(mockAbilityUpdate).toHaveBeenLastCalledWith(
					expect.arrayContaining([{ action: "read", subject: "post" }]),
				),
			);
			expect(mockNavigate).not.toHaveBeenCalled();
		});

		it("allows employees in a nested development department", async () => {
			vi.stubEnv("DEV", false);
			mockEmbeddedWindow();
			mockReportDepartmentIds.mockReturnValue([23, 25, 29, 30]);
			mockInitializeB24Frame.mockResolvedValue(createMockB24Instance());
			mockCallMake.mockResolvedValue({
				getData: () => ({ result: { ID: "30", UF_DEPARTMENT: [30] } }),
			});
			await renderComponent();
			await waitFor(() =>
				expect(mockAbilityUpdate).toHaveBeenLastCalledWith([
					{ action: "read", subject: "post" },
				]),
			);
		});

		it("keeps development access when department metadata fails", async () => {
			vi.stubEnv("DEV", false);
			mockEmbeddedWindow();
			mockGetDepartmentsHeads.mockRejectedValue(
				new Error("metadata unavailable"),
			);
			mockInitializeB24Frame.mockResolvedValue(createMockB24Instance());
			mockCallMake.mockResolvedValue({
				getData: () => ({ result: { ID: "30", UF_DEPARTMENT: [23] } }),
			});
			await renderComponent();
			await waitFor(() =>
				expect(mockAbilityUpdate).toHaveBeenLastCalledWith([
					{ action: "read", subject: "post" },
				]),
			);
		});

		it("does not grant department access when the current user cannot be identified", async () => {
			vi.stubEnv("DEV", false);
			mockEmbeddedWindow();
			mockInitializeB24Frame.mockResolvedValue(createMockB24Instance());
			mockCallMake.mockRejectedValue(new Error("user lookup failed"));
			await renderComponent();
			await waitFor(() =>
				expect(mockAbilityUpdate).toHaveBeenLastCalledWith([]),
			);
		});

		it("allows a Bitrix administrator without department membership", async () => {
			vi.stubEnv("DEV", false);
			mockEmbeddedWindow();
			const frame = createMockB24Instance();
			frame.auth.isAdmin = true;
			mockInitializeB24Frame.mockResolvedValue(frame);
			mockCallMake.mockResolvedValue({
				getData: () => ({ result: { ID: "30", UF_DEPARTMENT: [] } }),
			});
			await renderComponent();
			await waitFor(() =>
				expect(mockAbilityUpdate).toHaveBeenLastCalledWith([
					{ action: "read", subject: "post" },
					{ action: "create-client", subject: "client" },
				]),
			);
			expect(mockNavigate).not.toHaveBeenCalled();
		});

		it("keeps verified administrator access when both role lookups fail", async () => {
			vi.stubEnv("DEV", false);
			mockEmbeddedWindow();
			const frame = createMockB24Instance();
			frame.auth.isAdmin = true;
			mockInitializeB24Frame.mockResolvedValue(frame);
			mockGetDepartmentsHeads.mockRejectedValue(
				new Error("metadata unavailable"),
			);
			mockCallMake.mockRejectedValue(new Error("user lookup failed"));
			await renderComponent();
			await waitFor(() =>
				expect(mockAbilityUpdate).toHaveBeenLastCalledWith([
					{ action: "read", subject: "post" },
					{ action: "create-client", subject: "client" },
				]),
			);
		});

		it.each([
			"/reports/calendar",
			"/development-kanban",
		])("keeps an analyst's requested page %s instead of redirecting to the client form", async (pathname) => {
			vi.stubEnv("DEV", false);
			mockEmbeddedWindow();
			mockInitializeB24Frame.mockResolvedValue(createMockB24Instance());
			mockCallMake.mockResolvedValue({
				getData: () => ({ result: { ID: "30", UF_DEPARTMENT: [25] } }),
			});
			await renderComponent(pathname);
			await waitFor(() =>
				expect(mockAbilityUpdate).toHaveBeenLastCalledWith([
					{ action: "read", subject: "post" },
					{ action: "create-client", subject: "client" },
				]),
			);
			expect(mockNavigate).not.toHaveBeenCalled();
		});

		it.each([
			false,
			true,
		])("restores Valeria's reports and client accounts inside Bitrix (DEV=%s)", async (devMode) => {
			vi.stubEnv("DEV", devMode);
			mockEmbeddedWindow();
			mockGetDepartmentsHeads.mockResolvedValue(["1", "3", "6", "11"]);
			mockInitializeB24Frame.mockResolvedValue(createMockB24Instance());
			mockCallMake.mockResolvedValue({
				getData: () => ({ result: { ID: "89", UF_DEPARTMENT: [26] } }),
			});

			await renderComponent();

			await waitFor(() => {
				expect(mockAbilityUpdate).toHaveBeenLastCalledWith([
					{ action: "read", subject: "post" },
					{ action: "create-client", subject: "client" },
				]);
			});
			expect(mockCallMake).toHaveBeenCalledWith({ method: "user.current" });
			expect(mockNavigate).not.toHaveBeenCalled();
		});

		it("does not extend Valeria's individual access to the whole department", async () => {
			vi.stubEnv("DEV", false);
			mockEmbeddedWindow();
			mockGetDepartmentsHeads.mockResolvedValue(["1", "3", "6", "11"]);
			mockInitializeB24Frame.mockResolvedValue(createMockB24Instance());
			mockCallMake.mockResolvedValue({
				getData: () => ({ result: { ID: "90", UF_DEPARTMENT: [26] } }),
			});

			await renderComponent();

			await waitFor(() =>
				expect(mockAbilityUpdate).toHaveBeenLastCalledWith([]),
			);
			expect(mockNavigate).not.toHaveBeenCalled();
		});

		it("не инициализирует Bitrix24 при прямом открытии приложения", async () => {
			vi.stubEnv("DEV", false);
			const consoleError = vi
				.spyOn(console, "error")
				.mockImplementation(() => undefined);

			await renderComponent();

			await waitFor(() => {
				expect(mockInitializeB24Frame).not.toHaveBeenCalled();
			});

			consoleError.mockRestore();
		});

		it("blocks main pages when the app is opened without a Bitrix24 frame", async () => {
			vi.stubEnv("DEV", false);
			mockEmbeddedWindow();

			mockInitializeB24Frame.mockRejectedValue(new Error("No Bitrix frame"));

			let view!: ReturnType<typeof render>;

			await act(async () => {
				view = await renderComponent();
			});

			await waitFor(() => {
				expect(view.container.textContent).toContain("Битрикс24");
			});

			expect(mockAbilityUpdate).toHaveBeenCalledWith([]);
			expect(mockInitializeB24Frame).toHaveBeenCalledTimes(1);
			expect(mockGetDepartmentsHeads).not.toHaveBeenCalled();
			expect(mockCallMake).not.toHaveBeenCalled();
			expect(mockNavigate).not.toHaveBeenCalled();
		});

		it("должен инициализировать B24Frame при монтировании", async () => {
			vi.stubEnv("DEV", false);
			mockEmbeddedWindow();

			const mockB24Instance = createMockB24Instance();

			mockGetDepartmentsHeads.mockResolvedValue(["101", "202"]);
			mockInitializeB24Frame.mockResolvedValue(mockB24Instance);
			mockCallMake.mockResolvedValue({
				getData: () => ({
					result: {
						ID: "16",
						UF_DEPARTMENT: [],
					},
				}),
			});

			await renderComponent();

			await waitFor(() => {
				expect(mockInitializeB24Frame).toHaveBeenCalledTimes(1);
			});

			expect(mockGetDepartmentsHeads).toHaveBeenCalledTimes(1);
			expect(mockCallMake).toHaveBeenCalledWith({
				method: "user.current",
			});
		});

		it("не разрушает общий SDK frame при размонтировании layout", async () => {
			vi.stubEnv("DEV", false);
			mockEmbeddedWindow();

			const mockB24Instance = createMockB24Instance();

			mockGetDepartmentsHeads.mockResolvedValue(["101"]);
			mockInitializeB24Frame.mockResolvedValue(mockB24Instance);
			mockCallMake.mockResolvedValue({
				getData: () => ({
					result: {
						ID: "16",
						UF_DEPARTMENT: [],
					},
				}),
			});

			const view = await renderComponent();

			await waitFor(() => {
				expect(mockInitializeB24Frame).toHaveBeenCalledTimes(1);
			});

			view.unmount();

			expect(mockB24Instance.destroy).not.toHaveBeenCalled();
		});

		it("должен выдать права руководителю отдела", async () => {
			vi.stubEnv("DEV", false);
			mockEmbeddedWindow();

			const mockB24Instance = createMockB24Instance();

			mockGetDepartmentsHeads.mockResolvedValue(["16", "20"]);
			mockInitializeB24Frame.mockResolvedValue(mockB24Instance);
			mockCallMake.mockResolvedValue({
				getData: () => ({
					result: {
						ID: 16,
						UF_DEPARTMENT: [],
					},
				}),
			});

			await renderComponent();

			await waitFor(() => {
				expect(mockAbilityUpdate).toHaveBeenCalledWith([
					{
						action: "read",
						subject: "post",
					},
					{
						action: "create-client",
						subject: "client",
					},
					{
						action: "read",
						subject: "employee-16",
					},
				]);
			});

			expect(mockNavigate).toHaveBeenCalledTimes(1);
		});

		it("должен выдать права сотруднику из департамента 25 и выполнить navigate", async () => {
			vi.stubEnv("DEV", false);
			mockEmbeddedWindow();

			const mockB24Instance = createMockB24Instance();

			mockGetDepartmentsHeads.mockResolvedValue(["99", "100"]);
			mockInitializeB24Frame.mockResolvedValue(mockB24Instance);
			mockCallMake.mockResolvedValue({
				getData: () => ({
					result: {
						ID: 25,
						UF_DEPARTMENT: [25],
					},
				}),
			});

			await renderComponent();

			await waitFor(() => {
				expect(mockAbilityUpdate).toHaveBeenCalledWith([
					{ action: "read", subject: "post" },
					{
						action: "create-client",
						subject: "client",
					},
				]);
			});

			expect(mockNavigate).toHaveBeenCalledWith("/create-client-form", {
				replace: true,
			});
		});

		it("не должен выдавать права, если пользователь не руководитель и не из департамента 25", async () => {
			vi.stubEnv("DEV", false);
			mockEmbeddedWindow();

			const mockB24Instance = createMockB24Instance();

			mockGetDepartmentsHeads.mockResolvedValue(["99", "100"]);
			mockInitializeB24Frame.mockResolvedValue(mockB24Instance);
			mockCallMake.mockResolvedValue({
				getData: () => ({
					result: {
						ID: "30",
						UF_DEPARTMENT: [7],
					},
				}),
			});

			await renderComponent();

			await waitFor(() => {
				expect(mockAbilityUpdate).toHaveBeenCalledWith([]);
			});

			expect(mockNavigate).not.toHaveBeenCalled();
		});

		it("не должен дублировать правило create-client, если пользователь и руководитель, и из департамента 25", async () => {
			vi.stubEnv("DEV", false);
			mockEmbeddedWindow();

			const mockB24Instance = createMockB24Instance();

			mockGetDepartmentsHeads.mockResolvedValue(["25", "100"]);
			mockInitializeB24Frame.mockResolvedValue(mockB24Instance);
			mockCallMake.mockResolvedValue({
				getData: () => ({
					result: {
						ID: 25,
						UF_DEPARTMENT: [25],
					},
				}),
			});

			await renderComponent();

			await waitFor(() => {
				expect(mockAbilityUpdate).toHaveBeenCalledWith([
					{
						action: "read",
						subject: "post",
					},
					{
						action: "create-client",
						subject: "client",
					},
				]);
			});

			expect(mockNavigate).toHaveBeenCalledWith("/create-client-form", {
				replace: true,
			});
		});

		it("должен игнорировать пустые значения из getDepartmentsHeads", async () => {
			vi.stubEnv("DEV", false);
			mockEmbeddedWindow();

			const mockB24Instance = createMockB24Instance();

			mockGetDepartmentsHeads.mockResolvedValue([null, undefined, "16", "0"]);
			mockInitializeB24Frame.mockResolvedValue(mockB24Instance);
			mockCallMake.mockResolvedValue({
				getData: () => ({
					result: {
						ID: 16,
						UF_DEPARTMENT: [],
					},
				}),
			});

			await renderComponent();

			await waitFor(() => {
				expect(mockAbilityUpdate).toHaveBeenCalledWith([
					{
						action: "read",
						subject: "post",
					},
					{
						action: "create-client",
						subject: "client",
					},
					{
						action: "read",
						subject: "employee-16",
					},
				]);
			});
		});
	});
});
