import type { AutonomousProjectPayment, ProjectGanttEvent, ProjectGanttStage } from "./types";

type ApiId = number | string;

export type GanttStageResponse = Omit<ProjectGanttStage, "id" | "projectId" | "parentStageId" | "dependsOnStageId"> & {
	id: ApiId;
	projectId: ApiId;
	parentStageId: ApiId | null;
	dependsOnStageId: ApiId | null;
};
export type GanttEventResponse = Omit<ProjectGanttEvent, "id" | "projectId" | "stageId"> & {
	id: ApiId;
	projectId: ApiId;
	stageId: ApiId;
};
export type GanttPaymentResponse = Omit<AutonomousProjectPayment, "id" | "projectId" | "stageId"> & {
	id: ApiId;
	projectId: ApiId;
	stageId: ApiId;
};

// MySQL BIGINT identifiers arrive as strings. Form selects and drag targets use
// numeric identifiers, so every Gantt response must use the same representation.
function numericId(value: ApiId): number {
	const id = typeof value === "number" || typeof value === "string" && /^\d+$/.test(value)
		? Number(value) : NaN;
	if (!Number.isSafeInteger(id) || id <= 0) throw new Error("Сервер вернул некорректный идентификатор элемента Ганта");
	return id;
}

export function normalizeGanttStage(stage: GanttStageResponse): ProjectGanttStage {
	return {
		...stage, id: numericId(stage.id), projectId: String(stage.projectId),
		parentStageId: stage.parentStageId === null ? null : numericId(stage.parentStageId),
		dependsOnStageId: stage.dependsOnStageId === null ? null : numericId(stage.dependsOnStageId),
	};
}

export function normalizeGanttEvent(event: GanttEventResponse): ProjectGanttEvent {
	return { ...event, id: numericId(event.id), projectId: String(event.projectId), stageId: numericId(event.stageId) };
}

export function normalizeGanttPayment(payment: GanttPaymentResponse): AutonomousProjectPayment {
	return { ...payment, id: numericId(payment.id), projectId: String(payment.projectId), stageId: numericId(payment.stageId) };
}
