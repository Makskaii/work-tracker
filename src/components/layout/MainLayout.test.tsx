/** biome-ignore-all lint/suspicious/noExplicitAny: test mocks */

import { act, cleanup, render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockNavigate = vi.fn();
const mockInitializeB24Frame = vi.fn();
const mockAbilityUpdate = vi.fn();
const mockGetCurrentUserDepartmentInfo = vi.fn();

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

vi.mock("@/shared/hooks/useCurrentBitrixUser", () => ({
	useCurrentBitrixUser: () => ({
		getCurrentUserDepartmentInfo: mockGetCurrentUserDepartmentInfo,
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
	const mockB24Instance = {
		destroy: vi.fn(),
		auth: {
			isAdmin: true,
		},
	};

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

		return await act(async () =>
			render(
				<MemoryRouter>
					<MainLayout />
				</MemoryRouter>,
			),
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
			]);

			expect(mockInitializeB24Frame).not.toHaveBeenCalled();
		});
	});

	describe("production mode", () => {
		it("должен инициализировать B24Frame при монтировании", async () => {
			vi.stubEnv("DEV", false);

			mockInitializeB24Frame.mockResolvedValue(mockB24Instance);
			mockGetCurrentUserDepartmentInfo.mockResolvedValue({
				departmentIds: [],
			});

			await renderComponent();

			await waitFor(() => {
				expect(mockInitializeB24Frame).toHaveBeenCalledTimes(1);
			});
		});

		it("должен вызывать destroy при размонтировании", async () => {
			vi.stubEnv("DEV", false);

			mockInitializeB24Frame.mockResolvedValue(mockB24Instance);
			mockGetCurrentUserDepartmentInfo.mockResolvedValue({
				departmentIds: [],
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

			mockInitializeB24Frame.mockResolvedValue({
				...mockB24Instance,
				auth: { isAdmin: true },
			});
			mockGetCurrentUserDepartmentInfo.mockResolvedValue({
				departmentIds: [],
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

		it("должен выдать права сотруднику из департамента 23 и выполнить navigate", async () => {
			vi.stubEnv("DEV", false);

			mockInitializeB24Frame.mockResolvedValue({
				...mockB24Instance,
				auth: { isAdmin: false },
			});
			mockGetCurrentUserDepartmentInfo.mockResolvedValue({
				departmentIds: [23],
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
	});
});
