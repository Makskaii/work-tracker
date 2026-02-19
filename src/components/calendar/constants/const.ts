import {
	convertToDate,
	convertToMinutesOrHours,
} from "../../../shared/utils/utils";
import type { ReportProps } from "../helpers/generateMonthDays";

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
	key: keyof ReportProps;
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
export const dtoFieldsCodesDailyReports = {
	title: "ufCrm11_1770627903531",
	timeSpent: "ufCrm11_1770627880479",
	taskId: "ufCrm11_1770393502397",
	day: "begindate",
	responsible: "ufCrm11_1770627880479",
	activityType: "ufCrm11_1770804288638",
};

export const dtoFieldsCodesUserReports = {
	description: "ufCrm14_1770731622242",
	stage: "ufCrm14_1770890673468",
	estimateTime: "ufCrm14_1770731674952",
	project: "ufCrm14_1770801014487",
	reportDate: "ufCrm14_1771314375250",
	timeSpent: "ufCrm14_1771314387497",
	comment: "ufCrm14_1771314401297",
};

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
