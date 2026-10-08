import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	getSalesReportData,
	type SalesReportSource,
} from "../../../api/getSalesReportData";
import { useSalesReport } from "./useSalesReport";
vi.mock("../../../api/getSalesReportData", () => ({
	getSalesReportData: vi.fn(),
}));
vi.mock("@/shared/config/axios/axios.config", () => ({
	clearBitrixReadCache: vi.fn(),
}));
const source = (id: string): SalesReportSource => ({
	calls: [{ id, assignedById: "30" }],
	created: [],
	ppo: [],
	kp: [],
	active: [],
	won: [],
	users: [],
});
const deferred = () => {
	let resolve!: (value: SalesReportSource) => void;
	let reject!: (reason: Error) => void;
	const promise = new Promise<SalesReportSource>((ok, fail) => {
		resolve = ok;
		reject = fail;
	});
	return { promise, resolve, reject };
};
beforeEach(() => vi.clearAllMocks());
describe("Sales report refresh", () => {
	it("retains the last complete report on refresh and on failure", async () => {
		const next = deferred();
		vi.mocked(getSalesReportData)
			.mockResolvedValueOnce(source("old"))
			.mockReturnValueOnce(next.promise);
		const { result } = renderHook(() =>
			useSalesReport("2026-10-05", "2026-10-09", "week"),
		);
		await waitFor(() => expect(result.current.loading).toBe(false));
		act(() => result.current.refresh());
		expect(result.current.loading).toBe(true);
		expect(result.current.snapshot?.source.calls[0].id).toBe("old");
		await act(async () => next.reject(new Error("Unavailable")));
		expect(result.current.error).toBe(true);
		expect(result.current.snapshot?.source.calls[0].id).toBe("old");
	});
	it("ignores an old request that completes after switching periods", async () => {
		const old = deferred();
		const current = deferred();
		vi.mocked(getSalesReportData)
			.mockReturnValueOnce(old.promise)
			.mockReturnValueOnce(current.promise);
		const { result, rerender } = renderHook(
			({ start }) => useSalesReport(start, "2026-10-09", "week"),
			{ initialProps: { start: "2026-10-05" } },
		);
		rerender({ start: "2026-10-01" });
		await act(async () => current.resolve(source("current")));
		await act(async () => old.resolve(source("old")));
		expect(result.current.snapshot?.source.calls[0].id).toBe("current");
		expect(result.current.snapshot?.start).toBe("2026-10-01");
		expect(result.current.loading).toBe(false);
	});
	it("does not show a zero table while the complete report is pending", () => {
		vi.mocked(getSalesReportData).mockReturnValue(deferred().promise);
		const { result } = renderHook(() =>
			useSalesReport("2026-10-05", "2026-10-09", "week"),
		);
		expect(result.current.loading).toBe(true);
		expect(result.current.snapshot).toBeNull();
	});
});
