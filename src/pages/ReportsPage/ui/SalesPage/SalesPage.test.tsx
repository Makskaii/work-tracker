import {
	cleanup,
	fireEvent,
	render,
	screen,
	within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Period } from "@/shared/hooks/usePeriodBorders";
import type { User } from "@/shared/types/types";
import type { SalesReportSource } from "../../api/getSalesReportData";
import type { Deal } from "../../types/deals.types";
import type { SalesMetric } from "./model/salesReport";
import { SalesPage } from "./SalesPage";

type Snapshot = {
	source: SalesReportSource;
	start: string;
	end: string;
	period: Period;
};
const state = vi.hoisted(() => ({
	snapshot: null as Snapshot | null,
	rows: [] as SalesMetric[],
	start: "2026-10-05",
	end: "2026-10-09",
	period: "week" as Period,
	loading: false,
	error: false,
	refresh: vi.fn(),
	setPeriod: vi.fn(),
	goPrev: vi.fn(),
	goNext: vi.fn(),
	setDay: vi.fn(),
	openTask: vi.fn(),
	buildMetrics: vi.fn(),
}));
vi.mock("./model/useSalesReport", () => ({
	useSalesReport: () => ({
		snapshot: state.snapshot,
		loading: state.loading,
		error: state.error,
		refresh: state.refresh,
	}),
}));
vi.mock("./model/salesReport", () => ({
	buildSalesMetrics: (...args: unknown[]) => {
		state.buildMetrics(...args);
		return state.rows;
	},
}));
vi.mock("@/shared/hooks/usePeriodBorders", () => ({
	usePeriodBorders: () => ({
		start: state.start,
		end: state.end,
		period: state.period,
		setPeriod: state.setPeriod,
		setDay: state.setDay,
		goPrev: state.goPrev,
		goNext: state.goNext,
	}),
}));
vi.mock("@/shared/hooks/useBitrixSlider", () => ({
	useBitrixSlider: () => ({ openTask: state.openTask }),
}));

const employee: User = {
	id: "15",
	value: "Алёна Семаева",
	title: "Алёна Семаева",
	position: "Менеджер продаж",
	department: 19,
	photo: "",
};
const deals = [
	{ id: "41", title: "Вентаж", opportunity: "140400", assignedById: 15 },
	{ id: "42", title: "Новый клиент", opportunity: "59000", assignedById: 15 },
] as Deal[];
const fixtureSource = (): SalesReportSource => ({
	calls: [],
	created: deals,
	ppo: [],
	kp: [],
	active: deals,
	won: [],
	users: [employee],
});
const loaded = () => {
	state.snapshot = {
		source: fixtureSource(),
		start: "2026-10-05",
		end: "2026-10-09",
		period: "week",
	};
	state.rows = [
		{
			id: "2",
			title: "Созданные сделки",
			plan: 15,
			fact: 2,
			deviation: -13,
			type: "deal",
			items: deals,
		},
		{
			id: "3",
			title: "Проведённые ППО",
			plan: 7,
			fact: 0,
			deviation: -7,
			type: "deal",
			items: [],
		},
	];
};

beforeEach(() => {
	vi.clearAllMocks();
	state.snapshot = null;
	state.rows = [];
	state.start = "2026-10-05";
	state.end = "2026-10-09";
	state.period = "week";
	state.loading = false;
	state.error = false;
});
afterEach(cleanup);

