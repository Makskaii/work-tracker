/** biome-ignore-all lint/suspicious/noExplicitAny: test mocks */

import { act, cleanup, render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockNavigate = vi.fn();
const mockInitializeB24Frame = vi.fn();
const mockAbilityUpdate = vi.fn();
const mockCallMake = vi.fn();

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
	},
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
	const createMockB24Instance = (isAdmin = true) => ({
		destroy: vi.fn(),
		auth: {
			isAdmin,
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
		vi.clearAllMocks();
		vi.resetModules();
	});

	afterEach(() => {
		cleanup();
		vi.unstubAllEnvs();
	});

	const renderComponent = async () => {
		const { MainLayout } = await import("./MainLayout");

		let view!: ReturnType<typeof render>;

		await act(async () => {
			view = render(
				<MemoryRouter>
					<MainLayout />
				</MemoryRouter>,
			);
		});

		return view;
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
			]);

			expect(mockInitializeB24Frame).not.toHaveBeenCalled();
			expect(mockCallMake).not.toHaveBeenCalled();
		});
	});

	describe("production mode", () => {
		it("должен инициализировать B24Frame при монтировании", async () => {
			vi.stubEnv("DEV", false);

			const mockB24Instance = createMockB24Instance(true);

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

			expect(mockCallMake).toHaveBeenCalledWith({
				method: "user.current",
			});
		});

		it("должен вызывать destroy при размонтировании", async () => {
			vi.stubEnv("DEV", false);

			const mockB24Instance = createMockB24Instance(true);

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

			await act(async () => {
				view.unmount();
			});

			expect(mockB24Instance.destroy).toHaveBeenCalledTimes(1);
		});

		it("должен выдать права админу", async () => {
			vi.stubEnv("DEV", false);

			const mockB24Instance = createMockB24Instance(true);

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

			expect(mockNavigate).not.toHaveBeenCalled();
		});

		it("должен выдать права сотруднику из департамента 25 и выполнить navigate", async () => {
			vi.stubEnv("DEV", false);

			const mockB24Instance = createMockB24Instance(false);

			mockInitializeB24Frame.mockResolvedValue(mockB24Instance);
			mockCallMake.mockResolvedValue({
				getData: () => ({
					result: {
						ID: "25",
						UF_DEPARTMENT: [25],
					},
				}),
			});

			await renderComponent();

			await waitFor(() => {
				expect(mockAbilityUpdate).toHaveBeenCalledWith([
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

		it("не должен выдавать права, если пользователь не админ и не из департамента 25", async () => {
			vi.stubEnv("DEV", false);

			const mockB24Instance = createMockB24Instance(false);

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

		it("не должен дублировать правило create-client, если пользователь и админ, и из департамента 25", async () => {
			vi.stubEnv("DEV", false);

			const mockB24Instance = createMockB24Instance(true);

			mockInitializeB24Frame.mockResolvedValue(mockB24Instance);
			mockCallMake.mockResolvedValue({
				getData: () => ({
					result: {
						ID: "25",
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
	});
});
