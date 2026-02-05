import dayjs from "dayjs";
import {
	isGroupsColumns,
	isTasksColumns,
	isUsersColumns,
	type TGroupsColumns,
	type TTasksColumns,
	type TUsersColumns,
} from "../../components/Table/types";

export const convertToDate = (date?: string | number | null): string => {
	if (!date) {
		return "";
	}

	try {
		return dayjs(new Date(date)).format("DD.MM.YYYY");
	} catch (_e) {
		return "Неверный формат даты";
	}
};

export const convertMinutesInHrs = (minutes: string): string => {
	// if (minutes === "0") {
	// 	return "Нет оценки";
	// }

	return `${parseInt(minutes) / 600}.ч`;
};

export const classNames = (
	cls: string,
	options: Record<string, boolean>,
	additional: Array<string | undefined> = [],
): string => {
	return [
		cls,
		...additional.filter(Boolean),
		...Object.entries(options)
			.filter(([_, value]) => Boolean(value))
			.map(([className]: [string, boolean | string | undefined]) => className),
	].join(" ");
};

// Вспомогательные функции для получения ID
export const getItemId = (
	item: TTasksColumns | TGroupsColumns | TUsersColumns,
): string => {
	if (isTasksColumns(item)) return item.id;
	if (isGroupsColumns(item)) return item.ID;
	if (isUsersColumns(item)) return item.ID;
	return "unknown";
};

// Вспомогательная функция для получения значения по ключу
export const getItemValueByKey = (
	item: TTasksColumns | TGroupsColumns | TUsersColumns,
	key: string,
): string => {
	if (isTasksColumns(item) && key in item) {
		return item[key as keyof TTasksColumns]?.toString() || "";
	}
	if (isGroupsColumns(item) && key in item) {
		return item[key as keyof TGroupsColumns]?.toString() || "";
	}
	if (isUsersColumns(item) && key in item) {
		return item[key as keyof TUsersColumns]?.toString() || "";
	}
	return "";
};
