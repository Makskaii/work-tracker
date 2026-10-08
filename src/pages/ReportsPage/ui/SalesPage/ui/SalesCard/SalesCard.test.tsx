import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Deal } from "@/pages/ReportsPage/types/deals.types";
import { SalesCodes } from "@/pages/ReportsPage/types/types";
import { EntityTypeIds } from "@/shared/constants/const";
import type { User } from "@/shared/types/types";
import { SalesCard } from "./SalesCard";
import { SalesItem } from "./SalesItem";

const slider = vi.hoisted(() => ({ openTask: vi.fn() }));
vi.mock("@/shared/hooks/useBitrixSlider", () => ({
	useBitrixSlider: () => slider,
}));

const user: User = {
	id: "15",
	value: "Алёна Семаева",
	title: "Алёна Семаева",
	position: "Менеджер продаж",
	department: 19,
	photo: "",
};
const deal = (overrides: Partial<Deal> = {}): Deal =>
	({
		id: "41",
		title: "Вентаж",
		opportunity: "140400.50",
		[SalesCodes.ppoDay]: "2026-10-06T12:00:00+03:00",
		[SalesCodes.kpday]: "2026-10-07",
		...overrides,
	}) as Deal;

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe("sales detail cards", () => {
	it("can expand and collapse an employee from the keyboard and opens a deal once", async () => {
		const keyboard = userEvent.setup();
		render(<SalesCard user={user} deals={[deal()]} isTotal={false} />);
		const summary = screen.getByRole("button", {
			name: /Алёна Семаева.*Сделок: 1/,
		});
		expect(summary).toHaveAttribute("aria-expanded", "false");
		expect(
			screen.queryByRole("button", { name: /Открыть сделку/ }),
		).not.toBeInTheDocument();
		summary.focus();
		await keyboard.keyboard("{Enter}");
		expect(summary).toHaveAttribute("aria-expanded", "true");
		const openDeal = screen.getByRole("button", {
			name: "Открыть сделку «Вентаж»",
		});
		fireEvent.click(openDeal);
		expect(slider.openTask).toHaveBeenCalledExactlyOnceWith(
			"41",
			EntityTypeIds.default,
			"common",
		);
		fireEvent.click(summary);
		expect(summary).toHaveAttribute("aria-expanded", "false");
		expect(
			screen.queryByRole("button", { name: /Открыть сделку/ }),
		).not.toBeInTheDocument();
	});

	it("formats the sale total and ignores malformed amounts rather than rendering NaN", () => {
		render(
			<SalesCard
				user={user}
				deals={[
					deal(),
					deal({ id: "42", opportunity: "not-a-number" }),
					deal({ id: "43", opportunity: "59.50" }),
				]}
				isTotal
			/>,
		);
		expect(
			screen.getByRole("button", { name: /Алёна Семаева/ }),
		).toHaveTextContent("140 460 ₽");
		expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
	});

	it("formats both event dates and retains decimal money in a single deal", () => {
		render(<SalesItem deal={deal()} />);
		expect(screen.getByText("06.10.2026")).toBeInTheDocument();
		expect(screen.getByText("07.10.2026")).toBeInTheDocument();
		expect(screen.getByText("140 400,5 ₽")).toBeInTheDocument();
		expect(screen.queryByRole("button")).not.toBeInTheDocument();
	});

	it("shows clear fallbacks for missing or invalid metadata and preserves a genuine zero amount", () => {
		const view = render(
			<SalesItem
				deal={deal({
					title: "",
					opportunity: "invalid",
					[SalesCodes.ppoDay]: "bad-date",
					[SalesCodes.kpday]: "",
				})}
			/>,
		);
		expect(screen.getByText("Сделка №41")).toBeInTheDocument();
		expect(screen.getAllByText("—")).toHaveLength(2);
		expect(screen.queryByText(/Invalid Date|NaN/)).not.toBeInTheDocument();
		view.rerender(<SalesItem deal={deal({ opportunity: "0" })} />);
		expect(screen.getByText("0 ₽")).toBeInTheDocument();
		view.rerender(
			<SalesItem
				deal={deal({
					[SalesCodes.ppoDay]: "2026-02-31",
					[SalesCodes.kpday]: "2026-13-02",
				})}
			/>,
		);
		expect(screen.getAllByText("—")).toHaveLength(2);
	});
});
