import type { ReactElement } from "react";
import type { AnyObject } from "../../shared/types/types";

interface ColumnConfig<T> {
	key: keyof T;
	name: string;
	convertFn?: (value: string) => string;
	filter?: () => ReactElement;
}

interface Template<T> {
	data?: T;
	columns: ColumnConfig<T>[];
	path: string;
	beforeEdit?: (data: T[]) => T[];
	title: string;
	keyMapping?: Record<keyof T, string>;
}

type TemplateName = "tasks" | "groups" | "users";

type TTasksColumns = {
	id: string;
	title: string;
	groupId: string;
	responsibleId: string;
	status: string;
	createdDate: string;
	dateStart: string;
	closedDate: string;
	deadline: string;
	timeEstimate: string;
};

type TGroupsColumns = {
	ID: string;
	NAME: string;
	NUMBER_OF_MEMBERS: string;
	DATE_CREATE: string;
	DATE_UPDATE: string;
	DATE_ACTIVITY: string;
};

type TUsersColumns = {
	ID: string;
	NAME: string;
	LAST_NAME: string;
	EMAIL: string;
	LAST_LOGIN: string;
	DATE_REGISTER: string;
	USER_TYPE: string;
};

type commonDto = TGroupsColumns[] | TTasksColumns[] | TUsersColumns[];

interface TasksTemplate extends Template<TTasksColumns> {
	path: "result.tasks";
	title: "Задачи";
	beforeEdit?: (data: AnyObject[]) => TTasksColumns[];
}

interface GroupsTemplate extends Template<TGroupsColumns> {
	path: "result";
	title: "Проекты";
	beforeEdit?: (data: AnyObject[]) => TGroupsColumns[];
}

interface UsersTemplate extends Template<TUsersColumns> {
	path: "result";
	title: "Пользователи";
	beforeEdit?: (data: AnyObject[]) => TUsersColumns[];
}

type TableTemplate = TasksTemplate | GroupsTemplate | UsersTemplate;

export type {
	UsersTemplate,
	GroupsTemplate,
	TasksTemplate,
	TableTemplate,
	TUsersColumns,
	TGroupsColumns,
	TTasksColumns,
	commonDto,
	TemplateName,
	ColumnConfig,
};

// Type guards
function isTasksColumns(
	item: TTasksColumns | TGroupsColumns | TUsersColumns,
): item is TTasksColumns {
	return item && "title" in item;
}

function isGroupsColumns(
	item: TTasksColumns | TGroupsColumns | TUsersColumns,
): item is TGroupsColumns {
	return item && "NAME" in item && "NUMBER_OF_MEMBERS" in item;
}

function isUsersColumns(
	item: TTasksColumns | TGroupsColumns | TUsersColumns,
): item is TUsersColumns {
	return item && "NAME" in item && "EMAIL" in item;
}

export { isGroupsColumns, isUsersColumns, isTasksColumns };
