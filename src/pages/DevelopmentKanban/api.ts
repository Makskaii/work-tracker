import { TaskCodes } from "@/components/calendar/constants/const";
import { fetchAllCrmItems } from "@/pages/ReportsPage/ui/SalesPage/model/api";
import { $api } from "@/shared/config/axios/axios.config";
import {
	DEPARTMENT_IDS,
	Endpoints,
	EntityTypeIds,
} from "@/shared/constants/const";
import type { KanbanPerson, KanbanStage, KanbanTask } from "./model";

export const KANBAN_PRIORITY_FIELD = "ufCrm14_1775632097214";
export const KANBAN_REDLINE_FIELD = "ufCrm14_1778663165471";

export type KanbanData = {
	stages: KanbanStage[];
	tasks: KanbanTask[];
	people: KanbanPerson[];
};

type CrmRecord = Record<string, unknown>;
type BitrixPage = {
	result?: unknown;
	error?: string;
	error_description?: string;
	next?: unknown;
};

const TERMINAL_STAGE_IDS = new Set([
	"DT1072_18:UC_6JNSDG",
	"DT1072_18:UC_JP9WR1",
	"DT1072_18:SUCCESS",
	"DT1072_18:FAIL",
]);

const TASK_FIELDS = [
	"id",
	"title",
	"assignedById",
	"stageId",
	KANBAN_PRIORITY_FIELD,
	KANBAN_REDLINE_FIELD,
	TaskCodes.estimateTime,
	TaskCodes.timeSpent,
	TaskCodes.deadline,
	TaskCodes.parentproject,
] as const;

const idOf = (value: unknown): string | null => {
	const id = String(value ?? "").trim();
	return /^\d+$/.test(id) && Number(id) > 0 ? id : null;
};

const textOf = (value: unknown) => String(value ?? "").trim();

const numberOrNull = (value: unknown): number | null => {
	if (typeof value !== "string" && typeof value !== "number") return null;
	const text = String(value).trim().replace(/\s/g, "").replace(",", ".");
	if (!text || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) return null;
	const result = Number(text);
	return Number.isFinite(result) ? result : null;
};

const hoursOrNull = (value: unknown) => {
	const result = numberOrNull(value);
	return result !== null && result >= 0 ? result : null;
};

const getPageRecords = (
	data: BitrixPage,
	nestedItems: boolean,
): CrmRecord[] => {
	const result = data.result;
	const items = nestedItems
		? result && typeof result === "object" && "items" in result
			? result.items
			: null
		: result;
	if (data.error || !Array.isArray(items)) {
		throw new Error(
			data.error_description ||
				data.error ||
				"Не удалось получить данные из Битрикс24",
		);
	}
	if (
		items.some(
			(item) => !item || typeof item !== "object" || Array.isArray(item),
		)
	) {
		throw new Error("Битрикс24 вернул некорректный список данных");
	}
	return items as CrmRecord[];
};

const fetchPages = async (
	endpoint: string,
	params: Record<string, unknown>,
	nestedItems: boolean,
	signal?: AbortSignal,
): Promise<CrmRecord[]> => {
	const records: CrmRecord[] = [];
	let start = 0;
	while (true) {
		const response = await $api.get<BitrixPage>(endpoint, {
			params: { ...params, start },
			signal,
		});
		records.push(...getPageRecords(response.data, nestedItems));
		const next = response.data.next;
		if (next === null || next === undefined) return records;
		if (typeof next !== "number" || !Number.isFinite(next) || next <= start) {
			throw new Error("Битрикс24 вернул некорректную страницу данных");
		}
		start = next;
	}
};

const fetchStages = async (signal?: AbortSignal): Promise<KanbanStage[]> => {
	const records = await fetchPages(
		Endpoints.status,
		{
			filter: { ENTITY_ID: "DYNAMIC_1072_STAGE_18" },
			order: { SORT: "ASC" },
		},
		false,
		signal,
	);
	const stages = records.map((stage) => {
		const id = textOf(stage.STATUS_ID);
		if (!id || !textOf(stage.NAME))
			throw new Error("Не удалось прочитать стадии задач Битрикс24");
		return {
			id,
			name: textOf(stage.NAME),
			sort: numberOrNull(stage.SORT) ?? 0,
			color: textOf(stage.COLOR) || undefined,
			terminal:
				TERMINAL_STAGE_IDS.has(id) ||
				["S", "F"].includes(textOf(stage.SEMANTICS).toUpperCase()),
		};
	});
	if (!stages.length) throw new Error("Не найдены стадии задач Битрикс24");
	return Array.from(
		new Map(stages.map((stage) => [stage.id, stage])).values(),
	).sort(
		(left, right) => left.sort - right.sort || left.id.localeCompare(right.id),
	);
};

