import { beforeEach, describe, expect, it, vi } from "vitest";
import { $api } from "../config";
import { DEPARTMENT_IDS, Endpoints } from "../constants/const";
import {
	getDepartmentsHeads,
	getWorkTrackerDepartmentAccess,
} from "./getDepartments";

vi.mock("../config", () => ({ $api: { get: vi.fn() } }));

const roots = [DEPARTMENT_IDS.DEV, DEPARTMENT_IDS.ANALYTICS];
const mockedGet = vi.mocked($api.get);

describe("getWorkTrackerDepartmentAccess", () => {
	beforeEach(() => vi.resetAllMocks());

	it("includes nested development and analytics departments regardless of row order", async () => {
		mockedGet.mockResolvedValue({
			data: {
				result: [
					{ ID: "45", PARENT: "40" },
					{ ID: "50", PARENT: "25" },
					{ ID: "40", PARENT: "23" },
					{ ID: "23", PARENT: "1" },
					{ ID: "25", PARENT: "1" },
					{ ID: "19", PARENT: "1" },
					{ ID: "60", PARENT: "19" },
					{ ID: "1", PARENT: "0" },
				],
			},
		});

		const { reportDepartmentIds } = await getWorkTrackerDepartmentAccess();
		expect(reportDepartmentIds).toEqual([...roots, 40, 50, 45]);
		expect(reportDepartmentIds).not.toContain(1);
		expect(reportDepartmentIds).not.toContain(19);
		expect(reportDepartmentIds).not.toContain(60);
	});

	it("retains root access with an empty hierarchy", async () => {
		mockedGet.mockResolvedValue({ data: { result: [] } });
		expect(await getWorkTrackerDepartmentAccess()).toEqual({
			heads: [],
			reportDepartmentIds: roots,
		});
	});

	it("keeps valid heads from all departments and rejects empty or invalid head IDs", async () => {
		mockedGet.mockResolvedValue({
			data: {
				result: [
					{ ID: 23, UF_HEAD: "0016" },
					{ ID: "25", UF_HEAD: 89 },
					{ ID: 19, UF_HEAD: "100" },
					{ ID: 30, UF_HEAD: "16" },
					...[0, "0", "", null, undefined, false, "12x", -1, 1.5].map(
						(UF_HEAD, index) => ({ ID: 70 + index, UF_HEAD }),
					),
				],
			},
		});
		expect((await getWorkTrackerDepartmentAccess()).heads).toEqual([
			"16",
			"89",
			"100",
		]);
	});

	it("terminates cyclic parent links without granting unrelated cycles", async () => {
		mockedGet.mockResolvedValue({
			data: {
				result: [
					{ ID: 23, PARENT: 40 },
					{ ID: 40, PARENT: 23 },
					{ ID: 25, PARENT: 25 },
					{ ID: 60, PARENT: 61 },
					{ ID: 61, PARENT: 60 },
				],
			},
		});
		expect((await getWorkTrackerDepartmentAccess()).reportDepartmentIds).toEqual([
			...roots,
			40,
		]);
	});

	it("loads all pages before resolving cross-page department parents", async () => {
		mockedGet
			.mockResolvedValueOnce({
				data: { result: [{ ID: 45, PARENT: 40, UF_HEAD: 16 }], next: "50" },
			})
			.mockResolvedValueOnce({
				data: { result: [{ ID: 40, PARENT: 23, UF_HEAD: 89 }], next: null },
			});
		expect(await getWorkTrackerDepartmentAccess()).toEqual({
			heads: ["16", "89"],
			reportDepartmentIds: [...roots, 40, 45],
		});
		expect(mockedGet.mock.calls).toEqual([
			[Endpoints.department, { params: { start: 0 } }],
			[Endpoints.department, { params: { start: 50 } }],
		]);
	});

	it("rejects API failures so the caller can preserve root access", async () => {
		const error = new Error("Department API unavailable");
		mockedGet.mockRejectedValue(error);
		await expect(getWorkTrackerDepartmentAccess()).rejects.toBe(error);
	});

	it.each([
		{},
		{ result: null },
		{ result: {} },
		{ result: [], error: "ACCESS_DENIED" },
		{ result: [null] },
		{ result: [{ ID: "broken" }] },
		{ result: [{ ID: 23, PARENT: "broken" }] },
	])("rejects malformed department responses: %j", async (data) => {
		mockedGet.mockResolvedValue({ data });
		await expect(getWorkTrackerDepartmentAccess()).rejects.toThrow();
	});

	it.each([0, -1, "broken", 1.5, false])(
		"rejects invalid pagination offsets: %j",
		async (next) => {
			mockedGet.mockResolvedValue({ data: { result: [], next } });
			await expect(getWorkTrackerDepartmentAccess()).rejects.toThrow(
				"Invalid department pagination",
			);
			expect(mockedGet).toHaveBeenCalledTimes(1);
		},
	);

	it("rejects repeated pagination instead of silently returning partial access", async () => {
		mockedGet
			.mockResolvedValueOnce({ data: { result: [], next: 50 } })
			.mockResolvedValueOnce({ data: { result: [], next: 50 } });
		await expect(getWorkTrackerDepartmentAccess()).rejects.toThrow(
			"Invalid department pagination",
		);
		expect(mockedGet).toHaveBeenCalledTimes(2);
	});

	it("keeps the existing department-head helper compatible", async () => {
		mockedGet.mockResolvedValue({
			data: { result: [{ ID: 23, UF_HEAD: "16" }] },
		});
		expect(await getDepartmentsHeads()).toEqual(["16"]);
	});
});
