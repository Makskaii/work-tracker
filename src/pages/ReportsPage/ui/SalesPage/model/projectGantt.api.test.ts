import { beforeEach, describe, expect, it, vi } from "vitest";
import { createProjectGanttEvent, createProjectGanttStage, fetchProjectGanttEvents, fetchProjectGanttStages, moveProjectGanttStageParent, updateProjectGanttEvent, updateProjectGanttStage } from "./projectGantt.api";
import { createAutonomousProjectPayment, fetchAutonomousProjectPayments, updateAutonomousProjectPayment } from "./projectPayments.api";
import { type GanttEventResponse, type GanttPaymentResponse, type GanttStageResponse, normalizeGanttStage } from "./projectGanttResponses";
import { buildGanttPlanning } from "./ganttPlanning";

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn() }));
vi.mock("@/shared/config/axios/axios.config", () => ({ $backendApi: api }));

const stage: GanttStageResponse = {
	id: "2", projectId: "31", parentStageId: "1", dependsOnStageId: "3", title: "Implementation", code: "development-2",
	stageType: "development", groupStatus: "completed", plannedHours: 20, isGroup: false, isDefault: false,
	dependencyAnchor: "stage_end", durationDays: 3, sortOrder: 2, createdAt: "", updatedAt: "",
};
const event: GanttEventResponse = {
	id: "10", projectId: "31", stageId: "2", title: "Implementation", eventKind: "duration",
	planStartDate: "2026-09-01", planEndDate: "2026-09-03", factStartDate: null, factEndDate: null,
	sortOrder: 0, createdAt: "", updatedAt: "",
};
const payment: GanttPaymentResponse = {
	id: "8", projectId: "31", stageId: "2", status: "todo", paymentAnchor: null, paymentDate: null,
	percent: 20, amount: 1000, waitingDays: null, sortOrder: 0, createdAt: "", updatedAt: "",
};

beforeEach(() => vi.resetAllMocks());

describe("Gantt API identifiers", () => {
	it("joins mixed numeric and string IDs, preserving child hour weights", async () => {
		api.get.mockResolvedValue({ data: [
			{ ...stage, id: "1", isGroup: true, parentStageId: null, dependsOnStageId: null, plannedHours: 80, groupStatus: "in_progress" },
			{ ...stage, parentStageId: 1 },
		] });
		const stages = await fetchProjectGanttStages("31");
		expect(stages[1]).toMatchObject({ id: 2, parentStageId: 1, dependsOnStageId: 3, projectId: "31" });
		expect(buildGanttPlanning(stages).overall).toMatchObject({ plannedHours: 80, completedHours: 20, progress: 25 });
		expect(stages.find((item) => item.id === Number("2"))?.title).toBe("Implementation");
	});
	it("normalizes stage create, update and move responses as well as initial reads", async () => {
		api.post.mockResolvedValue({ data: stage });
		api.patch.mockResolvedValueOnce({ data: stage }).mockResolvedValueOnce({ data: [stage] });
		expect((await createProjectGanttStage("31", { title: "Implementation" })).id).toBe(2);
		expect((await updateProjectGanttStage(2, { plannedHours: 30 })).id).toBe(2);
		expect((await moveProjectGanttStageParent(2, 1, null))[0].parentStageId).toBe(1);
	});
	it("normalizes event IDs for form selection and date updates", async () => {
		api.get.mockResolvedValue({ data: [event] });
		api.post.mockResolvedValue({ data: event });
		api.patch.mockResolvedValue({ data: event });
		expect((await fetchProjectGanttEvents("31"))[0]).toMatchObject({ id: 10, stageId: 2 });
		expect(await createProjectGanttEvent("31", { stageId: 2, title: "Implementation", eventKind: "duration" })).toMatchObject({ id: 10, stageId: 2 });
		expect(await updateProjectGanttEvent(10, { title: "Renamed" })).toMatchObject({ id: 10, stageId: 2 });
	});
	it("keeps payment links compatible with the normalized stage IDs", async () => {
		api.get.mockResolvedValue({ data: [payment] });
		api.post.mockResolvedValue({ data: payment });
		api.patch.mockResolvedValue({ data: payment });
		expect((await fetchAutonomousProjectPayments("31"))[0]).toMatchObject({ id: 8, stageId: 2 });
		expect(await createAutonomousProjectPayment("31", { stageId: 2, status: "todo" })).toMatchObject({ id: 8, stageId: 2 });
		expect(await updateAutonomousProjectPayment(8, { amount: 500 })).toMatchObject({ id: 8, stageId: 2 });
	});
	it.each(["", "invalid", "9007199254740993", 0, 1.5])("rejects malformed or imprecise IDs: %s", (id) => {
		expect(() => normalizeGanttStage({ ...stage, id })).toThrow("идентификатор");
	});
});
