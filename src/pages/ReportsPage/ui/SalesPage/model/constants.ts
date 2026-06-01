import {
	ProjectCodes,
	ReportCodes,
} from "@/components/calendar/constants/const";

export const PROJECT_SELECT_FIELDS = [
	"id",
	"title",
	"assignedById",
	"createdTime",
	"updatedTime",
	"stageId",
	ProjectCodes.company,
	ProjectCodes.parentproject,
] as const;

export const REPORT_SELECT_FIELDS = [
	"id",
	"title",
	"begindate",
	ReportCodes.title,
	ReportCodes.timeSpent,
	ReportCodes.taskId,
	ReportCodes.parentId,
	ReportCodes.activityType,
	ReportCodes.company,
	ReportCodes.parentproject,
	"assignedById",
	"stageId",
] as const;

export const MOCK_MARGIN_PERCENT = 53;
