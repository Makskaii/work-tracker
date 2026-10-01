import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	ProjectCodes,
	ReportCodes,
	ReportStageIds,
	TaskCodes,
} from "@/components/calendar/constants/const";
import { EntityTypeIds } from "@/shared/constants/const";
import { getProjectAutomaticHours } from "./projectHours";
import type { ProfitabilityProject } from "./types";
import {
	fetchProfitabilityProjectDetails,
	useCompanyProjects,
} from "./useCompanyProjects";

const crm = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@/shared/config", () => ({ $api: crm }));
vi.mock("@/shared/config/axios/axios.config", () => ({ $backendApi: {} }));

const project = {
	id: 77,
	projectId: "77",
	title: "Проект клиента",
	[ProjectCodes.company]: 4877,
	tasks: [],
	reports: [],
	payments: [],
} as unknown as ProfitabilityProject;

const page = (items: unknown[], next: number | null = null) => ({
	data: { result: { items }, next },
});

beforeEach(() => vi.resetAllMocks());

describe("selected Bitrix project reports", () => {
	it("keeps correctly linked tasks and reports with missing or stale company values", async () => {
		const tasks = [
			{
				id: "1",
				[TaskCodes.estimateTime]: "5",
				[TaskCodes.hours]: "8",
				[TaskCodes.company]: 4877,
			},
			{
				id: "2",
				[TaskCodes.estimateTime]: "3",
				[TaskCodes.hours]: "4",
				[TaskCodes.company]: null,
			},
		];
		const reports = [
			{ id: "101", [ReportCodes.timeSpent]: "2", [ReportCodes.company]: 4877 },
			{
				id: "102",
				[ReportCodes.timeSpent]: "1,5",
				[ReportCodes.company]: null,
			},
			{ id: "103", [ReportCodes.timeSpent]: "3", [ReportCodes.company]: 9999 },
		];

		crm.get.mockImplementation((_url, { params }) => {
			const field =
				params.entityTypeId === EntityTypeIds.tasks
					? TaskCodes.company
					: ReportCodes.company;
			const source =
				params.entityTypeId === EntityTypeIds.tasks
					? tasks
					: params.entityTypeId === EntityTypeIds.reports
						? reports
						: [];
			return Promise.resolve(
				page(
					field in params.filter
						? source.filter(
								(item) =>
									(item as Record<string, unknown>)[field] ===
									params.filter[field],
							)
						: source,
				),
			);
		});

		const result = await fetchProfitabilityProjectDetails(project);

		expect(result.tasks.map((item) => item.id)).toEqual(["1", "2"]);
		expect(result.reports.map((item) => item.id)).toEqual([
			"101",
			"102",
			"103",
		]);
		expect(getProjectAutomaticHours([result])).toMatchObject({
			developmentFactHours: 6.5,
			developmentPlanHours: 8,
			developmentPurchasedHours: 12,
		});
		expect(
			crm.get.mock.calls.find(
				([, config]) => config.params.entityTypeId === EntityTypeIds.reports,
			)?.[1].params.filter,
		).toEqual({
			[ReportCodes.parentproject]: "77",
			stageId: ReportStageIds.confirmed,
		});
		expect(
			crm.get.mock.calls.find(
				([, config]) => config.params.entityTypeId === EntityTypeIds.tasks,
			)?.[1].params.filter,
		).toEqual({
			[TaskCodes.parentproject]: "77",
		});
	});

	it("loads every report page, without truncating project metrics at fifty reports", async () => {
		const controller = new AbortController();
		crm.get.mockImplementation((_url, { params, signal }) => {
			expect(signal).toBe(controller.signal);
			if (params.entityTypeId !== EntityTypeIds.reports)
				return Promise.resolve(page([]));
			return Promise.resolve(
				params.start === 0
					? page(
							Array.from({ length: 50 }, (_, index) => ({
								id: String(index),
								[ReportCodes.timeSpent]: "1",
							})),
							50,
						)
					: page([{ id: "50", [ReportCodes.timeSpent]: "2.5" }]),
			);
		});

		const result = await fetchProfitabilityProjectDetails(
			project,
			controller.signal,
		);

		expect(result.reports).toHaveLength(51);
		expect(getProjectAutomaticHours([result]).developmentFactHours).toBe(52.5);
	});

	it("rejects a CRM error response instead of turning unavailable reports into zero hours", async () => {
		crm.get.mockImplementation((_url, { params }) =>
			Promise.resolve(
				params.entityTypeId === EntityTypeIds.reports
					? {
							data: {
								error: "ACCESS_DENIED",
								error_description: "Нет доступа к отчётам",
							},
						}
					: page([]),
			),
		);

		await expect(fetchProfitabilityProjectDetails(project)).rejects.toThrow(
			"Нет доступа к отчётам",
		);
	});

	it("rejects an invalid project relation before sending an unscoped CRM request", async () => {
		await expect(
			fetchProfitabilityProjectDetails({ ...project, projectId: "" }),
		).rejects.toThrow("связь");
		expect(crm.get).not.toHaveBeenCalled();
	});
});

describe("Bitrix project catalogue", () => {
	it("exposes loading and errors, then retries without presenting failed requests as an empty catalogue", async () => {
		const logger = vi
			.spyOn(console, "error")
			.mockImplementation(() => undefined);
		crm.get.mockResolvedValueOnce({
			data: { error: "ACCESS_DENIED", error_description: "Проекты недоступны" },
		});
		const { result } = renderHook(useCompanyProjects);

		expect(result.current.isLoadingDetails).toBe(true);
		await waitFor(() =>
			expect(result.current.error).toBe("Проекты недоступны"),
		);
		expect(result.current.isLoadingDetails).toBe(false);

		crm.get.mockImplementation((_url, { params }) =>
			Promise.resolve(
				page(params.entityTypeId === EntityTypeIds.projects ? [project] : []),
			),
		);
		act(() => result.current.reloadProjects());

		await waitFor(() => expect(result.current.projects).toHaveLength(1));
		expect(result.current.error).toBeNull();
		expect(result.current.projects[0].projectId).toBe("77");
		logger.mockRestore();
	});

	it("ignores an older response after retry aborts its request", async () => {
		let finishFirstRequest:
			| ((value: ReturnType<typeof page>) => void)
			| undefined;
		let firstSignal: AbortSignal | undefined;
		crm.get.mockImplementationOnce((_url, { signal }) => {
			firstSignal = signal;
			return new Promise<ReturnType<typeof page>>((resolve) => {
				finishFirstRequest = resolve;
			});
		});
		const { result } = renderHook(useCompanyProjects);
		crm.get.mockImplementation((_url, { params }) =>
			Promise.resolve(
				page(params.entityTypeId === EntityTypeIds.projects ? [project] : []),
			),
		);

		act(() => result.current.reloadProjects());
		await waitFor(() => expect(result.current.projects).toHaveLength(1));
		expect(firstSignal?.aborted).toBe(true);

		await act(async () => {
			finishFirstRequest?.(page([{ ...project, id: 98, projectId: "98" }]));
		});
		expect(result.current.projects[0].projectId).toBe("77");
	});
});
