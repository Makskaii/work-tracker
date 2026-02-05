import { convertMinutesInHrs, convertToDate } from "../../../shared/utils";
import type { ColumnConfig } from "../types";

export const TasksColumns: ColumnConfig[] = [
	{
		key: "title",
		name: "Название",
	},
	{
		key: "groupId",
		name: "Проект",
	},
	{
		key: "responsibleId",
		name: "Ответственный",
	},
	{
		key: "status",
		name: "Статус",
	},
	{
		key: "createdDate",
		name: "Дата создания",
		convertFn: convertToDate,
	},
	{
		key: "dateStart",
		name: "Дата начала",
		convertFn: convertToDate,
	},
	{
		key: "closedDate",
		name: "Дата закрытия",
		convertFn: convertToDate,
	},
	{
		key: "deadline",
		name: "Дедлайн",
		convertFn: convertToDate,
	},
	{
		key: "timeEstimate",
		name: "Оценка времени",
		convertFn: convertMinutesInHrs,
	},
];

export const GroupsColumns: ColumnConfig[] = [
	{
		key: "NAME",
		name: "Название",
	},
	{
		key: "NUMBER_OF_MEMBERS",
		name: "Кол-во участников",
	},
	{
		key: "DATE_CREATE",
		name: "Дата создания",
		convertFn: convertToDate,
	},
	{
		key: "DATE_UPDATE",
		name: "Дата обновления",
		convertFn: convertToDate,
	},
	{
		key: "DATE_ACTIVITY",
		name: "Дата активности",
		convertFn: convertToDate,
	},
];

export const UsersColumns: ColumnConfig[] = [
	{
		key: "NAME",
		name: "Имя",
	},
	{
		key: "EMAIL",
		name: "Почта",
	},
	{
		key: "LAST_LOGIN",
		name: "Последний вход",
		convertFn: convertToDate,
	},
	{
		key: "DATE_REGISTER",
		name: "Дата регистрации",
		convertFn: convertToDate,
	},
	{
		key: "USER_TYPE",
		name: "Тип пользователя",
	},
];