const fetchPeople = async (
	filter: Record<string, unknown>,
	signal?: AbortSignal,
): Promise<KanbanPerson[]> => {
	const records = await fetchPages(
		Endpoints.users,
		{
			filter,
			select: [
				"ID",
				"NAME",
				"LAST_NAME",
				"PERSONAL_PHOTO",
				"ACTIVE",
				"UF_DEPARTMENT",
			],
			order: { ID: "ASC" },
		},
		false,
		signal,
	);
	const people = records.map((person) => {
		const id = idOf(person.ID);
		if (!id) throw new Error("Битрикс24 вернул сотрудника без идентификатора");
		const departments = Array.isArray(person.UF_DEPARTMENT)
			? person.UF_DEPARTMENT
			: [person.UF_DEPARTMENT];
		return {
			id,
			name:
				[textOf(person.NAME), textOf(person.LAST_NAME)]
					.filter(Boolean)
					.join(" ") || `Сотрудник #${id}`,
			photo: textOf(person.PERSONAL_PHOTO) || undefined,
			active: [true, "Y", 1, "1"].includes(
				person.ACTIVE as boolean | string | number,
			),
			developer: departments.some(
				(department) => Number(department) === DEPARTMENT_IDS.DEV,
			),
		};
	});
	return Array.from(
		new Map(people.map((person) => [person.id, person])).values(),
	);
};

export const fetchKanbanData = async (
	signal?: AbortSignal,
): Promise<KanbanData> => {
	const [stages, people, projects] = await Promise.all([
		fetchStages(signal),
		fetchPeople(
			{
				"@UF_DEPARTMENT": [DEPARTMENT_IDS.DEV, DEPARTMENT_IDS.ANALYTICS],
			},
			signal,
		),
		fetchAllCrmItems<CrmRecord>({
			entityTypeId: EntityTypeIds.projects,
			select: ["id", "title"],
			filter: {},
			signal,
		}),
	]);
	const activeStageIds = new Set(
		stages.filter((stage) => !stage.terminal).map((stage) => stage.id),
	);
	if (!activeStageIds.size) return { stages, people, tasks: [] };
	const records = await fetchPages(
		Endpoints.crmItems,
		{
			entityTypeId: EntityTypeIds.tasks,
			select: TASK_FIELDS,
			filter: { categoryId: 18, "@stageId": Array.from(activeStageIds) },
			order: { id: "ASC" },
		},
		true,
		signal,
	);
	const projectTitles = new Map(
		projects.map((project) => [idOf(project.id), textOf(project.title)]),
	);
	const tasks = records
		.filter((task) => activeStageIds.has(textOf(task.stageId)))
		.map((task): KanbanTask => {
			const id = idOf(task.id);
			if (!id) throw new Error("Битрикс24 вернул задачу без идентификатора");
			const projectId = idOf(task[TaskCodes.parentproject]);
			return {
				id,
				title: textOf(task.title) || `Задача #${id}`,
				assigneeId: idOf(task.assignedById),
				stageId: textOf(task.stageId),
				projectId,
				projectTitle: projectId
					? projectTitles.get(projectId) || `Проект #${projectId}`
					: "Проект не указан",
				priority: numberOrNull(task[KANBAN_PRIORITY_FIELD]),
				estimateHours: hoursOrNull(task[TaskCodes.estimateTime]),
				spentHours: hoursOrNull(task[TaskCodes.timeSpent]) ?? 0,
				deadline: textOf(task[TaskCodes.deadline]) || null,
				redline: textOf(task[KANBAN_REDLINE_FIELD]) || null,
			};
		});
	const knownPersonIds = new Set(people.map((person) => person.id));
	const missingAssigneeIds = Array.from(
		new Set(
			tasks.flatMap((task) =>
				task.assigneeId && !knownPersonIds.has(task.assigneeId)
					? [task.assigneeId]
					: [],
			),
		),
	);
	const additionalPeople = missingAssigneeIds.length
		? await fetchPeople({ "@ID": missingAssigneeIds }, signal)
		: [];
	return {
		stages,
		people: Array.from(
			new Map(
				[...people, ...additionalPeople].map((person) => [person.id, person]),
			).values(),
		),
		tasks: Array.from(new Map(tasks.map((task) => [task.id, task])).values()),
	};
};
