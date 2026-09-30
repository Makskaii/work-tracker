import { useLayoutEffect, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import styles from "./ProjectPlanning.module.scss";
import ganttStyles from "../SalesProfitabilityReport.module.scss";

type Box = { top: number; bottom: number; left: number; right: number; width: number; height: number };
export type StickyScaleLayout = { top: number; left: number; width: number; height: number; datesLeft: number; datesWidth: number; labelLeft: number; labelWidth: number; clippedTop: number };
export function measureStickyScale(board: Box, viewport: Box, scale: Box, clip: { top: number; bottom: number; left: number; right: number }, labelWidth: number): StickyScaleLayout | null {
  const left = Math.max(viewport.left, clip.left);
  const right = Math.min(viewport.right, clip.right);
  if (scale.top >= clip.top || board.bottom <= clip.top || right <= left || scale.height <= 0 || clip.bottom <= clip.top) return null;
  const top = Math.min(clip.top, board.bottom - scale.height);
  return {
    top, left, width: right - left, height: scale.height,
    datesLeft: scale.left - left, datesWidth: scale.width,
    labelLeft: viewport.left - left, labelWidth,
    clippedTop: Math.max(0, clip.top - top),
  };
}

/** A bounded, non-interactive copy avoids overflow-x:auto trapping CSS sticky.
 * The original header remains in normal layout; all geometry comes from it.
 * Scroll capture also covers the application's nested vertical scroll container.
 */
export function GanttStickyScale({ boardRef, viewportRef, scaleRef, enabled, labelWidth, children }: {
  boardRef: RefObject<HTMLDivElement | null>;
  viewportRef: RefObject<HTMLDivElement | null>;
  scaleRef: RefObject<HTMLDivElement | null>;
  enabled: boolean;
  labelWidth: number;
  children: ReactNode;
}) {
  const [layout, setLayout] = useState<StickyScaleLayout | null>(null);
  useLayoutEffect(() => {
    const board = boardRef.current;
    const viewport = viewportRef.current;
    const scale = scaleRef.current;
    if (!enabled || !board || !viewport || !scale) { setLayout(null); return; }
    let frame: number | null = null;
    let disposed = false;
    const update = () => {
      frame = null;
      if (disposed) return;
      const customTop = Number.parseFloat(getComputedStyle(viewport).getPropertyValue("--gantt-sticky-top")) || 0;
      const clip = { top: Math.max(0, customTop), bottom: window.innerHeight, left: 0, right: document.documentElement.clientWidth };
      for (let parent = viewport.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
        const css = getComputedStyle(parent);
        const rect = parent.getBoundingClientRect();
        if (/auto|scroll|hidden|clip/.test(css.overflowY)) {
          clip.top = Math.max(clip.top, rect.top + parent.clientTop);
          clip.bottom = Math.min(clip.bottom, rect.top + parent.clientTop + parent.clientHeight);
        }
        if (/auto|scroll|hidden|clip/.test(css.overflowX)) {
          clip.left = Math.max(clip.left, rect.left + parent.clientLeft);
          clip.right = Math.min(clip.right, rect.left + parent.clientLeft + parent.clientWidth);
        }
      }
      const rawViewport = viewport.getBoundingClientRect();
      const viewportBox = { top: rawViewport.top, bottom: rawViewport.bottom,
        left: rawViewport.left + viewport.clientLeft, right: rawViewport.left + viewport.clientLeft + viewport.clientWidth,
        width: viewport.clientWidth, height: rawViewport.height } as Box;
      const next = measureStickyScale(board.getBoundingClientRect(), viewportBox, scale.getBoundingClientRect(), clip, labelWidth);
      setLayout((previous) => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
    };
    const schedule = () => { if (frame === null && !disposed) frame = requestAnimationFrame(update); };
    const observer = new ResizeObserver(schedule);
    observer.observe(board); observer.observe(viewport); observer.observe(scale);
    window.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
    window.visualViewport?.addEventListener("resize", schedule);
    update();
    return () => {
      disposed = true;
      if (frame !== null) cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("resize", schedule);
    };
  }, [boardRef, viewportRef, scaleRef, enabled, labelWidth, children]);
  if (!layout || !enabled) return null;
  return createPortal(<div className={styles.stickyOverlay} aria-hidden="true" data-testid="gantt-sticky-scale"
    style={{ top: layout.top, left: layout.left, width: layout.width, height: layout.height, clipPath: `inset(${layout.clippedTop}px 0 0 0)` }}>
    <div className={`${ganttStyles.ganttScale} ${styles.stickyDates}`} data-testid="gantt-sticky-dates"
      style={{ position: "absolute", left: layout.datesLeft, width: layout.datesWidth, height: layout.height }}>{children}</div>
    <div className={styles.stickyLabel} style={{ left: layout.labelLeft, width: layout.labelWidth }}>Этапы проекта</div>
  </div>, document.body);
}