describe("sales report view", () => {
	it("shows all created deals by default below the complete summary without detail or employee expansion controls", () => {
		loaded();
		render(<SalesPage />);
		const table = screen.getByRole("table");
		const row = screen.getByRole("row", { name: /Созданные сделки/ });
		const panel = screen.getByRole("region", {
			name: "Детализация: Созданные сделки",
		});
		expect(row).toHaveAttribute("aria-selected", "true");
		expect(row).toHaveAttribute("tabindex", "0");
		expect(within(table).getAllByRole("columnheader")).toHaveLength(4);
		expect(
			table.compareDocumentPosition(panel) & Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
		expect(within(panel).getByText(employee.title)).toBeInTheDocument();
		expect(
			within(panel).getAllByRole("button", { name: /Открыть сделку/ }),
		).toHaveLength(2);
		for (const deal of deals) {
			expect(
				within(panel).getByRole("button", {
					name: `Открыть сделку «${deal.title}»`,
				}),
			).toBeVisible();
		}
		expect(
			screen.queryByRole("button", {
				name: /Подробнее|Скрыть|Закрыть детализацию/,
			}),
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: /Алёна Семаева/ }),
		).not.toBeInTheDocument();
		expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
	});

	it("selects an empty metric by its row and retains the summary and visible list on repeated selection", () => {
		loaded();
		render(<SalesPage />);
		const table = screen.getByRole("table");
		const createdRow = screen.getByRole("row", { name: /Созданные сделки/ });
		const row = screen.getByRole("row", { name: /Проведённые ППО/ });
		fireEvent.click(row);
		expect(row).toHaveAttribute("aria-selected", "true");
		expect(createdRow).toHaveAttribute("aria-selected", "false");
		const panel = screen.getByRole("region", {
			name: "Детализация: Проведённые ППО",
		});
		expect(
			within(panel).getByText("За этот период данных нет."),
		).toBeInTheDocument();
		expect(within(panel).getByText("Сделок: 0")).toBeInTheDocument();
		expect(screen.getByRole("table")).toBe(table);
		expect(screen.getByRole("row", { name: /Созданные сделки/ })).toBe(
			createdRow,
		);
		fireEvent.click(row);
		expect(
			screen.getByRole("region", { name: "Детализация: Проведённые ППО" }),
		).toBe(panel);
		expect(row).toHaveAttribute("aria-selected", "true");
		fireEvent.click(createdRow);
		expect(screen.getByRole("table")).toBe(table);
		expect(screen.getByRole("row", { name: /Созданные сделки/ })).toBe(
			createdRow,
		);
		expect(
			screen.getByRole("button", { name: "Открыть сделку «Вентаж»" }),
		).toBeVisible();
	});

	it("supports Enter and Space selection without hiding the selected metric", () => {
		loaded();
		render(<SalesPage />);
		const table = screen.getByRole("table");
		const createdRow = screen.getByRole("row", { name: /Созданные сделки/ });
		const emptyRow = screen.getByRole("row", { name: /Проведённые ППО/ });
		expect(emptyRow).toHaveAttribute("tabindex", "0");
		emptyRow.focus();
		expect(emptyRow).toHaveFocus();
		fireEvent.keyDown(emptyRow, { key: "Enter" });
		expect(emptyRow).toHaveAttribute("aria-selected", "true");
		expect(
			screen.getByRole("region", { name: "Детализация: Проведённые ППО" }),
		).toBeVisible();
		createdRow.focus();
		expect(createdRow).toHaveFocus();
		const space = new KeyboardEvent("keydown", {
			key: " ",
			bubbles: true,
			cancelable: true,
		});
		fireEvent(createdRow, space);
		expect(space.defaultPrevented).toBe(true);
		expect(createdRow).toHaveAttribute("aria-selected", "true");
		fireEvent.keyDown(createdRow, { key: "Enter" });
		expect(createdRow).toHaveAttribute("aria-selected", "true");
		expect(
			screen.getByRole("region", { name: "Детализация: Созданные сделки" }),
		).toBeVisible();
		expect(screen.getByRole("table")).toBe(table);
	});

	it("keeps the summary, selected row and visible deal buttons mounted during a background period refresh", () => {
		loaded();
		const view = render(<SalesPage />);
		const table = screen.getByRole("table");
		const dealButton = screen.getByRole("button", {
			name: "Открыть сделку «Вентаж»",
		});
		const row = screen.getByRole("row", { name: /Созданные сделки/ });
		state.loading = true;
		state.start = "2026-10-12";
		state.end = "2026-10-16";
		view.rerender(<SalesPage />);
		expect(screen.getByRole("table")).toBe(table);
		expect(screen.getByRole("row", { name: /Созданные сделки/ })).toBe(row);
		expect(row).toHaveAttribute("aria-selected", "true");
		expect(
			screen.getByRole("button", { name: "Открыть сделку «Вентаж»" }),
		).toBe(dealButton);
		expect(screen.getByRole("status")).toHaveTextContent(
			"Обновляем данные. Показан отчёт за 05.10.2026 — 09.10.2026.",
		);
		expect(
			screen.queryByText("Загружаем звонки и сделки…"),
		).not.toBeInTheDocument();
		fireEvent.click(dealButton);
		expect(state.openTask).toHaveBeenCalledTimes(1);
		expect(
			within(row)
				.getAllByRole("cell")
				.slice(0, 3)
				.map((cell) => cell.textContent),
		).toEqual(["15", "2", "-13"]);
		expect(
			screen.getByRole("button", { name: "Обновить данные" }),
		).toBeDisabled();
	});

	it("retains the last successful facts and identifies their period after a refresh failure", () => {
		loaded();
		state.error = true;
		state.start = "2026-10-12";
		state.end = "2026-10-16";
		render(<SalesPage />);
		expect(screen.getByRole("alert")).toHaveTextContent(
			"Показаны последние загруженные данные за 05.10.2026 — 09.10.2026.",
		);
		const row = screen.getByRole("row", { name: /Созданные сделки/ });
		expect(
			within(row)
				.getAllByRole("cell")
				.slice(0, 3)
				.map((cell) => cell.textContent),
		).toEqual(["15", "2", "-13"]);
		expect(state.buildMetrics).toHaveBeenCalledWith(
			state.snapshot?.source,
			"week",
		);
		fireEvent.click(screen.getByRole("button", { name: "Повторить загрузку" }));
		expect(state.refresh).toHaveBeenCalledTimes(1);
	});

	it("does not render zero metrics when the first load fails", () => {
		state.error = true;
		render(<SalesPage />);
		expect(screen.getByRole("alert")).toHaveTextContent(
			"Показатели пока недоступны.",
		);
		expect(screen.queryByRole("table")).not.toBeInTheDocument();
		expect(screen.queryByText("0")).not.toBeInTheDocument();
		expect(state.buildMetrics).not.toHaveBeenCalled();
		fireEvent.click(screen.getByRole("button", { name: "Повторить загрузку" }));
		expect(state.refresh).toHaveBeenCalledTimes(1);
	});

	it("shows initial loading without fabricated facts", () => {
		state.loading = true;
		render(<SalesPage />);
		expect(screen.getByRole("status")).toHaveTextContent(
			"Загружаем звонки и сделки…",
		);
		expect(screen.queryByRole("table")).not.toBeInTheDocument();
		expect(
			screen.queryByRole("region", { name: /Детализация:/ }),
		).not.toBeInTheDocument();
	});
});
