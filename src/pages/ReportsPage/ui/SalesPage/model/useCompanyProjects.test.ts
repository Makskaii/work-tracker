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
			if (params.entityTypeId === EntityTypeIds.projects) return Promise.resolve(page([project]));
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
		).toEqual([EntityTypeIds.reports, EntityTypeIds.tasks, EntityTypeIds.projects]);
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
			if (params.entityTypeId === EntityTypeIds.projects) return Promise.resolve(page([project]));
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
			if (params.entityTypeId === EntityTypeIds.projects) return Promise.resolve(page([project]));
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
			Promise.resolve(params.entityTypeId === EntityTypeIds.projects ? page([project]) :
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

	it("validates a numeric link with one scoped project read, without loading the project or company catalogue", async () => {
		crm.get.mockImplementation((_url, { params }) => Promise.resolve(page(
			params.entityTypeId === EntityTypeIds.projects ? [project] : [],
		)));
		const result = await fetchProfitabilityProjectDetails({ id: 77, projectId: "77", title: "WT project" });
		expect(result.title).toBe(project.title);
		const projectReads = crm.get.mock.calls.filter(([, config]) => config.params.entityTypeId === EntityTypeIds.projects);
		expect(projectReads).toHaveLength(1);
		expect(projectReads[0][1].params.filter).toEqual({ id: "77" });
		expect(crm.get.mock.calls.some(([, config]) => config.params.entityTypeId === EntityTypeIds.companies)).toBe(false);
	});

	it("rejects a deleted or inaccessible numeric project instead of displaying zero metrics", async () => {
		crm.get.mockResolvedValue(page([]));
		await expect(fetchProfitabilityProjectDetails(project)).rejects.toThrow("не найден или недоступен");
	});

	it("rejects an invalid project relation before sending an unscoped CRM request", async () => {
		await expect(
			fetchProfitabilityProjectDetails({ ...project, projectId: "" }),
		).rejects.toThrow("связь");
		expect(crm.get).not.toHaveBeenCalled();
	});
});

