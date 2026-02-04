import { convertMinutesInHrs, convertToDate } from "../../../utils";

export interface ColumnConfig {
	key: string;
	name: string;
	convertFn?: (value: string) => string;
}

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
