import { describe, expect, it } from "vitest";
import { buildGanttPlanning, getGanttStagePlanning, needsStageCompletionConfirmation, parseGanttHours } from "./ganttPlanning";
import { measureStickyScale } from "../components/GanttStickyScale";
import type { ProjectGanttStage } from "./types";
const stage = (id: number, values: Partial<ProjectGanttStage> = {}): ProjectGanttStage => ({
  id, projectId: "31", code: `stage-${id}`, title: `Stage ${id}`, stageType: "development", plannedHours: null,
  isGroup: false, parentStageId: null, groupStatus: "not_started", dependsOnStageId: null, dependencyAnchor: null,
  durationDays: null, sortOrder: id, isDefault: false, createdAt: "", updatedAt: "", ...values,
});
const example = () => [stage(1, { isGroup: true, plannedHours: 80, groupStatus: "in_progress" }),
  stage(2, { parentStageId: 1, plannedHours: 20, groupStatus: "completed" }),
  stage(3, { parentStageId: 1, plannedHours: 60, groupStatus: "in_progress" })];

describe("manual Gantt planning", () => {
  it("counts the parent budget only once and weights completed children", () => {
    expect(buildGanttPlanning(example()).overall).toMatchObject({ plannedHours: 80, completedHours: 20, progress: 25, remainingHours: 60 });
  });
  it("does not turn in-progress into 50 percent", () => {
    expect(buildGanttPlanning([stage(1, { plannedHours: 80, groupStatus: "in_progress" })]).overall.progress).toBe(0);
  });
  it("lets manual parent completion override incomplete children without changing their statuses", () => {
    const values = example(); values[0].groupStatus = "completed";
    expect(buildGanttPlanning(values).overall.progress).toBe(100);
    expect(values[2].groupStatus).toBe("in_progress");
    expect(getGanttStagePlanning(values[0], values).openChildren).toBe(1);
  });
  it("does not automatically close a parent when all children are done", () => {
    const values = example(); values[2].groupStatus = "completed";
    expect(getGanttStagePlanning(values[0], values)).toMatchObject({ progress: 100, needsParentClosure: true });
    expect(values[0].groupStatus).toBe("in_progress");
  });
  it("derives an unspecified parent estimate from its children, without double counting", () => {
    const values = example(); values[0].plannedHours = null;
    expect(buildGanttPlanning(values).overall).toMatchObject({ plannedHours: 80, progress: 25 });
    expect(getGanttStagePlanning(values[0], values).derivedFromChildren).toBe(true);
  });
  it("reports budget not allocated to substages", () => {
    const values = example(); values[0].plannedHours = 100;
    expect(getGanttStagePlanning(values[0], values)).toMatchObject({ unallocatedToChildren: 20, progress: 20 });
  });
  it("warns about overallocated estimates and never exceeds 100 percent", () => {
    const values = example(); values[0].plannedHours = 10;
    expect(getGanttStagePlanning(values[0], values)).toMatchObject({ overallocatedToChildren: 70, progress: 100 });
  });
  it("does not silently turn missing estimates into zero-hour work", () => {
    expect(buildGanttPlanning([stage(1)]).overall).toMatchObject({ plannedHours: null, progress: null, missingEstimates: 1 });
    expect(buildGanttPlanning([stage(1, { plannedHours: 0 })]).overall).toMatchObject({ plannedHours: 0, progress: null, missingEstimates: 0 });
  });
  it("flags partially estimated work instead of claiming a complete plan", () => {
    const values = example(); values[2].plannedHours = null;
    expect(buildGanttPlanning(values).overall).toMatchObject({ plannedHours: 80, progress: 25, missingEstimates: 1 });
  });
  it("inherits the parent's category regardless of a substage's type/title", () => {
    const values = example(); values[1].stageType = "tz_writing"; values[0].title = "Anything";
    expect(getGanttStagePlanning(values[1], values).category).toBe("development");
    expect(buildGanttPlanning(values).categories.find((value) => value.category === "tz")?.plannedHours).toBeNull();
  });
  it("keeps categories of stages inside an unclassified legacy group", () => {
    const values = [stage(1, { isGroup: true, stageType: null }),
      stage(2, { parentStageId: 1, stageType: "tz_writing", plannedHours: 20, groupStatus: "completed" }),
      stage(3, { parentStageId: 1, stageType: "development", plannedHours: 60 })];
    const result = buildGanttPlanning(values);
    expect(result.overall).toMatchObject({ plannedHours: 80, completedHours: 20, progress: 25 });
    expect(result.categories.find((value) => value.category === "tz")).toMatchObject({ plannedHours: 20, completedHours: 20, progress: 100 });
    expect(result.categories.find((value) => value.category === "development")).toMatchObject({ plannedHours: 60, completedHours: 0, progress: 0 });
    expect(result.categories.find((value) => value.category === "other")?.roots).toEqual([]);
    expect(getGanttStagePlanning(values[1], values).category).toBe("tz");
  });
  it("applies manual completion of an unclassified parent consistently to category totals", () => {
    const values = [stage(1, { isGroup: true, stageType: null, groupStatus: "completed" }),
      stage(2, { parentStageId: 1, stageType: "tz_writing", plannedHours: 20 }),
      stage(3, { parentStageId: 1, stageType: "development", plannedHours: 60 })];
    const result = buildGanttPlanning(values);
    expect(result.overall.completedHours).toBe(80);
    expect(result.categories.reduce((sum, value) => sum + value.completedHours, 0)).toBe(80);
    expect(values[1].groupStatus).toBe("not_started");
  });
  it("does not invent a category split for an unclassified parent's explicit budget", () => {
    const values = [stage(1, { isGroup: true, stageType: null, plannedHours: 100 }),
      stage(2, { parentStageId: 1, stageType: "tz_writing", plannedHours: 20, groupStatus: "completed" }),
      stage(3, { parentStageId: 1, stageType: "development", plannedHours: 60 })];
    const result = buildGanttPlanning(values);
    expect(result.overall).toMatchObject({ plannedHours: 100, completedHours: 20, progress: 20 });
    expect(result.categories.find((value) => value.category === "other")).toMatchObject({ plannedHours: 100, completedHours: 20 });
    expect(result.categories.find((value) => value.category === "tz")?.plannedHours).toBeNull();
  });
  it("handles multiple stages in one category with hour weights, not mean percentages", () => {
    const summary = buildGanttPlanning([stage(1, { plannedHours: 10, groupStatus: "completed" }), stage(2, { plannedHours: 90 })]);
    expect(summary.overall.progress).toBe(10);
  });
  it("excludes payments and retains uncategorized work in Other", () => {
    const result = buildGanttPlanning([stage(1, { code: "payments", plannedHours: 1000 }), stage(2, { stageType: "contracting", plannedHours: 3 })]);
    expect(result.overall.plannedHours).toBe(3);
    expect(result.categories.find((value) => value.category === "other")?.plannedHours).toBe(3);
  });
  it("preserves fractional hours without floating point accumulation", () => {
    const values = [stage(1, { isGroup: true }), stage(2, { parentStageId: 1, plannedHours: 0.1, groupStatus: "completed" }), stage(3, { parentStageId: 1, plannedHours: 0.2 })];
    expect(buildGanttPlanning(values).overall.plannedHours).toBe(0.3);
  });
  it("requires confirmation only when newly closing a parent with open children", () => {
    expect(needsStageCompletionConfirmation(1, "completed", example())).toBe(true);
    expect(needsStageCompletionConfirmation(2, "completed", example())).toBe(false);
    expect(needsStageCompletionConfirmation(1, "in_progress", example())).toBe(false);
  });
  it.each([["", null], ["  ", null], ["0", 0], ["5,25", 5.25], ["12.5", 12.5]])("parses %p as %p", (input, expected) => expect(parseGanttHours(String(input))).toBe(expected));
  it.each(["-1", "1.001", "Infinity", "5 hours", "1e6", "1000001"])("rejects invalid input %p", (value) => expect(() => parseGanttHours(value)).toThrow());
});

