import { dtoFieldsCodesUserReports as UserCodes } from "../../../components/calendar/constants/const";

export const TASK_SELECT_FIELDS = [
	"id",
	"title",
	"assignedById",
	"createdTime",
	"lastActivityTime",
	"stageId",
	UserCodes.project,
	UserCodes.estimateTime,
	UserCodes.description,
	UserCodes.stage,
] as const;
