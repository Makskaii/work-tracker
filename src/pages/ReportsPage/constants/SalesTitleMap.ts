import type { Header } from "@/shared/types/table";
import { getFixedNumber } from "@/shared/utils/getNumber";
import type { SalesTableFields } from "../types/types";

// export const headersForSales: Header<SalesFields>[] = [
// 	{
// 		title: "Кол-во звонков по отделу",
// 		key: "callCount",
// 	},
// 	{
// 		title: "Кол-во заявок",
// 		key: "bidCount",
// 	},
// 	{
// 		title: "Кол-во активных сделок",
// 		key: "activeDeals",
// 	},
// 	{
// 		title: "Кол-во ППО",
// 		key: "ppoCount",
// 	},
// 	{
// 		title: "Кол-во защит КП",
// 		key: "kpCount",
// 	},

// 	{
// 		title: "Кол-во продаж",
// 		key: "salesCount",
// 	},
// 	{
// 		title: "Сумма продаж",
// 		key: "totalSales",
// 	},
// ];

export const headersForSales: Header<SalesTableFields>[] = [
	{
		title: "Данные",
		key: "title",
	},
	{
		title: "Плановые показатели",
		key: "plan",
	},
	{
		title: "Фактические показатели",
		key: "fact",
	},
	{
		title: "Отклонение",
		key: "deviation",
		convertFn: (value) =>
			Number(value) > 0 ? `+${getFixedNumber(value)}` : getFixedNumber(value),
	},
];
