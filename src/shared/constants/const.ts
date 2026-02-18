import { dtoFieldsCodesUserReports as UserCodes } from "../../components/calendar/constants/const";

// const statuses =
// 	2: "ждет выполнения",
// 	3: "выполняется",
// 	4: "ожидает контроля",
// 	5: "завершена",
// 	6: "отложена",
// };

export const Endpoints = {
	tasks: "tasks.task.list",
	groups: "sonet_group.get",
	users: "user.get",
	reports: "crm.item.list",
	crmFeilds: "crm.item.fields",
	status: "crm.status.list",
};

export const TASK_SELECT_FIELDS = [
	"id",
	"title",
	"assignedById",
	"createdTime",
	"lastActivityTime",
	"stageId",
	"createdBy",
	UserCodes.project,
	UserCodes.estimateTime,
	UserCodes.description,
	UserCodes.stage,
	UserCodes.comment,
	UserCodes.reportDate,
	UserCodes.timeSpent,
] as const;
