import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SalesProfitabilityPage } from "./SalesProfitabilityPage";

const requests = vi.hoisted(() => ({ users: vi.fn(), deals: vi.fn() }));
vi.mock("react-router", () => ({ useOutletContext: () => ({ activities: [{ ID: "1" }] }) }));
vi.mock("../../api/getUsers", () => ({ getUsers: requests.users }));
vi.mock("../../api/getCrmDeals", () => ({ getProfitabilityDeals: requests.deals }));
vi.mock("./SalesProfitabilityReport", () => ({ SalesProfitabilityReport: (props: unknown) => <output data-testid="report">{JSON.stringify(props)}</output> }));
beforeEach(() => vi.resetAllMocks());
afterEach(cleanup);

it("opens the local project report without fetching unused CRM deals", async () => {
	requests.users.mockResolvedValue([{ ID: "5", NAME: "Анна", LAST_NAME: "Иванова", UF_DEPARTMENT: [19] }]);
	render(<SalesProfitabilityPage />);
	await waitFor(() => expect(screen.getByTestId("report")).toHaveTextContent('"loading":false'));
	expect(screen.getByTestId("report")).toHaveTextContent("Анна Иванова");
	expect(requests.users).toHaveBeenCalledTimes(1);
	expect(requests.deals).not.toHaveBeenCalled();
});
