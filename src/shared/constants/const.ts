import { TaskCodes } from "../../components/calendar/constants/const";
import type { TaskProps } from "../types/types";

export const days = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

export const enum DEPARTMENT_IDS {
	DEV = 23,
	SALES = 19,
	ANALYTICS = 25,
}

export const Endpoints = {
	tasks: "tasks.task.list",
	groups: "sonet_group.get",
	users: "user.get",
	crmItems: "crm.item.list",
	crmDeals: "crm.deal.list",
	crmFeilds: "crm.item.fields",
	status: "crm.status.list",
	lists: "lists.element.get",
	item: "crm.item.get",
	department: "department.get",
	calls: "voximplant.statistic.get",
};

export const EntityTypeIds = {
	reports: 1060,
	tasks: 1072,
	projects: 1092,
	default: 2,
	companies: 4,
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
	TaskCodes.client,
	TaskCodes.estimateTime,
	TaskCodes.description,
	TaskCodes.stage,
	TaskCodes.comment,
	TaskCodes.reportDate,
	TaskCodes.timeSpent,
	TaskCodes.sprintDateStart,
	TaskCodes.project,
	TaskCodes.linkedTasks,
	TaskCodes.hours,
	TaskCodes.deadline,
	TaskCodes.parentproject,
	TaskCodes.taskType,
	TaskCodes.company,
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
	client = "ufCrm20_1774879746",
	title = "ufCrm20_1771940818371",
	parentProject = "ufCrm20_1774856819",
}
