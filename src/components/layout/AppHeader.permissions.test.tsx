import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import { ability } from "@/shared/config/ability/casl";
import { AppHeader } from "./AppHeader";

afterEach(() => { cleanup(); ability.update([]); });

describe("permission-aware Work Tracker navigation", () => {
	it("shows the sales report and existing client accounts while hiding unrelated report links", () => {
		ability.update([
			{ action: "read", subject: "sales-report" },
			{ action: "create-client", subject: "client" },
		]);
		render(<MemoryRouter initialEntries={["/reports/sales"]}><AppHeader /></MemoryRouter>);
		expect(screen.getByRole("link", { name: /Отчёт по продажам/ })).toHaveAttribute("href", "/reports/sales");
		expect(screen.getByRole("link", { name: /Клиентские аккаунты/ })).toBeInTheDocument();
		expect(screen.queryByRole("link", { name: /Отчёт по проектам/ })).not.toBeInTheDocument();
		expect(screen.queryByRole("link", { name: /Отчёт разработки/ })).not.toBeInTheDocument();
		expect(screen.queryByRole("link", { name: /Отчёт по техподдержке/ })).not.toBeInTheDocument();
		expect(screen.queryByRole("link", { name: /Календарь/ })).not.toBeInTheDocument();
	});

	it("retains all existing report navigation for an existing broad report role", () => {
		ability.update([{ action: "read", subject: "post" }, { action: "create-client", subject: "client" }]);
		render(<MemoryRouter initialEntries={["/reports/profitability"]}><AppHeader /></MemoryRouter>);
		expect(screen.getByRole("link", { name: /Отчёт по продажам/ })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: /Отчёт по проектам/ })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: /Отчёт разработки/ })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: /Отчёт по техподдержке/ })).toBeInTheDocument();
	});
});
