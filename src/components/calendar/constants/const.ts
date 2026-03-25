import type { ProjectFromList } from "@/pages/ReportsPage/ReportsPage";
import type { GroupedReportFields, Header } from "@/shared/types/table";
import {
	convertToDate,
	convertToMinutesOrHours,
} from "../../../shared/utils/utils";
import type { ActivityListItem } from "../types/types";

export const months = [
	"Январь",
	"Февраль",
	"Март",
	"Апрель",
	"Май",
	"Июнь",
	"Июль",
	"Август",
	"Сентябрь",
	"Октябрь",
	"Ноябрь",
	"Декабрь",
];

export const years = Array.from({ length: 10 }, (_, i) => 2020 + i);

export const headers: Header<GroupedReportFields>[] = [
	{
		title: "Описание",
		key: "title",
	},
	{
		title: "Задача",
		key: "parentId",
	},
	{
		title: "Проект",
		key: "project",
		convertFn: (value, additionalData) => {
			console.log({ additionalData, value });
			return (
				additionalData?.projects?.find(
					(project: ProjectFromList) => Number(project.id) === value,
				)?.name || ""
			);
		},
	},
	{
		title: "Активность",
		key: "activity",
		convertFn: (value, additionalData) => {
			return (
				additionalData?.activities?.find(
					(activity: ActivityListItem) => Number(activity.ID) === value,
				)?.NAME || ""
			);
		},
	},
	{
		title: "Время",
		key: "timeSpent",
		convertFn: convertToMinutesOrHours,
	},
	{
		title: "Дата",
		key: "day",
		convertFn: convertToDate,
	},
];

export enum ReportCodes {
	title = "ufCrm11_1770627903531",
	timeSpent = "ufCrm11_1770627880479",
	taskId = "ufCrm11_1770627808462",
	project = "ufCrm11_1774018669",
	activityType = "ufCrm11_1774427281",
	parentId = "parentId1072",
}

export enum TaskCodes {
	description = "ufCrm14_1770731622242",
	stage = "ufCrm14_1770890673468",
	estimateTime = "ufCrm14_1770731674952",
	project = "ufCrm14_1772011269", // TODO сменить на актуальынй код поля проекта из 1092
	reportDate = "ufCrm14_1771314375250",
	timeSpent = "ufCrm14_1771314387497",
	comment = "ufCrm14_1771314401297",
	sprintDateStart = "ufCrm14_1771510367281",
}

export enum ActivityType {
	development = 269,
	clientCall = 270,
	analitycsCall = 271,
	dash = 272,
	devsCall = 275,
}

export const ActivityTitle: { [key: number]: string } = {
	[ActivityType.development]: "Разработка",
	[ActivityType.clientCall]: "Созвон с клиентом",
	[ActivityType.analitycsCall]: "Внутренний созвон",
	[ActivityType.dash]: "Внутренние коммуникации",
	[ActivityType.devsCall]: "Встреча с разработчиками",
};

export const selectFields = [
	"id",
	"title",
	"begindate",
	ReportCodes.title,
	ReportCodes.timeSpent,
	ReportCodes.project,
	ReportCodes.taskId,
	ReportCodes.activityType,
	ReportCodes.parentId,
	"assignedById",
	"createdTime",
	"lastActivityTime",
];
