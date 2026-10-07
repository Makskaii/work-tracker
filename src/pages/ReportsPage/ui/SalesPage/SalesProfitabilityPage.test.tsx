import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SalesProfitabilityPage } from "./SalesProfitabilityPage";

const requests = vi.hoisted(() => ({ users: vi.fn(), deals: vi.fn(), clearCache: vi.fn() }));
vi.mock("react-router", () => ({ useOutletContext: () => ({ activities: [{ ID: "1" }] }) }));
vi.mock("../../api/getUsers", () => ({ getUsers: requests.users }));
vi.mock("../../api/getCrmDeals", () => ({ getProfitabilityDeals: requests.deals }));
vi.mock("@/shared/config/axios/axios.config", () => ({ clearBitrixReadCache: requests.clearCache }));
vi.mock("./SalesProfitabilityReport", () => ({ SalesProfitabilityReport: (props: { onRetryUsers: () => void }) => <><output data-testid="report">{JSON.stringify(props)}</output><button type="button" onClick={props.onRetryUsers}>Retry employees</button></> }));
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

it("keeps the project report mounted while employees are pending and reports failure with an independent retry", async () => {
	vi.spyOn(console, "error").mockImplementation(() => undefined);
	let rejectUsers: ((error: Error) => void) | undefined;
	requests.users.mockImplementationOnce(() => new Promise((_, reject) => { rejectUsers = reject; }));
	render(<SalesProfitabilityPage />);
	expect(screen.getByTestId("report")).toHaveTextContent('"loading":true');
	expect(requests.users).toHaveBeenCalledWith(expect.any(AbortSignal), { throwOnError: true });
	rejectUsers?.(new Error("Unavailable"));
	await waitFor(() => expect(screen.getByTestId("report")).toHaveTextContent("Статистика по команде недоступна"));
	requests.users.mockResolvedValueOnce([{ ID: "5", NAME: "Анна", LAST_NAME: "Иванова", UF_DEPARTMENT: [19] }]);
	fireEvent.click(screen.getByRole("button", { name: "Retry employees" }));
	await waitFor(() => expect(screen.getByTestId("report")).toHaveTextContent("Анна Иванова"));
	expect(screen.getByTestId("report")).toHaveTextContent('"usersError":null');
	expect(requests.clearCache).toHaveBeenCalledWith(["user.get"]);
	vi.restoreAllMocks();
});
