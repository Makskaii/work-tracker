import {
	convertToDate,
	convertToMinutesOrHours,
} from "../../../shared/utils/utils";
import type { GroupedReportFields } from "../helpers/generateMonthDays";

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

export const headers: {
	key: keyof GroupedReportFields;
	title: string;
	convertFn?: (value: number) => string;
}[] = [
	{
		title: "Описание",
		key: "title",
	},
	{
		title: "Задача",
		key: "taskId",
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

//
export enum dtoFieldsCodesDailyReports {
	title = "ufCrm11_1770627903531",
	timeSpent = "ufCrm11_1770627880479",
	taskId = "ufCrm11_1770627808462",
	project = "ufCrm11_1770393502397",
}

export enum dtoFieldsCodesUserReports {
	description = "ufCrm14_1770731622242",
	stage = "ufCrm14_1770890673468",
	estimateTime = "ufCrm14_1770731674952",
	project = "ufCrm14_1770801014487",
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
}

export const ActivityTitle: { [key: number]: string } = {
	[ActivityType.development]: "Разработка",
	[ActivityType.clientCall]: "Созвон с клиентом",
	[ActivityType.analitycsCall]: "Внутренний созвон",
	[ActivityType.dash]: "Внутренние коммуникации",
};
