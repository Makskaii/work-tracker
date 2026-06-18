import {
	ProjectCodes,
	ReportCodes,
} from "@/components/calendar/constants/const";

export const ProjectGanttCodes = {
	ganttTzStart: "ufCrm20_1780384451394",
	ganttTzPlanEnd: "ufCrm20_1780384478738",
	ganttTzWeeks: "ufCrm20_1780384578815",
	ganttTzFactEnd: "ufCrm20_1780384621083",
	ganttTzSignDate: "ufCrm20_1780384633989",
	ganttDevWeeks: "ufCrm20_1780384658766",
	ganttDevPlanStart: "ufCrm20_1780384669297",
	ganttDevPlanEnd: "ufCrm20_1780384695333",
	ganttDevFactStart: "ufCrm20_1780384706320",
	ganttDevFactEnd: "ufCrm20_1780384718350",
	ganttEducationWeeks: "ufCrm20_1780384754867",
	ganttEducationPlanStart: "ufCrm20_1780384767159",
	ganttEducationPlanEnd: "ufCrm20_1780384775525",
	ganttEducationFactStart: "ufCrm20_1780384783900",
	ganttEducationFactEnd: "ufCrm20_1780384791646",
	ganttCloseDate: "ufCrm20_1780384799015",
} as const;

export const PROJECT_SELECT_FIELDS = [
	"id",
	"title",
	"assignedById",
	"createdTime",
	"updatedTime",
	"stageId",
	ProjectCodes.company,
	ProjectCodes.financialProjectType,
	ProjectCodes.projectAmount,
	ProjectCodes.parentproject,
	ProjectCodes.parentDeal,
	...Object.values(ProjectGanttCodes),
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