const box = (top: number, bottom: number, left = 40, right = 1040) => ({ top, bottom, left, right, width: right-left, height: bottom-top });
describe("bounded sticky Gantt calendar geometry", () => {
  const clip = { top: 60, bottom: 900, left: 0, right: 1200 };
  it("does not pin before the Gantt reaches the scrollport top", () => expect(measureStickyScale(box(100, 900), box(100, 900), box(100, 154, 320, 1800), clip, 280)).toBeNull());
  it("pins at the nested scrollport offset", () => expect(measureStickyScale(box(-200, 900), box(-200, 900), box(-200, -146, 320, 1800), clip, 280)?.top).toBe(60));
  it("tracks the actual date scale when scrolled horizontally", () => expect(measureStickyScale(box(-200, 900), box(-200, 900), box(-200, -146, 120, 1600), clip, 280)).toMatchObject({ datesLeft: 80, datesWidth: 1480 }));
  it("slides out with the last Gantt row rather than covering the next section", () => expect(measureStickyScale(box(-200, 90), box(-200, 90), box(-200, -146, 320, 1800), clip, 280)).toMatchObject({ top: 36, clippedTop: 24 }));
  it("disappears completely after the Gantt", () => expect(measureStickyScale(box(-200, 59), box(-200, 59), box(-200, -146, 320, 1800), clip, 280)).toBeNull());
});
