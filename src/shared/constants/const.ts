import {
	dtoFieldsCodesUserReports,
	dtoFieldsCodesUserReports as UserCodes,
} from "../../components/calendar/constants/const";
import type { TaskProps } from "../types/types";

// const statuses =
// 	2: "ждет выполнения",
// 	3: "выполняется",
// 	4: "ожидает контроля",
// 	5: "завершена",
// 	6: "отложена",
// };

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
	UserCodes.project,
	UserCodes.estimateTime,
	UserCodes.description,
	UserCodes.stage,
	UserCodes.comment,
	UserCodes.reportDate,
	UserCodes.timeSpent,
	UserCodes.sprintDateStart,
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
			if (task[dtoFieldsCodesUserReports.estimateTime] === "0") return;

			const estimate = parseFloat(
				String(task[dtoFieldsCodesUserReports.estimateTime]) || "0",
			);
			const spent = parseFloat(
				String(task[dtoFieldsCodesUserReports.timeSpent]) || "0",
			);
			return spent > estimate;
		},
	},
	{
		title: "Задач в работе",
		key: "inWork",
		filterFn: (task) => task.stageId === "DT1072_18:CLIENT",
	},
];
