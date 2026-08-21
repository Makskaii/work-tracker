import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	ActivityType,
	ReportCodes,
	TaskCodes,
} from "@/components/calendar/constants/const";
import { $api } from "@/shared/config";
import { TaskStageIds } from "@/shared/constants/const";
import { getDevelopmentReportData } from "./getDevelopmentReportData";

vi.mock("@/shared/config", () => ({
	$api: {
		get: vi.fn(),
	},
}));

const crmPage = <T,>(items: T[], next: number | null = null) => ({
	data: {
		result: { items },
		next,
	},
});

describe("getDevelopmentReportData", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("загружает только DEV-когорту, все стадии отчётов и дедуплицирует две связи", async () => {
		const firstTask = {
			id: "1",
			title: "Задача 1",
			assignedById: 10,
			movedTime: "2026-08-10T10:00:00+03:00",
			stageId: TaskStageIds.done,
			[TaskCodes.estimateTime]: "10",
			[TaskCodes.hours]: 12,
			[TaskCodes.project]: "100",
			[TaskCodes.parentproject]: "100",
		};
		const secondTask = { ...firstTask, id: "2", title: "Задача 2" };
		const pendingReport = {
			id: "501",
			assignedById: 10,
			stageId: "DT1060_15:NEW",
			[ReportCodes.timeSpent]: "2",
			[ReportCodes.activityType]: ActivityType.development,
			[ReportCodes.taskId]: "1",
			[ReportCodes.parentId]: 1,
		};
		const mockedGet = vi.mocked($api.get);

		mockedGet
			.mockResolvedValueOnce(crmPage([firstTask], 50) as never)
			.mockResolvedValueOnce(crmPage([secondTask]) as never)
			.mockResolvedValueOnce(crmPage([pendingReport]) as never)
			.mockResolvedValueOnce(crmPage([pendingReport]) as never);

		const result = await getDevelopmentReportData({
			periodStart: "2026-08-01T00:00:00+03:00",
			periodEnd: "2026-09-01T00:00:00+03:00",
			developerIds: ["10", "11"],
		});

		expect(result.tasks.map((task) => task.id)).toEqual(["1", "2"]);
		expect(result.reports).toHaveLength(1);
		expect(result.reports[0]?.stageId).toBe("DT1060_15:NEW");
		expect(mockedGet).toHaveBeenCalledTimes(4);

		const firstTaskRequest = mockedGet.mock.calls[0]?.[1];
		const secondTaskRequest = mockedGet.mock.calls[1]?.[1];
		const parentReportRequest = mockedGet.mock.calls[2]?.[1];
		const legacyReportRequest = mockedGet.mock.calls[3]?.[1];

		expect(firstTaskRequest?.params).toEqual(
			expect.objectContaining({
				start: 0,
				filter: {
					"@assignedById": ["10", "11"],
					stageId: TaskStageIds.done,
					">=movedTime": "2026-08-01T00:00:00+03:00",
					"<movedTime": "2026-09-01T00:00:00+03:00",
				},
			}),
		);
		expect(secondTaskRequest?.params?.start).toBe(50);
		expect(firstTaskRequest?.params?.select).not.toContain(TaskCodes.description);
		expect(firstTaskRequest?.params?.select).not.toContain(TaskCodes.comment);

		for (const reportRequest of [parentReportRequest, legacyReportRequest]) {
			expect(reportRequest?.params?.filter).toEqual(
				expect.objectContaining({
					[ReportCodes.activityType]: ActivityType.development,
				}),
			);
			expect(reportRequest?.params?.filter).not.toHaveProperty("stageId");
		}

		expect(parentReportRequest?.params?.filter).toHaveProperty(
			`@${ReportCodes.parentId}`,
			["1", "2"],
		);
		expect(legacyReportRequest?.params?.filter).toHaveProperty(
			`@${ReportCodes.taskId}`,
			["1", "2"],
		);
	});
});
