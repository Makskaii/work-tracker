import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Endpoints } from "@/shared/constants/const";
import type { KanbanData } from "./api";
import { useKanbanData } from "./useKanbanData";

const source = vi.hoisted(() => ({ fetch: vi.fn(), clearCache: vi.fn() }));
vi.mock("./api", () => ({ fetchKanbanData: source.fetch }));
vi.mock("@/shared/config/axios/axios.config", () => ({
	clearBitrixReadCache: source.clearCache,
}));

const data = (id = "1"): KanbanData => ({
	stages: [{ id: "sprint", name: "Спринт", sort: 30 }],
	people: [],
	tasks: [
		{
			id,
			title: "Задача",
			stageId: "sprint",
			assigneeId: "13",
			projectId: "77",
			projectTitle: "Проект",
			priority: 1,
			estimateHours: 8,
			spentHours: 0,
			deadline: null,
		},
	],
});

beforeEach(() => vi.resetAllMocks());
afterEach(() => vi.useRealTimers());

describe("kanban loading", () => {
	it("loads once and does not silently reload on focus or an interval", async () => {
		source.fetch.mockResolvedValue(data());
		const { result } = renderHook(useKanbanData);
		await waitFor(() => expect(result.current.data).not.toBeNull());
		vi.useFakeTimers();
		act(() => {
			window.dispatchEvent(new Event("focus"));
			document.dispatchEvent(new Event("visibilitychange"));
			vi.advanceTimersByTime(5 * 60 * 1000);
		});
		expect(source.fetch).toHaveBeenCalledTimes(1);
		expect(result.current.updatedAt).toBeInstanceOf(Date);
	});

	it("retains the displayed board and its timestamp during refresh and after failure", async () => {
		const initial = data();
		source.fetch.mockResolvedValueOnce(initial);
		const { result } = renderHook(useKanbanData);
		await waitFor(() => expect(result.current.data).toBe(initial));
		const initialTimestamp = result.current.updatedAt;
		let fail: ((error: Error) => void) | undefined;
		source.fetch.mockImplementationOnce(
			() =>
				new Promise<KanbanData>((_resolve, reject) => {
					fail = reject;
				}),
		);
		act(() => result.current.refresh());
		expect(result.current.data).toBe(initial);
		expect(result.current.loading).toBe(false);
		expect(result.current.isRefreshing).toBe(true);
		expect(source.clearCache).toHaveBeenCalledWith([
			Endpoints.crmItems,
			Endpoints.status,
			Endpoints.users,
		]);
		await act(async () => {
			fail?.(new Error("CRM недоступна"));
		});
		expect(result.current.data).toBe(initial);
		expect(result.current.updatedAt).toBe(initialTimestamp);
		expect(result.current.error).toBe("CRM недоступна");
		expect(result.current.isRefreshing).toBe(false);
	});

	it("aborts replaced requests and ignores their late replies", async () => {
		let finishOld: ((value: KanbanData) => void) | undefined;
		let oldSignal: AbortSignal | undefined;
		source.fetch.mockImplementationOnce((signal) => {
			oldSignal = signal;
			return new Promise<KanbanData>((resolve) => {
				finishOld = resolve;
			});
		});
		const { result, unmount } = renderHook(useKanbanData);
		const latest = data("2");
		source.fetch.mockResolvedValueOnce(latest);
		act(() => result.current.refresh());
		await waitFor(() => expect(result.current.data).toBe(latest));
		expect(oldSignal?.aborted).toBe(true);
		await act(async () => {
			finishOld?.(data("1"));
		});
		expect(result.current.data).toBe(latest);
		const latestSignal = source.fetch.mock.calls[1][0] as AbortSignal;
		unmount();
		expect(latestSignal.aborted).toBe(true);
	});
});
