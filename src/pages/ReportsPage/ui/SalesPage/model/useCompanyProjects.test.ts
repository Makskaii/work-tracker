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

const crm = vi.hoisted(() => ({ get: vi.fn(), clearCache: vi.fn() }));
vi.mock("@/shared/config", () => ({ $api: crm }));
vi.mock("@/shared/config/axios/axios.config", () => ({ $backendApi: {}, clearBitrixReadCache: crm.clearCache }));

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
	it("loads task/report metrics when the retired CRM payment smart process does not exist", async () => {
		const tasks = [{ id: "1", [TaskCodes.estimateTime]: "8" }];
		const reports = [{ id: "101", [ReportCodes.timeSpent]: "6.5" }];
		crm.get.mockImplementation((_url, { params }) => {
			if (params.entityTypeId === EntityTypeIds.projectPayments) {
				return Promise.reject({
					response: {
						status: 400,
						data: {
							error: "NOT_FOUND",
							error_description: "Смарт-процесс не найден",
						},
					},
				});
			}
			return Promise.resolve(
				page(params.entityTypeId === EntityTypeIds.tasks ? tasks : reports),
			);
		});

		const result = await fetchProfitabilityProjectDetails(project);
		expect(result.tasks).toEqual(tasks);
		expect(result.reports).toEqual(reports);
		expect(getProjectAutomaticHours([result]).developmentFactHours).toBe(6.5);
		expect(
			crm.get.mock.calls.map(([, config]) => config.params.entityTypeId).sort(),
		).toEqual([EntityTypeIds.reports, EntityTypeIds.tasks]);
	});

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
	it("invalidates cached CRM list reads before reloading a newly created project", async () => {
		crm.get.mockImplementation((_url, { params }) => Promise.resolve(page(params.entityTypeId === EntityTypeIds.projects ? [project] : [])));
		const { result } = renderHook(useCompanyProjects);
		await waitFor(() => expect(result.current.projects).toHaveLength(1));
		const initialReadCount = crm.get.mock.calls.length;
		const addedProject = { ...project, id: 88, projectId: "88", title: "Новый проект" };
		crm.get.mockImplementation((_url, { params }) => Promise.resolve(page(params.entityTypeId === EntityTypeIds.projects ? [project, addedProject] : [])));
		act(() => result.current.reloadProjects());
		await waitFor(() => expect(result.current.projects).toHaveLength(2));
		expect(crm.clearCache).toHaveBeenCalledWith(["crm.item.list"]);
		expect(crm.clearCache.mock.invocationCallOrder[0]).toBeLessThan(crm.get.mock.invocationCallOrder[initialReadCount]);
		expect(result.current.projects[1].projectId).toBe("88");
	});
	it("includes companies with no existing projects and loads all company pages", async () => {
		crm.get.mockImplementation((_url, { params }) => {
			if (params.entityTypeId === EntityTypeIds.projects) return Promise.resolve(page([]));
			expect(params.filter).toEqual({});
			return Promise.resolve(params.start === 0
				? page([{ id: 11, title: "Компания с проектом" }], 50)
				: page([{ id: 22, title: "Компания без проектов" }]));
		});
		const { result } = renderHook(useCompanyProjects);
		await waitFor(() => expect(result.current.isLoadingDetails).toBe(false));
		expect(result.current.companyTitleById.get("22")).toBe("Компания без проектов");
		expect(result.current.projects).toEqual([]);
	});
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
