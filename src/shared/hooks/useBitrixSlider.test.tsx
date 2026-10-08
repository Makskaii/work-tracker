import type { B24Frame } from "@bitrix24/b24jssdk";
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { B24Context, type WorkTrackerBitrix } from "../config/bitrixProvider/bitrixContext";
import { useBitrixSlider } from "./useBitrixSlider";

afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

describe("opening Bitrix cards outside the portal", () => {
	it("opens a separate portal tab and completes the refresh callback only after returning to Work Tracker", async () => {
		vi.spyOn(document, "hasFocus").mockReturnValue(true);
		const card = { opener: "original", location: { replace: vi.fn() }, closed: false };
		const open = vi.spyOn(window, "open").mockReturnValue(card as unknown as Window);
		const { result } = renderHook(() => useBitrixSlider(), { wrapper: ({ children }) => <B24Context.Provider value={{ b24: null, mode: "employee", portalOrigin: "https://crm.evolution-soft.ru" }}>{children}</B24Context.Provider> });
		let finished = false;
		const promise = result.current.openTask("55").then((response) => { finished = true; return response; });
		expect(open).toHaveBeenCalledWith("about:blank", "_blank");
		expect(card.opener).toBeNull();
		expect(card.location.replace).toHaveBeenCalledWith("https://crm.evolution-soft.ru/crm/type/1072/details/55/");
		await Promise.resolve(); expect(finished).toBe(false);
		window.dispatchEvent(new Event("blur")); window.dispatchEvent(new Event("focus"));
		expect(await promise).toEqual({ isClose: true });
	});
	it("detects a closed card even when the browser did not deliver a focus event", async () => {
		vi.useFakeTimers(); vi.spyOn(document, "hasFocus").mockReturnValue(true);
		const card = { opener: null, location: { replace: vi.fn() }, closed: false };
		vi.spyOn(window, "open").mockReturnValue(card as unknown as Window);
		const { result } = renderHook(() => useBitrixSlider(), { wrapper: ({ children }) => <B24Context.Provider value={{ b24: null, mode: "employee", portalOrigin: "https://crm.evolution-soft.ru" }}>{children}</B24Context.Provider> });
		const promise = result.current.openTask("77", 1060); card.closed = true;
		await act(async () => vi.advanceTimersByTime(750));
		expect(await promise).toEqual({ isClose: true });
	});
	it("explains a blocked popup and removes pending listeners when the page unmounts", async () => {
		const open = vi.spyOn(window, "open").mockReturnValue(null);
		const { result, unmount } = renderHook(() => useBitrixSlider(), { wrapper: ({ children }) => <B24Context.Provider value={{ b24: null, mode: "employee", portalOrigin: "https://crm.evolution-soft.ru" }}>{children}</B24Context.Provider> });
		await expect(result.current.openTask("55")).rejects.toThrow("Разрешите открытие вкладок");
		open.mockReturnValue({ opener: null, location: { replace: vi.fn() }, closed: false } as unknown as Window);
		const promise = result.current.openTask("55"); unmount();
		expect(await promise).toEqual({ isClose: false });
	});
	it("keeps the actual SDK slider inside Bitrix rather than opening an external tab", async () => {
		const open = vi.spyOn(window, "open");
		const slider = { getUrl: vi.fn((path) => path), openPath: vi.fn().mockResolvedValue({ isClose: true }) };
		const b24: WorkTrackerBitrix = { actions: { v2: { call: { make: vi.fn() } } }, slider: slider as unknown as B24Frame["slider"] };
		const { result } = renderHook(() => useBitrixSlider(), { wrapper: ({ children }) => <B24Context.Provider value={{ b24, mode: "iframe" }}>{children}</B24Context.Provider> });
		await result.current.openTask("55");
		expect(slider.openPath).toHaveBeenCalledWith("/crm/type/1072/details/55/", 1100);
		expect(open).not.toHaveBeenCalled();
	});
});
