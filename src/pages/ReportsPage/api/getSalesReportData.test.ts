import { beforeEach, describe, expect, it, vi } from "vitest";
import { $api } from "@/shared/config";
import { Endpoints } from "@/shared/constants/const";
import { SalesCodes } from "../types/types";
import { buildSalesMetrics } from "../ui/SalesPage/model/salesReport";
import { getSalesPeriodBounds, getSalesReportData } from "./getSalesReportData";

vi.mock("@/shared/config", () => ({ $api: { get: vi.fn() } }));
const period = { start: "2026-10-05", end: "2026-10-09" };
const deal = (id: number, title = `Сделка ${id}`) => ({
	id,
	title,
	assignedById: 30,
	opportunity: "100",
	stageId: "WON",
});

beforeEach(() => vi.clearAllMocks());

describe("complete Sales report", () => {
	it("includes all pages in totals and details and filters open-line deals from every metric", async () => {
		vi.mocked($api.get).mockImplementation(async (endpoint, config) => {
			const start = Number(config?.params.start);
			const items =
				start === 0
					? [
							...Array.from({ length: 49 }, (_, i) => deal(i + 1)),
							deal(50, "Шамиль - ОТКРЫТАЯ   ЛИНИЯ Evolution"),
						]
					: [deal(51), deal(52)];
			const result =
				endpoint === Endpoints.crmItems
					? { items }
					: endpoint === Endpoints.calls
						? [{ ID: "1", PORTAL_USER_ID: "30" }]
						: start === 0
							? [
									{
										ID: "10",
										NAME: "Первый",
										LAST_NAME: "",
										UF_DEPARTMENT: [19],
									},
								]
							: [
									{
										ID: "30",
										NAME: "Алёна",
										LAST_NAME: "Семаева",
										UF_DEPARTMENT: [19],
									},
								];
			return {
				data: {
					result,
					next: endpoint === Endpoints.calls || start > 0 ? null : 50,
				},
			} as never;
		});
		const result = await getSalesReportData(period);
		const rows = buildSalesMetrics(result, "week");
		expect(result.created).toHaveLength(52);
		expect(result.users.find((user) => user.id === "30")?.title).toBe(
			"Алёна Семаева",
		);
		for (const row of rows.filter((metric) => metric.type === "deal")) {
			expect(row.items).toHaveLength(51);
			expect(
				row.items.some(
					(item) => "title" in item && item.title.includes("Evolution"),
				),
			).toBe(false);
			expect(row.fact).toBe(row.id === "7" ? 5100 : 51);
		}
		expect(
			vi
				.mocked($api.get)
				.mock.calls.some(([, config]) => config?.params.start === 50),
		).toBe(true);
	});

	it("uses full Moscow days and event dates without a created-time lookback for PPO/KP", async () => {
		vi.mocked($api.get).mockImplementation(
			async (endpoint) =>
				({
					data: {
						result: endpoint === Endpoints.crmItems ? { items: [] } : [],
					},
				}) as never,
		);
		await getSalesReportData(period);
		expect(getSalesPeriodBounds(period.start, period.end)).toEqual({
			start: "2026-10-05T00:00:00+03:00",
			endExclusive: "2026-10-10T00:00:00+03:00",
			nextDay: "2026-10-10",
		});
		const filters = vi
			.mocked($api.get)
			.mock.calls.map(([, config]) => config?.params.filter);
		expect(filters).toContainEqual({
			categoryId: 0,
			">=createdTime": "2026-10-05T00:00:00+03:00",
			"<createdTime": "2026-10-10T00:00:00+03:00",
		});
		for (const field of [SalesCodes.ppoDay, SalesCodes.kpday]) {
			const filter = filters.find((value) => `>=${field}` in value);
			expect(filter[`>=${field}`]).toBe(period.start);
			expect(filter[`<${field}`]).toBe("2026-10-10");
			expect(
				Object.keys(filter).some((key) => key.includes("createdTime")),
			).toBe(false);
		}
		expect(filters.find((filter) => "@stageId" in filter)).not.toHaveProperty(
			">=createdTime",
		);
	});

	it.each([
		{ error: "ACCESS_DENIED", error_description: "Denied" },
		{ result: { items: null } },
		{ result: { items: [deal(1)] }, next: 0 },
		{ result: { items: [deal(1)] }, next: "50" },
	])("rejects errors and broken pagination instead of publishing zeros", async (payload) => {
		vi.mocked($api.get).mockImplementation(
			async (endpoint) =>
				({
					data: endpoint === Endpoints.crmItems ? payload : { result: [] },
				}) as never,
		);
		await expect(getSalesReportData(period)).rejects.toThrow();
	});

	it("preserves existing plan scaling and excluded stages", async () => {
		vi.mocked($api.get).mockImplementation(
			async (endpoint) =>
				({
					data: {
						result:
							endpoint === Endpoints.crmItems
								? { items: [{ ...deal(1), stageId: "UC_9X7H19" }] }
								: [],
					},
				}) as never,
		);
		const source = await getSalesReportData(period);
		const rows = buildSalesMetrics(source, "quarter");
		expect(rows.find((row) => row.id === "2")).toMatchObject({
			plan: 195,
			fact: 0,
			items: [],
		});
		expect(rows.find((row) => row.id === "5")?.plan).toBe(40);
		expect(rows.find((row) => row.id === "7")?.plan).toBe(1000000);
	});
});
