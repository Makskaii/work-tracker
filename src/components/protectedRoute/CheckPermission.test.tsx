import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ability } from "../../shared/config/ability/casl";
import { CheckPermission } from "./CheckPermission";

// Мокаем модуль с ability
vi.mock("../../shared/config/ability/casl", () => ({
	ability: {
		can: vi.fn(),
		update: vi.fn(),
	},
}));

describe("CheckPermission", () => {
	const mockChildren = <div data-testid="test-child">Дочерний контент</div>;
	const permission = "read";

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("должен отображать дочерние элементы, если у пользователя есть разрешение", () => {
		vi.mocked(ability.can).mockReturnValue(true);

		render(
			<CheckPermission permission={permission}>{mockChildren}</CheckPermission>,
		);

		expect(screen.getByTestId("test-child")).toBeInTheDocument();
		expect(
			screen.queryByText("У вас нет прав на просмотр этой страницы"),
		).not.toBeInTheDocument();

		expect(ability.can).toHaveBeenCalledWith(permission, "post");
		expect(ability.can).toHaveBeenCalledTimes(1);
	});

	it("должен отображать сообщение об отсутствии прав, если у пользователя нет разрешения", () => {
		vi.mocked(ability.can).mockReturnValue(false);

		render(
			<CheckPermission permission={permission}>{mockChildren}</CheckPermission>,
		);

		expect(
			screen.getByText("У вас нет прав на просмотр этой страницы"),
		).toBeInTheDocument();
		expect(screen.queryByTestId("test-child")).not.toBeInTheDocument();

		expect(ability.can).toHaveBeenCalledWith(permission, "post");
		expect(ability.can).toHaveBeenCalledTimes(1);
	});

	it("должен отображать сообщение об отсутствии прав, если ability не определен", () => {
		render(
			<CheckPermission permission={permission}>{mockChildren}</CheckPermission>,
		);

		expect(
			screen.getByText("У вас нет прав на просмотр этой страницы"),
		).toBeInTheDocument();
		expect(screen.queryByTestId("test-child")).not.toBeInTheDocument();
	});

	it("должен корректно обрабатывать разные значения permission", () => {
		const testCases = ["read", "write", "delete", "update"];

		testCases.forEach((testPermission) => {
			vi.mocked(ability.can).mockReturnValue(true);

			render(
				<CheckPermission permission={testPermission}>
					<div data-testid={`child-${testPermission}`}>
						Контент для {testPermission}
					</div>
				</CheckPermission>,
			);

			expect(screen.getByTestId(`child-${testPermission}`)).toBeInTheDocument();
			expect(ability.can).toHaveBeenCalledWith(testPermission, "post");

			vi.clearAllMocks();
		});
	});

	it("должен корректно обрабатывать множественные дочерние элементы", () => {
		vi.mocked(ability.can).mockReturnValue(true);

		render(
			<CheckPermission permission={permission}>
				<div data-testid="child-1">Первый элемент</div>
				<div data-testid="child-2">Второй элемент</div>
				<span data-testid="child-3">Третий элемент</span>
			</CheckPermission>,
		);

		expect(screen.getByTestId("child-1")).toBeInTheDocument();
		expect(screen.getByTestId("child-2")).toBeInTheDocument();
		expect(screen.getByTestId("child-3")).toBeInTheDocument();
		expect(
			screen.queryByText("У вас нет прав на просмотр этой страницы"),
		).not.toBeInTheDocument();
	});

	it("должен корректно работать с пустыми дочерними элементами", () => {
		vi.mocked(ability.can).mockReturnValue(true);

		render(<CheckPermission permission={permission}>{null}</CheckPermission>);

		expect(
			screen.queryByText("У вас нет прав на просмотр этой страницы"),
		).not.toBeInTheDocument();
	});

	it("должен корректно обновляться при изменении ability", () => {
		vi.mocked(ability.can).mockReturnValue(true);

		const { rerender } = render(
			<CheckPermission permission={permission}>{mockChildren}</CheckPermission>,
		);

		expect(screen.getByTestId("test-child")).toBeInTheDocument();

		vi.mocked(ability.can).mockReturnValue(false);

		rerender(
			<CheckPermission permission={permission}>{mockChildren}</CheckPermission>,
		);

		expect(
			screen.getByText("У вас нет прав на просмотр этой страницы"),
		).toBeInTheDocument();
		expect(screen.queryByTestId("test-child")).not.toBeInTheDocument();
	});
});
