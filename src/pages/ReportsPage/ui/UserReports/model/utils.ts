import { DEPARTMENT_IDS } from "@/shared/constants/const";
import type { User } from "@/shared/types/types";
import type { EmployeeMetrics, ViewCalendar } from "./types";

export const parseTimeSpent = (
	value: string | number | null | undefined,
): number => {
	if (value == null) return 0;

	const normalized = String(value).replace(",", ".").trim();
	const parsed = Number(normalized);

	return Number.isNaN(parsed) ? 0 : parsed;
};

export const formatHours = (value: number) => `${Number(value.toFixed(1))} ч`;

export const getCapacityByView = (view: ViewCalendar) =>
	view === "week" ? 40 : 160;

export const createEmptyEmployeeMetrics = (): EmployeeMetrics => ({
	hours: new Map<string, number>(),
	notAtWork: new Map<string, number>(),
	totalHours: 0,
	hasLoaded: false,
});

export const getProjectKey = (clientId: number, projectId: number) =>
	`${clientId}-${projectId}`;

export const getDepartmentUsers = (users: User[]) => {
	const filtered = users.filter((user) =>
		[DEPARTMENT_IDS.ANALYTICS, DEPARTMENT_IDS.DEV].includes(user.department),
	);

	return filtered.length ? filtered : users;
};

export const getWorkloadPercent = (spent: number, capacity: number) => {
	if (!capacity) return 0;

	return Math.min(100, Math.round((spent / capacity) * 100));
};
