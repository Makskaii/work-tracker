import { beforeEach, describe, expect, it, vi } from "vitest";
import { TaskCodes } from "@/components/calendar/constants/const";
import { Endpoints, EntityTypeIds } from "@/shared/constants/const";
import {
	fetchKanbanData,
	KANBAN_PRIORITY_FIELD,
	KANBAN_REDLINE_FIELD,
} from "./api";

const crm = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@/shared/config/axios/axios.config", () => ({
	$api: crm,
	$backendApi: {},
}));
vi.mock("@/shared/config", () => ({ $api: crm }));

const SPRINT = "DT1072_18:PREPARATION";
const HOLD = "DT1072_18:UC_L2I5S0";
const DONE = "DT1072_18:UC_6JNSDG";
const stages = [
	{ STATUS_ID: DONE, NAME: "Выполнено", SORT: "70", SEMANTICS: null },
	{ STATUS_ID: HOLD, NAME: "Удержание", SORT: "40", SEMANTICS: null },
	{ STATUS_ID: SPRINT, NAME: "Спринт", SORT: "30", SEMANTICS: null },
	{ STATUS_ID: "DT1072_18:SUCCESS", NAME: "Успех", SORT: "90", SEMANTICS: "S" },
];
const response = (result: unknown, next?: number | null) => ({
	data: { result, next },
});
const task = (id: number, values: Record<string, unknown> = {}) => ({
	id,
	title: `Задача ${id}`,
	stageId: SPRINT,
	assignedById: 13,
	[TaskCodes.parentproject]: 77,
	...values,
});

const transport = (tasks: Record<string, unknown>[] = []) => {
	crm.get.mockImplementation((endpoint, { params }) => {
		if (endpoint === Endpoints.status) return Promise.resolve(response(stages));
		if (endpoint === Endpoints.users)
			return Promise.resolve(
				response([
					{
						ID: "13",
						NAME: "Разработчик",
						LAST_NAME: "Один",
						UF_DEPARTMENT: ["23"],
						ACTIVE: "Y",
						PERSONAL_PHOTO: "/photo.jpg",
					},
					{ ID: "22", NAME: "Бывший", UF_DEPARTMENT: [23], ACTIVE: "N" },
					{ ID: "16", NAME: "Аналитик", UF_DEPARTMENT: [25], ACTIVE: true },
				]),
			);
		if (params.entityTypeId === EntityTypeIds.projects)
			return Promise.resolve(
				response({ items: [{ id: 77, title: "ИП Балуев" }] }),
			);
		return Promise.resolve(response({ items: tasks }));
	});
};

beforeEach(() => vi.resetAllMocks());

