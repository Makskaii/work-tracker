import { beforeEach, describe, expect, it, vi } from "vitest";
import { $api } from "@/shared/config";
import { DEPARTMENT_IDS, Endpoints } from "@/shared/constants/const";
import { getDevelopers } from "./getDevelopers";

vi.mock("@/shared/config", () => ({ $api: { get: vi.fn() } }));

describe("getDevelopers", () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it("loads every department page without excluding inactive employees", async () => {
		const active = { ID: "12", ACTIVE: true };
		const inactive = { ID: "14", ACTIVE: false };
		const mockedGet = vi.mocked($api.get);
		mockedGet
			.mockResolvedValueOnce({ data: { result: [active], next: 50 } })
			.mockResolvedValueOnce({ data: { result: [inactive] } });

		expect(await getDevelopers()).toEqual([active, inactive]);
		expect(mockedGet).toHaveBeenCalledTimes(2);
		for (const [index, [endpoint, options]] of mockedGet.mock.calls.entries()) {
			expect(endpoint).toBe(Endpoints.users);
			expect(options).toHaveProperty("params.start", index * 50);
			expect(options).toHaveProperty("params.filter", {
				"@UF_DEPARTMENT": [DEPARTMENT_IDS.ANALYTICS, DEPARTMENT_IDS.DEV],
			});
			expect(options).toHaveProperty(
				"params.select",
				expect.arrayContaining(["ACTIVE"]),
			);
		}
	});

	it("stops when the API repeats a pagination offset", async () => {
		const mockedGet = vi.mocked($api.get);
		mockedGet
			.mockResolvedValueOnce({ data: { result: [{ ID: "12" }], next: 50 } })
			.mockResolvedValueOnce({ data: { result: [{ ID: "14" }], next: 50 } });
		expect((await getDevelopers()).map((user) => user.ID)).toEqual([
			"12",
			"14",
		]);
		expect(mockedGet).toHaveBeenCalledTimes(2);
	});
});
