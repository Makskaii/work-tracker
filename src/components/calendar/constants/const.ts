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
export const dtoFieldsCodes = {
	title: "ufCrm11_1770627903531",
	timeSpent: "ufCrm11_1770627880479",
	taskId: "ufCrm11_1770393502397",
	day: "createdTime",
	responsible: "ufCrm11_1770627880479",
};
