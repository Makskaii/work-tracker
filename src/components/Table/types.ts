export interface ColumnConfig {
	key: string;
	name: string;
	convertFn?: (value: string) => string;
}

export interface Template<T> {
	data?: T;
	columns: ColumnConfig[];
	path: string;
	beforeEdit?: (data: T[]) => T[];
	title: string;
}

export type TemplateName = "tasks" | "groups" | "users";

export type TTasksColumns = {
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

export type TGroupsColumns = {
	ID: string;
	NAME: string;
	NUMBER_OF_MEMBERS: string;
	DATE_CREATE: string;
	DATE_UPDATE: string;
	DATE_ACTIVITY: string;
};

export type TUsersColumns = {
	ID: string;
	NAME: string;
	LAST_NAME: string;
	EMAIL: string;
	DATE_REGISTER: string;
	USER_TYPE: string;
};

export interface TasksTemplate extends Template<TTasksColumns> {
	path: "result.tasks";
	title: "Задачи";
}

export interface GroupsTemplate extends Template<TGroupsColumns> {
	path: "result";
	title: "Проекты";
}

export interface UsersTemplate extends Template<TUsersColumns> {
	path: "result";
	title: "Пользователи";
}

export type TableTemplate = TasksTemplate | GroupsTemplate | UsersTemplate;
