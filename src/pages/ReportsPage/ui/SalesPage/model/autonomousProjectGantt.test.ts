import { describe, expect, it } from "vitest";
import {
  buildAutonomousProjectGantt,
  formatAutonomousEventTooltip,
  getVisibleAutonomousGanttRows,
  recalculateAutonomousDependencyEvents,
  resolveAutonomousGanttSchedule,
} from "./autonomousProjectGantt";
import type { ProjectGanttEvent, ProjectGanttStage } from "./types";

const today = new Date(2026, 9, 7);
const stage = (id: number, values: Partial<ProjectGanttStage> = {}): ProjectGanttStage => ({
  id, projectId: "24", title: `Stage ${id}`, code: `stage-${id}`, stageType: "development",
  plannedHours: null, groupStatus: "not_started", isGroup: false, parentStageId: null,
  isDefault: false, dependsOnStageId: null, dependencyAnchor: null, durationDays: null,
  sortOrder: id, createdAt: "", updatedAt: "", ...values,
});
const event = (id: number, values: Partial<ProjectGanttEvent> = {}): ProjectGanttEvent => ({
  id, projectId: "24", stageId: id, title: `Event ${id}`, eventKind: "duration",
  planStartDate: null, planEndDate: null, factStartDate: null, factEndDate: null,
  sortOrder: id, createdAt: "", updatedAt: "", ...values,
});
const date = (value: Date | null) => value ? `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}` : null;
const schedule = (stages: ProjectGanttStage[], events: ProjectGanttEvent[]) =>
  resolveAutonomousGanttSchedule(stages, events, today).eventRowsByStageId;

describe("saved autonomous project plans", () => {
  it("keeps RVI's saved September demonstration separate from the August actual dependency", () => {
    const stages = [stage(134), stage(135, { dependsOnStageId: 134, dependencyAnchor: "stage_end" })];
    const events = [event(112, { stageId: 134, planStartDate: "2026-08-10", planEndDate: "2026-08-22", factEndDate: "2026-08-24" }),
      event(113, { stageId: 135, title: "Демонстрация проекта клиенту", eventKind: "one_time", planStartDate: "2026-09-11" })];
    const row = schedule(stages, events).get(135)!;
    expect(date(row.planStart)).toBe("2026-09-11");
    expect(date(row.planEnd)).toBe("2026-09-11");
    expect(date(row.displayDate)).toBe("2026-09-11");
    expect(date(row.forecastStart)).toBe("2026-08-24");
    expect(formatAutonomousEventTooltip(row)).toContain("План: 11.09.2026");
    expect(formatAutonomousEventTooltip(row)).toContain("Прогноз по зависимости: 24.08.2026");
    expect(events[1].planStartDate).toBe("2026-09-11");
  });

  it("does not replace MSK's saved September signing date with today", () => {
    const rows = schedule([stage(1), stage(2, { dependsOnStageId: 1 })], [
      event(1, { planStartDate: "2026-09-01", planEndDate: "2026-09-14" }),
      event(2, { eventKind: "one_time", planStartDate: "2026-09-14" }),
    ]);
    expect(date(rows.get(2)!.planStart)).toBe("2026-09-14");
    expect(date(rows.get(2)!.forecastStart)).toBe("2026-10-07");
  });

  it("preserves both saved boundaries of an aligned dependent duration", () => {
    const row = schedule([stage(1), stage(2, { dependsOnStageId: 1, durationDays: 21 })], [
      event(1, { eventKind: "one_time", planStartDate: "2026-10-04" }),
      event(2, { planStartDate: "2026-10-04", planEndDate: "2026-10-24" }),
    ]).get(2)!;
    expect([date(row.planStart), date(row.planEnd)]).toEqual(["2026-10-04", "2026-10-24"]);
    expect([date(row.forecastStart), date(row.forecastEnd)]).toEqual(["2026-10-07", "2026-10-27"]);
  });

  it("uses an old one-time planEnd-only date as the saved point without rewriting data", () => {
    const events = [event(1, { planStartDate: "2026-08-01", planEndDate: "2026-08-12" }),
      event(2, { eventKind: "one_time", planEndDate: "2026-08-14" })];
    const stages = [stage(1), stage(2, { dependsOnStageId: 1 })];
    const row = schedule(stages, events).get(2)!;
    expect([date(row.planStart), date(row.planEnd), date(row.displayDate)]).toEqual(["2026-08-14", "2026-08-14", "2026-08-14"]);
    expect(recalculateAutonomousDependencyEvents(events, stages, events, stages, today)).toEqual(events);
    expect(events[1].planStartDate).toBeNull();
    expect(events[1].planEndDate).toBe("2026-08-14");
  });

  it("derives a missing plan from the dependency's plan instead of its fact or today's forecast", () => {
    const row = schedule([stage(1), stage(2, { dependsOnStageId: 1, durationDays: 3 })], [
      event(1, { planStartDate: "2026-09-01", planEndDate: "2026-09-10", factEndDate: "2026-09-15" }),
      event(2),
    ]).get(2)!;
    expect([date(row.planStart), date(row.planEnd)]).toEqual(["2026-09-10", "2026-09-12"]);
    expect(date(row.forecastStart)).toBe("2026-09-15");
    expect(row.isPlanDerived).toBe(true);
    expect(formatAutonomousEventTooltip(row)).toContain("План по зависимости: 10.09.2026 — 12.09.2026");
  });

  it("labels a fact-only dependency as a forecast, and leaves an unresolved dependency undated", () => {
    const rows = schedule([stage(1), stage(2, { dependsOnStageId: 1, durationDays: 3 }), stage(3, { dependsOnStageId: 99 })], [
      event(1, { factEndDate: "2026-09-15" }), event(2), event(3),
    ]);
    expect(rows.get(2)!.planStart).toBeNull();
    expect(date(rows.get(2)!.forecastStart)).toBe("2026-09-15");
    expect(formatAutonomousEventTooltip(rows.get(2)!)).toContain("Плановые даты не заданы\nПрогноз по зависимости:");
    expect(rows.get(3)!.displayDate).toBeNull();
  });

  it("builds a collapsed group's period from saved plans rather than forecasts", () => {
    const gantt = buildAutonomousProjectGantt({ today, payments: [],
      stages: [stage(100, { isGroup: true }), stage(1, { parentStageId: 100 }), stage(2, { parentStageId: 100, dependsOnStageId: 1 })],
      events: [event(1, { planStartDate: "2026-08-10", planEndDate: "2026-08-22", factEndDate: "2026-08-24" }),
        event(2, { eventKind: "one_time", planStartDate: "2026-09-11" })],
    });
    const summary = getVisibleAutonomousGanttRows(gantt.rows, new Set())[0].events[0];
    expect([date(summary.planStart), date(summary.planEnd)]).toEqual(["2026-08-10", "2026-09-11"]);
  });
});

