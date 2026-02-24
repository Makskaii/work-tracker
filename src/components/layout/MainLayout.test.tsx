/** biome-ignore-all lint/suspicious/noExplicitAny: <for correct mocks> */

import { initializeB24Frame } from "@bitrix24/b24jssdk";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ability } from "../../shared/config/ability/casl";
import { MainLayout } from "./MainLayout";

vi.mock("@bitrix24/b24jssdk", () => ({
	initializeB24Frame: vi.fn(),
	LoggerFactory: {
		createForBrowser: vi.fn().mockReturnValue({
			error: vi.fn(),
			info: vi.fn(),
		}),
	},
}));

vi.mock("../../shared/config/ability/casl", () => ({
	ability: {
		update: vi.fn(),
	},
}));

describe("MainLayout", () => {
	const mockB24Instance = {
		destroy: vi.fn(),
		auth: {
			isAdmin: true,
		},
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	const renderWithRouter = () => {
		return render(
			<MemoryRouter>
				<MainLayout />
			</MemoryRouter>,
		);
	};

	it("должен успешно рендериться с навигацией", () => {
		renderWithRouter();

		expect(screen.getByText("Данные")).toBeInTheDocument();
		expect(screen.getByText("Отчеты")).toBeInTheDocument();
	});

	describe("Инициализация Bitrix24", () => {
		it("должен инициализировать B24Frame при монтировании", async () => {
			vi.mocked(initializeB24Frame).mockResolvedValue(mockB24Instance as any);

			renderWithRouter();

			await waitFor(() => {
				expect(initializeB24Frame).toHaveBeenCalledTimes(1);
			});
		});

		it("должен вызывать destroy при размонтировании", async () => {
			vi.mocked(initializeB24Frame).mockResolvedValue(mockB24Instance as any);

			const { unmount } = renderWithRouter();

			await waitFor(() => {
				expect(initializeB24Frame).toHaveBeenCalled();
			});

			unmount();
			expect(mockB24Instance.destroy).toHaveBeenCalledTimes(1);
		});
	});

	describe("Обновление прав доступа (ability)", () => {
		it("не должен обновлять ability дважды в devMode", async () => {
			vi.mocked(initializeB24Frame).mockResolvedValue({
				...mockB24Instance,
				auth: { isAdmin: true },
			} as any);

			renderWithRouter();

			expect(ability.update).toHaveBeenCalledTimes(1);

			await waitFor(() => {
				expect(initializeB24Frame).toHaveBeenCalled();
			});
			expect(ability.update).toHaveBeenCalledTimes(1);
		});
	});

	describe("Роутинг", () => {
		it("должен иметь правильные ссылки навигации", () => {
			renderWithRouter();

			const dataLink = screen.getByText("Данные").closest("a");
			const reportsLink = screen.getByText("Отчеты").closest("a");

			expect(dataLink).toHaveAttribute("href", "/data");
			expect(reportsLink).toHaveAttribute("href", "/reports");
		});
	});
});
