import type { ProjectGanttStage } from "./types";

export type GanttProgressCategory = "tz" | "development" | "education" | "other";
export const GANTT_CATEGORY_LABELS: Record<GanttProgressCategory, string> = {
  tz: "ТЗ", development: "Разработка", education: "Обучение / Сдача", other: "Прочие работы",
};
export const GANTT_CATEGORY_ORDER: GanttProgressCategory[] = ["tz", "development", "education", "other"];

export function stageCategory(stage: Pick<ProjectGanttStage, "stageType">): GanttProgressCategory {
  switch (stage.stageType) {
    case "tz_writing": case "tz_signing": return "tz";
    case "development": return "development";
    case "education": case "delivery": return "education";
    default: return "other";
  }
}
export const isWorkStage = (stage: ProjectGanttStage) => stage.code !== "payments" && stage.stageType !== "payments";
const cents = (value: number | null | undefined): number | null =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.round(value * 100) : null;
const hours = (value: number | null) => value === null ? null : value / 100;
export const formatGanttHours = (value: number | null) => value === null
  ? "Не заданы" : `${value.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} ч`;

export function parseGanttHours(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return null;
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized) || Number(normalized) > 1000000) {
    throw new Error("Плановые часы: от 0 до 1000000, не более двух знаков после запятой");
  }
  return Number(normalized);
}

export type GanttStagePlanning = {
  stage: ProjectGanttStage;
  category: GanttProgressCategory;
  plannedHours: number | null;
  completedHours: number;
  progress: number;
  derivedFromChildren: boolean;
  childHours: number;
  unallocatedToChildren: number;
  overallocatedToChildren: number;
  missingEstimates: number;
  childCount: number;
  openChildren: number;
  needsParentClosure: boolean;
};

/** Estimates express the size of completed work, never time actually spent. */
export function getGanttStagePlanning(stage: ProjectGanttStage, stages: ProjectGanttStage[]): GanttStagePlanning {
  const children = stages.filter((item) => isWorkStage(item) && item.parentStageId === stage.id && item.projectId === stage.projectId);
  const parent = stages.find((item) => item.id === stage.parentStageId && item.isGroup && item.projectId === stage.projectId);
  const childHours = children.reduce((sum, item) => sum + (cents(item.plannedHours) ?? 0), 0);
  const ownHours = cents(stage.plannedHours);
  const estimatedChildren = children.filter((item) => cents(item.plannedHours) !== null);
  const budget = ownHours ?? (estimatedChildren.length ? childHours : null);
  const complete = stage.groupStatus === "completed";
  const completedChildren = children.filter((item) => item.groupStatus === "completed");
  const completedChildHours = completedChildren.reduce((sum, item) => sum + (cents(item.plannedHours) ?? 0), 0);
  const credit = complete ? (budget ?? 0) : Math.min(budget ?? 0, completedChildHours);
  return {
    stage, category: stageCategory(parent ?? stage), plannedHours: hours(budget),
    completedHours: credit / 100,
    progress: complete ? 100 : budget && budget > 0 ? credit / budget * 100 : 0,
    derivedFromChildren: ownHours === null && estimatedChildren.length > 0,
    childHours: childHours / 100,
    unallocatedToChildren: children.length ? Math.max(0, (budget ?? 0) - childHours) / 100 : 0,
    overallocatedToChildren: budget !== null ? Math.max(0, childHours - budget) / 100 : 0,
    missingEstimates: children.length ? children.length - estimatedChildren.length : budget === null ? 1 : 0,
    childCount: children.length, openChildren: children.length - completedChildren.length,
    needsParentClosure: children.length > 0 && completedChildren.length === children.length && !complete,
  };
}

export type GanttPlanningTotal = {
  plannedHours: number | null;
  completedHours: number;
  remainingHours: number | null;
  progress: number | null;
  missingEstimates: number;
  roots: GanttStagePlanning[];
};
function total(roots: GanttStagePlanning[]): GanttPlanningTotal {
  const estimated = roots.filter((item) => item.plannedHours !== null);
  const budget = estimated.reduce((sum, item) => sum + (cents(item.plannedHours) ?? 0), 0);
  const credit = estimated.reduce((sum, item) => sum + (cents(item.completedHours) ?? 0), 0);
  return {
    plannedHours: estimated.length ? budget / 100 : null,
    completedHours: credit / 100,
    remainingHours: estimated.length ? Math.max(0, budget - credit) / 100 : null,
    progress: budget > 0 ? Math.min(100, credit / budget * 100) : null,
    missingEstimates: roots.reduce((sum, item) => sum + item.missingEstimates, 0), roots,
  };
}

export function buildGanttPlanning(stages: ProjectGanttStage[]) {
  const unique = [...new Map(stages.filter(isWorkStage).map((stage) => [stage.id, stage])).values()];
  const groups = new Map(unique.filter((stage) => stage.isGroup).map((stage) => [stage.id, stage]));
  // Root budgets are counted once. Child budgets are allocations inside the parent.
  const roots = unique.filter((stage) => {
    const parent = stage.parentStageId === null ? undefined : groups.get(stage.parentStageId);
    return !parent || parent.projectId !== stage.projectId;
  }).map((stage) => getGanttStagePlanning(stage, unique));
  return {
    overall: total(roots),
    categories: GANTT_CATEGORY_ORDER.map((category) => ({ category, ...total(roots.filter((item) => item.category === category)) })),
  };
}

export const needsStageCompletionConfirmation = (stageId: number | null, status: string, stages: ProjectGanttStage[]) =>
  status === "completed" && stageId !== null &&
  stages.find((stage) => stage.id === stageId)?.groupStatus !== "completed" &&
  stages.some((stage) => stage.parentStageId === stageId && stage.groupStatus !== "completed");
