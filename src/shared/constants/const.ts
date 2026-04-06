import {
	TaskCodes,
	TaskCodes as UserCodes,
} from "../../components/calendar/constants/const";
import type { TaskProps } from "../types/types";

export const days = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

export const Endpoints = {
	tasks: "tasks.task.list",
	groups: "sonet_group.get",
	users: "user.get",
	crmItems: "crm.item.list",
	crmFeilds: "crm.item.fields",
	status: "crm.status.list",
	lists: "lists.element.get",
	item: "crm.item.get",
	department: "department.get",
};

export const EntityTypeIds = {
	reports: 1060,
	tasks: 1072,
	projects: 1092,
};

export const TASK_SELECT_FIELDS = [
	"id",
	"title",
	"assignedById",
	"createdTime",
	"lastActivityTime",
	"stageId",
	"createdBy",
	"movedTime",
	UserCodes.client,
	UserCodes.estimateTime,
	UserCodes.description,
	UserCodes.stage,
	UserCodes.comment,
	UserCodes.reportDate,
	UserCodes.timeSpent,
	UserCodes.sprintDateStart,
	UserCodes.project,
	UserCodes.linkedTasks,
] as const;

export const statsFields: {
	title: string;
	key: string;
	filterFn?: (task: TaskProps, length?: number) => void;
}[] = [
	{ title: "Всего задач", key: "length" },
	{
		title: "Выполнено задач",
		key: "completed",
		filterFn: (task: TaskProps) => task.stageId === "DT1072_18:UC_6JNSDG",
	},
	{
		title: "Просрочено задач",
		key: "expired",
		filterFn: (task) => {
			if (task[TaskCodes.estimateTime] === "0") return;

			const estimate = parseFloat(String(task[TaskCodes.estimateTime]) || "0");
			const spent = parseFloat(String(task[TaskCodes.timeSpent]) || "0");
			return spent > estimate;
		},
	},
	{
		title: "Задач в работе",
		key: "inWork",
		filterFn: (task) => task.stageId === "DT1072_18:CLIENT",
	},
];

export enum ClientsCodes {
	client = "ufCrm20_1773412189",
	title = "ufCrm20_1771940818371",
}