describe("development kanban CRM source", () => {
	it("uses current ordered stages and only category 18 active tasks without a creation-month restriction", async () => {
		transport([task(1), task(2, { stageId: DONE })]);
		const controller = new AbortController();
		const data = await fetchKanbanData(controller.signal);

		expect(data.stages.map((stage) => stage.id)).toEqual([
			SPRINT,
			HOLD,
			DONE,
			"DT1072_18:SUCCESS",
		]);
		expect(data.stages.find((stage) => stage.id === DONE)?.terminal).toBe(true);
		expect(data.stages.find((stage) => stage.id === HOLD)?.terminal).toBe(
			false,
		);
		expect(data.tasks.map((item) => item.id)).toEqual(["1"]);
		const request = crm.get.mock.calls.find(
			([, config]) => config.params.entityTypeId === EntityTypeIds.tasks,
		)?.[1];
		expect(request.params.filter).toEqual({
			categoryId: 18,
			"@stageId": [SPRINT, HOLD],
		});
		expect(request.params.order).toEqual({ id: "ASC" });
		expect(request.signal).toBe(controller.signal);
		expect(request.params.select).toEqual(
			expect.arrayContaining([
				KANBAN_PRIORITY_FIELD,
				KANBAN_REDLINE_FIELD,
				TaskCodes.parentproject,
			]),
		);
		expect(request.params.filter).not.toHaveProperty(">=createdTime");
		expect(crm.get).not.toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				params: expect.objectContaining({
					entityTypeId: EntityTypeIds.reports,
				}),
			}),
		);
	});

	it("distinguishes zero from missing estimates and priorities and uses the CRM project relation", async () => {
		transport([
			task(1, {
				[KANBAN_PRIORITY_FIELD]: "0",
				[TaskCodes.estimateTime]: "0",
				[TaskCodes.timeSpent]: "2,5",
				[TaskCodes.deadline]: "2026-10-01",
				[KANBAN_REDLINE_FIELD]: "2026-10-02",
			}),
			task(2, {
				[KANBAN_PRIORITY_FIELD]: "",
				[TaskCodes.estimateTime]: null,
				[TaskCodes.parentproject]: 0,
				[TaskCodes.project]: 77,
			}),
			task(3, {
				[KANBAN_PRIORITY_FIELD]: "1,5",
				[TaskCodes.estimateTime]: " 3,75 ",
				[TaskCodes.parentproject]: 999,
			}),
			task(4, {
				[KANBAN_PRIORITY_FIELD]: "invalid",
				[TaskCodes.estimateTime]: "-5",
			}),
		]);
		const data = await fetchKanbanData();
		expect(data.tasks[0]).toMatchObject({
			priority: 0,
			estimateHours: 0,
			spentHours: 2.5,
			projectId: "77",
			projectTitle: "ИП Балуев",
			deadline: "2026-10-01",
			redline: "2026-10-02",
		});
		expect(data.tasks[1]).toMatchObject({
			priority: null,
			estimateHours: null,
			projectId: null,
			projectTitle: "Проект не указан",
		});
		expect(data.tasks[2]).toMatchObject({
			priority: 1.5,
			estimateHours: 3.75,
			projectId: "999",
			projectTitle: "Проект #999",
		});
		expect(data.tasks[3]).toMatchObject({
			priority: null,
			estimateHours: null,
		});
		expect(data.people).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: "13",
					active: true,
					developer: true,
					photo: "/photo.jpg",
				}),
				expect.objectContaining({ id: "22", active: false, developer: true }),
				expect.objectContaining({ id: "16", active: true, developer: false }),
			]),
		);
	});

	it("loads more than fifty tasks and all user/project pages", async () => {
		transport();
		const base = crm.get.getMockImplementation();
		crm.get.mockImplementation((endpoint, config) => {
			const start = config.params.start;
			if (config.params.entityTypeId === EntityTypeIds.tasks)
				return Promise.resolve(
					start === 0
						? response(
								{
									items: Array.from({ length: 50 }, (_, index) =>
										task(index + 1),
									),
								},
								50,
							)
						: response({ items: [task(51)] }),
				);
			if (endpoint === Endpoints.users)
				return Promise.resolve(
					start === 0
						? response(
								[
									{
										ID: "13",
										NAME: "Разработчик",
										ACTIVE: "Y",
										UF_DEPARTMENT: [23],
									},
								],
								50,
							)
						: response([
								{
									ID: "16",
									NAME: "Аналитик",
									ACTIVE: "Y",
									UF_DEPARTMENT: [25],
								},
							]),
				);
			if (config.params.entityTypeId === EntityTypeIds.projects)
				return Promise.resolve(
					start === 0
						? response({ items: [{ id: 77, title: "Первый проект" }] }, 50)
						: response({ items: [{ id: 88, title: "Второй проект" }] }),
				);
			return base?.(endpoint, config);
		});
		const data = await fetchKanbanData();
		expect(data.tasks).toHaveLength(51);
		expect(data.tasks[50].id).toBe("51");
		expect(data.people).toHaveLength(2);
		expect(
			crm.get.mock.calls
				.filter(
					([, config]) => config.params.entityTypeId === EntityTypeIds.tasks,
				)
				.map(([, config]) => config.params.start),
		).toEqual([0, 50]);
	});

	it("resolves only missing assignees outside the development and analytics departments", async () => {
		transport([
			task(1, { assignedById: 99 }),
			task(2, { assignedById: 100 }),
			task(3, { assignedById: 99 }),
			task(4, { assignedById: 101 }),
			task(5, { assignedById: 0 }),
		]);
		const base = crm.get.getMockImplementation();
		crm.get.mockImplementation((endpoint, config) => {
			if (endpoint === Endpoints.users && config.params.filter["@ID"])
				return Promise.resolve(
					config.params.start === 0
						? response(
								[
									{
										ID: "99",
										NAME: "Сотрудник",
										LAST_NAME: "Другого отдела",
										UF_DEPARTMENT: [27],
										ACTIVE: "Y",
										PERSONAL_PHOTO: "/other-department.jpg",
									},
								],
								50,
							)
						: response([
								{
									ID: "100",
									NAME: "Бывший",
									LAST_NAME: "Исполнитель",
									UF_DEPARTMENT: [27],
									ACTIVE: "N",
								},
							]),
				);
			return base?.(endpoint, config);
		});
		const controller = new AbortController();
		const data = await fetchKanbanData(controller.signal);
		expect(data.people).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: "99",
					name: "Сотрудник Другого отдела",
					developer: false,
					active: true,
					photo: "/other-department.jpg",
				}),
				expect.objectContaining({
					id: "100",
					name: "Бывший Исполнитель",
					developer: false,
					active: false,
				}),
			]),
		);
		expect(data.people).toHaveLength(5);
		expect(data.people.some((person) => person.id === "101")).toBe(false);
		expect(data.tasks.find((item) => item.id === "4")?.assigneeId).toBe("101");
		const userRequests = crm.get.mock.calls
			.filter(([endpoint]) => endpoint === Endpoints.users)
			.map(([, config]) => config);
		expect(userRequests.map((config) => config.params.filter)).toEqual([
			{ "@UF_DEPARTMENT": [23, 25] },
			{ "@ID": ["99", "100", "101"] },
			{ "@ID": ["99", "100", "101"] },
		]);
		expect(userRequests.slice(1).map((config) => config.params.start)).toEqual([
			0, 50,
		]);
		expect(
			userRequests.every((config) => config.signal === controller.signal),
		).toBe(true);
	});

	it.each([
		Endpoints.status,
		Endpoints.users,
		Endpoints.crmItems,
	])("rejects HTTP 200 CRM errors from %s instead of reporting an empty board", async (failedEndpoint) => {
		transport();
		const base = crm.get.getMockImplementation();
		crm.get.mockImplementation((endpoint, config) =>
			endpoint === failedEndpoint &&
			(endpoint !== Endpoints.crmItems ||
				config.params.entityTypeId === EntityTypeIds.tasks)
				? Promise.resolve({
						data: { error: "ACCESS_DENIED", error_description: "Нет доступа" },
					})
				: base?.(endpoint, config),
		);
		await expect(fetchKanbanData()).rejects.toThrow("Нет доступа");
	});

	it("rejects a nonadvancing task cursor", async () => {
		transport();
		const base = crm.get.getMockImplementation();
		crm.get.mockImplementation((endpoint, config) =>
			config.params.entityTypeId === EntityTypeIds.tasks
				? Promise.resolve(response({ items: [task(1)] }, 0))
				: base?.(endpoint, config),
		);
		await expect(fetchKanbanData()).rejects.toThrow("страницу");
	});

	it("does not issue an unscoped task query if stage metadata is missing", async () => {
		transport();
		const base = crm.get.getMockImplementation();
		crm.get.mockImplementation((endpoint, config) =>
			endpoint === Endpoints.status
				? Promise.resolve(response([]))
				: base?.(endpoint, config),
		);
		await expect(fetchKanbanData()).rejects.toThrow("стадии");
		expect(
			crm.get.mock.calls.some(
				([, config]) => config.params.entityTypeId === EntityTypeIds.tasks,
			),
		).toBe(false);
	});
});