describe("Bitrix project catalogue", () => {
	it("does not start catalogue reads until enabled, and reuses a completed catalogue when reopening a form", async () => {
		crm.get.mockImplementation((_url, { params }) => Promise.resolve(page(
			params.entityTypeId === EntityTypeIds.projects ? [project] : [{ id: 4877, title: "Компания" }],
		)));
		const { result, rerender } = renderHook(({ enabled }) => useCompanyProjects({ enabled }), { initialProps: { enabled: false } });
		expect(crm.get).not.toHaveBeenCalled();
		expect(result.current.isLoadingDetails).toBe(false);
		rerender({ enabled: true });
		await waitFor(() => expect(result.current.projects).toHaveLength(1));
		expect(crm.get).toHaveBeenCalledTimes(2);
		rerender({ enabled: false });
		rerender({ enabled: true });
		expect(crm.get).toHaveBeenCalledTimes(2);
	});
	it("starts project and company reads together instead of waiting for the project catalogue", async () => {
		let finishProjects: ((value: ReturnType<typeof page>) => void) | undefined;
		let finishCompanies: ((value: ReturnType<typeof page>) => void) | undefined;
		crm.get.mockImplementation((_url, { params }) => new Promise<ReturnType<typeof page>>((resolve) => {
			if (params.entityTypeId === EntityTypeIds.projects) finishProjects = resolve;
			else finishCompanies = resolve;
		}));
		const { result } = renderHook(useCompanyProjects);
		expect(crm.get.mock.calls.map(([, config]) => config.params.entityTypeId)).toEqual([
			EntityTypeIds.projects,
			EntityTypeIds.companies,
		]);
		await act(async () => { finishProjects?.(page([project])); });
		expect(result.current.isLoadingDetails).toBe(true);
		await act(async () => { finishCompanies?.(page([{ id: 4877, title: "Компания" }])); });
		expect(result.current.isLoadingDetails).toBe(false);
		expect(result.current.companyTitleById.get("4877")).toBe("Компания");
	});

	it("aborts an unfinished catalogue when the form closes and restarts it when needed again", async () => {
		const pendingSignals: AbortSignal[] = [];
		crm.get.mockImplementation((_url, { signal }) => {
			pendingSignals.push(signal);
			return new Promise(() => undefined);
		});
		const { result, rerender } = renderHook(({ enabled }) => useCompanyProjects({ enabled }), { initialProps: { enabled: true } });
		expect(crm.get).toHaveBeenCalledTimes(2);
		rerender({ enabled: false });
		expect(pendingSignals.every((signal) => signal.aborted)).toBe(true);
		expect(result.current.isLoadingDetails).toBe(false);
		crm.get.mockImplementation((_url, { params }) => Promise.resolve(page(
			params.entityTypeId === EntityTypeIds.projects ? [project] : [{ id: 4877, title: "Компания" }],
		)));
		rerender({ enabled: true });
		await waitFor(() => expect(result.current.projects).toHaveLength(1));
		expect(result.current.isLoadingDetails).toBe(false);
		expect(crm.get).toHaveBeenCalledTimes(4);
	});

	it("keeps loaded projects and companies visible during a refresh and adds the newly created company", async () => {
		crm.get.mockImplementation((_url, { params }) => Promise.resolve(page(
			params.entityTypeId === EntityTypeIds.projects ? [project] : [{ id: 4877, title: "Компания" }],
		)));
		const { result } = renderHook(useCompanyProjects);
		await waitFor(() => expect(result.current.isLoadingDetails).toBe(false));
		const previousProjects = result.current.projects;
		const previousCompanies = result.current.companyTitleById;
		let finishProjects: ((value: ReturnType<typeof page>) => void) | undefined;
		let finishCompanies: ((value: ReturnType<typeof page>) => void) | undefined;
		crm.get.mockImplementation((_url, { params }) => new Promise<ReturnType<typeof page>>((resolve) => {
			if (params.entityTypeId === EntityTypeIds.projects) finishProjects = resolve;
			else finishCompanies = resolve;
		}));
		act(() => result.current.reloadProjects());
		expect(result.current.isRefreshing).toBe(true);
		expect(result.current.isLoadingDetails).toBe(false);
		expect(result.current.projects).toBe(previousProjects);
		expect(result.current.companyTitleById).toBe(previousCompanies);
		const addedProject = { ...project, id: 88, projectId: "88", [ProjectCodes.company]: 22 };
		await act(async () => { finishProjects?.(page([project, addedProject])); });
		expect(result.current.projects).toBe(previousProjects);
		await act(async () => { finishCompanies?.(page([{ id: 4877, title: "Компания" }, { id: 22, title: "Новая компания" }])); });
		expect(result.current.isRefreshing).toBe(false);
		expect(result.current.projects).toHaveLength(2);
		expect(result.current.companyTitleById.get("22")).toBe("Новая компания");
		expect(crm.get.mock.calls.map(([, config]) => config.params.entityTypeId)).toEqual([
			EntityTypeIds.projects, EntityTypeIds.companies, EntityTypeIds.projects, EntityTypeIds.companies,
		]);
	});

	it("retains the last successful catalogue after a failed background refresh and can retry", async () => {
		const logger = vi.spyOn(console, "error").mockImplementation(() => undefined);
		crm.get.mockImplementation((_url, { params }) => Promise.resolve(page(
			params.entityTypeId === EntityTypeIds.projects ? [project] : [{ id: 4877, title: "Компания" }],
		)));
		const { result } = renderHook(useCompanyProjects);
		await waitFor(() => expect(result.current.isLoadingDetails).toBe(false));
		const previousProjects = result.current.projects;
		const previousCompanies = result.current.companyTitleById;
		crm.get.mockImplementation((_url, { params }) => params.entityTypeId === EntityTypeIds.companies
			? Promise.reject(new Error("Не удалось обновить компании"))
			: Promise.resolve(page([project, { ...project, id: 88, projectId: "88" }])));
		act(() => result.current.reloadProjects());
		await waitFor(() => expect(result.current.error).toBe("Не удалось обновить компании"));
		expect(result.current.projects).toBe(previousProjects);
		expect(result.current.companyTitleById).toBe(previousCompanies);
		expect(result.current.isLoadingDetails).toBe(false);
		expect(result.current.isRefreshing).toBe(false);
		crm.get.mockImplementation((_url, { params }) => Promise.resolve(page(
			params.entityTypeId === EntityTypeIds.projects ? [project] : [{ id: 4877, title: "Компания" }],
		)));
		act(() => result.current.reloadProjects());
		await waitFor(() => expect(result.current.isRefreshing).toBe(false));
		expect(result.current.error).toBeNull();
		expect(result.current.projects).toHaveLength(1);
		logger.mockRestore();
	});

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