describe("deliberate dependency plan updates", () => {
  const stages = [stage(1), stage(2, { dependsOnStageId: 1, durationDays: 3 }), stage(3, { dependsOnStageId: 2 })];
  const events = [event(1, { planStartDate: "2026-09-01", planEndDate: "2026-09-10", factEndDate: "2026-09-15" }),
    event(2, { planStartDate: "2026-09-12", planEndDate: "2026-09-14" }),
    event(3, { eventKind: "one_time", planStartDate: "2026-09-18" })];

  it("does not persist a forecast when hours, statuses or historical facts change", () => {
    const changedStages = stages.map((item) => ({ ...item, plannedHours: 12, groupStatus: "in_progress" as const }));
    const changedEvents = events.map((item) => item.id === 1 ? { ...item, factEndDate: "2026-10-06" } : item);
    expect(recalculateAutonomousDependencyEvents(changedEvents, changedStages, events, stages, today)).toEqual(changedEvents);
  });

  it("moves downstream saved plans by a deliberately changed parent plan while preserving offsets", () => {
    const changed = events.map((item) => item.id === 1 ? { ...item, planEndDate: "2026-09-13" } : item);
    const result = recalculateAutonomousDependencyEvents(changed, stages, events, stages, today);
    expect(result[1]).toMatchObject({ planStartDate: "2026-09-15", planEndDate: "2026-09-17" });
    expect(result[2]).toMatchObject({ planStartDate: "2026-09-21", planEndDate: null });
    expect(result[0].factEndDate).toBe("2026-09-15");
  });

  it("keeps a manually dragged child plan and shifts its dependent point once", () => {
    const changed = events.map((item) => item.id === 2 ? { ...item, planStartDate: "2026-09-16", planEndDate: "2026-09-18" } : item);
    const result = recalculateAutonomousDependencyEvents(changed, stages, events, stages, today);
    expect(result[1]).toMatchObject({ planStartDate: "2026-09-16", planEndDate: "2026-09-18" });
    expect(result[2].planStartDate).toBe("2026-09-22");
  });

  it("initializes a deliberately added dependency and duration from the parent plan", () => {
    const unlinkedStages = stages.map((item) => item.id === 2 ? { ...item, dependsOnStageId: null, durationDays: null } : item);
    const result = recalculateAutonomousDependencyEvents(events, stages, events, unlinkedStages, today);
    expect(result[1]).toMatchObject({ planStartDate: "2026-09-10", planEndDate: "2026-09-12" });
  });

  it("updates only the end boundary after an explicit duration change", () => {
    const changedStages = stages.map((item) => item.id === 2 ? { ...item, durationDays: 5 } : item);
    const result = recalculateAutonomousDependencyEvents(events, changedStages, events, stages, today);
    expect(result[1]).toMatchObject({ planStartDate: "2026-09-12", planEndDate: "2026-09-16" });
    expect(result[2].planStartDate).toBe("2026-09-20");
  });
});
