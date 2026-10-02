import { $api } from "../config";
import { DEPARTMENT_IDS, Endpoints } from "../constants/const";

type Department = {
	id: number;
	parentId: number | null;
};

type DepartmentResponse = {
	result?: unknown;
	next?: unknown;
	error?: unknown;
};

const positiveId = (value: unknown): number | null => {
	if (
		typeof value !== "number" &&
		(typeof value !== "string" || !/^\d+$/.test(value.trim()))
	) {
		return null;
	}
	const id = Number(value);
	return Number.isSafeInteger(id) && id > 0 ? id : null;
};

export const getWorkTrackerDepartmentAccess = async (): Promise<{
	heads: string[];
	reportDepartmentIds: number[];
}> => {
	const departments: Department[] = [];
	const heads = new Set<string>();
	let start = 0;

	while (true) {
		const response = await $api.get<DepartmentResponse>(Endpoints.department, {
			params: { start },
		});
		const data = response.data;
		if (data?.error || !Array.isArray(data?.result)) {
			throw new Error("Failed to load the department hierarchy");
		}
		for (const item of data.result) {
			if (!item || typeof item !== "object" || Array.isArray(item)) {
				throw new Error("Invalid department record");
			}
			const id = positiveId(item.ID);
			const parentId = positiveId(item.PARENT);
			if (
				id === null ||
				(parentId === null &&
					item.PARENT !== undefined &&
					item.PARENT !== null &&
					item.PARENT !== "" &&
					item.PARENT !== 0 &&
					item.PARENT !== "0")
			) {
				throw new Error("Invalid department hierarchy");
			}
			departments.push({ id, parentId });
			const head = positiveId(item.UF_HEAD);
			if (head !== null) heads.add(String(head));
		}

		if (data.next === undefined || data.next === null) break;
		const next = positiveId(data.next);
		if (next === null || next <= start) {
			throw new Error("Invalid department pagination");
		}
		start = next;
	}

	const reportDepartmentIds = new Set<number>([
		DEPARTMENT_IDS.DEV,
		DEPARTMENT_IDS.ANALYTICS,
	]);
	const children = new Map<number, number[]>();
	for (const { id, parentId } of departments) {
		if (parentId === null) continue;
		const siblings = children.get(parentId) ?? [];
		siblings.push(id);
		children.set(parentId, siblings);
	}
	const queue = [...reportDepartmentIds];
	for (let index = 0; index < queue.length; index += 1) {
		for (const childId of children.get(queue[index]) ?? []) {
			if (reportDepartmentIds.has(childId)) continue;
			reportDepartmentIds.add(childId);
			queue.push(childId);
		}
	}

	return { heads: [...heads], reportDepartmentIds: [...reportDepartmentIds] };
};

export const getDepartmentsHeads = async (): Promise<string[]> =>
	(await getWorkTrackerDepartmentAccess()).heads;
