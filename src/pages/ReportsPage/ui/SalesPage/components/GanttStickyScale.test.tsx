import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GanttStickyScale, measureStickyScale } from "./GanttStickyScale";

const box = (top: number, bottom: number, left = 40, right = 1040) => ({
  top, bottom, left, right, width: right - left, height: bottom - top,
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("sticky calendar clipping", () => {
  it("keeps the date scale inside a short nested scroll area", () => {
    expect(measureStickyScale(
      box(-200, 900), box(-200, 900), box(-200, -146, 320, 1800),
      { top: 60, bottom: 90, left: 0, right: 1200 }, 280,
    )).toMatchObject({ top: 60, height: 54, clippedTop: 0, clippedBottom: 24 });
  });

  it("combines both vertical clipping edges when the last row leaves a short scroll area", () => {
    const layout = measureStickyScale(
      box(-200, 90), box(-200, 900), box(-200, -146, 320, 1800),
      { top: 60, bottom: 80, left: 0, right: 1200 }, 280,
    );
    expect(layout).toMatchObject({ top: 36, height: 54, clippedTop: 24, clippedBottom: 10 });
    expect(layout && layout.height - layout.clippedTop - layout.clippedBottom).toBe(20);
  });

  it("preserves column alignment when an outer scroll area clips the left edge", () => {
    expect(measureStickyScale(
      box(-200, 900), box(-200, 900), box(-200, -146, 120, 1600),
      { top: 60, bottom: 900, left: 100, right: 700 }, 280,
    )).toMatchObject({ left: 100, width: 600, datesLeft: 20, labelLeft: -60, labelWidth: 280 });
  });

  it("updates clipping when only the enclosing scroll area resizes", () => {
    const parent = document.createElement("div");
    parent.style.overflowY = "auto";
    const viewport = document.createElement("div");
    const board = document.createElement("div");
    const scale = document.createElement("div");
    parent.append(viewport);
    viewport.append(board);
    board.append(scale);
    document.body.append(parent);

    let parentHeight = 200;
    let resize: ResizeObserverCallback | undefined;
    let frame: FrameRequestCallback | undefined;
    const observe = vi.fn();
    const disconnect = vi.fn();
    vi.stubGlobal("ResizeObserver", class {
      constructor(callback: ResizeObserverCallback) { resize = callback; }
      observe = observe;
      disconnect = disconnect;
    });
    vi.stubGlobal("requestAnimationFrame", vi.fn((callback: FrameRequestCallback) => { frame = callback; return 1; }));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    Object.defineProperty(document.documentElement, "clientWidth", { configurable: true, value: 1200 });
    Object.defineProperty(parent, "clientHeight", { configurable: true, get: () => parentHeight });
    Object.defineProperty(viewport, "clientWidth", { configurable: true, value: 1000 });
    vi.spyOn(parent, "getBoundingClientRect").mockImplementation(() => DOMRect.fromRect({ x: 0, y: 60, width: 1200, height: parentHeight }));
    vi.spyOn(viewport, "getBoundingClientRect").mockReturnValue(DOMRect.fromRect({ x: 40, y: -200, width: 1000, height: 1100 }));
    vi.spyOn(board, "getBoundingClientRect").mockReturnValue(DOMRect.fromRect({ x: 40, y: -200, width: 1760, height: 1100 }));
    vi.spyOn(scale, "getBoundingClientRect").mockReturnValue(DOMRect.fromRect({ x: 320, y: -200, width: 1480, height: 54 }));

    try {
      const view = render(<GanttStickyScale boardRef={{ current: board }} viewportRef={{ current: viewport }}
        scaleRef={{ current: scale }} enabled labelWidth={280}><span>September</span></GanttStickyScale>);
      expect(observe).toHaveBeenCalledWith(parent);
      expect(screen.getByTestId("gantt-sticky-scale").style.clipPath).toBe("inset(0px 0 0px 0)");

      parentHeight = 30;
      act(() => { resize?.([], {} as ResizeObserver); frame?.(0); });
      expect(screen.getByTestId("gantt-sticky-scale").style.clipPath).toBe("inset(0px 0 24px 0)");
      view.unmount();
      expect(disconnect).toHaveBeenCalledOnce();
    } finally {
      parent.remove();
      Reflect.deleteProperty(document.documentElement, "clientWidth");
    }
  });
});
