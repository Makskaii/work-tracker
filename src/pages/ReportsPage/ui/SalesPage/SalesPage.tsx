import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { UniversalTable } from "@/components/Table/universalTable/UniversalTable";
import { $api } from "@/shared/config";
import { getWeekBorders } from "@/shared/utils/statisticUtils/generateWeekBorders";
import { getDeals } from "../../api/getDeals";
import { headersForSales } from "../../constants/SalesTitleMap";
import type { SalesFields, SalesTableFields } from "../../types/types";

//TODO убрать заглушки с прочерками по КП

const rows: Omit<SalesTableFields, "fact" | "deviation" | "comment">[] = [
	{
		title: "Количество звонков по отделу",
		id: "1",
		plan: 300,
	},
	{
		title: "Количество взятых заявок с кабинетов",
		id: "2",
		plan: 15,
	},
	{
		title: "Количество проведенных ППО",
		id: "3",
		plan: 8,
	},
	{
		title: "Количество защит КП",
		id: "4",
		plan: "-",
	},
	{
		title: "Количество активных карточек в работе",
		id: "5",
		plan: 25,
	},
	{
		title: "Количество продаж",
		id: "6",
		plan: 1,
	},
	{
		title: "Сумма продаж",
		id: "7",
		plan: 250000,
	},
];

const toNumber = (value: string | number) => {
	if (typeof value === "number") return value;
	return Number(String(value).replace(/\s/g, "")) || 0;
};

export const SalesPage = () => {
	const borders = useMemo(() => getWeekBorders(dayjs()), []);
	const [data, setData] = useState<SalesTableFields[]>([]);

	const { endOfTheWeek, startOfTheWeek } = borders;

	const start = dayjs(startOfTheWeek).subtract(1, "day").format("YYYY-MM-DD");
	const end = dayjs(endOfTheWeek).subtract(3, "day").format("YYYY-MM-DD");

	useEffect(() => {
		const fetchProjects = async () => {
			try {
				const teleph = await $api.get("voximplant.statistic.get", {
					params: {
						filter: {
							">=CALL_START_DATE": start,
							"<=CALL_START_DATE": end,
						},
					},
				});

				const totalCalls = teleph.data.total ?? 0;

				const items = await getDeals(start, end);

				const stats: SalesFields = {
					id: "sales-stats",
					callCount: totalCalls,
					bidCount: items.filter(
						(item) =>
							item.stageId !== "UC_9X7H19" && item.stageId !== "UC_B20EGT",
					).length,
					ppoCount: items.filter(
						(item) =>
							item.stageId !== "UC_9X7H19" &&
							item.stageId !== "UC_B20EGT" &&
							item.stageId !== "NEW" &&
							item.stageId !== "PREPARATION",
					).length,
					kpCount: 0,
					activeDeals: items.filter(
						(item) => item.stageId !== "WON" && item.stageId !== "UC_HSP7T0",
					).length,
					salesCount: items.filter((item) => item.stageId === "WON").length,
					totalSales: items.reduce((acc: number, item) => {
						if (item.stageId === "WON") {
							return acc + Number(item.opportunity || 0);
						}
						return acc;
					}, 0),
				};

				const preparedData: SalesTableFields[] = rows.map((row) => {
					let fact;

					switch (row.id) {
						case "1":
							fact = stats.callCount;
							break;
						case "2":
							fact = stats.bidCount;
							break;
						case "3":
							fact = stats.ppoCount;
							break;
						case "4":
							fact = "-";
							break;
						case "5":
							fact = stats.activeDeals;
							break;
						case "6":
							fact = stats.salesCount;
							break;
						case "7":
							fact = stats.totalSales;
							break;
						default:
							fact = 0;
					}

					const plan = toNumber(row.plan);
					const deviation =
						row.id === "4" ? "-" : typeof fact === "number" ? fact - plan : 0;

					return {
						...row,
						fact,
						deviation,
					};
				});

				setData(preparedData);
			} catch (error) {
				console.error(error);
			}
		};

		fetchProjects();
	}, [start, end]);

	return (
		<div style={{ maxWidth: "1000px" }}>
			<UniversalTable<SalesTableFields>
				headers={headersForSales}
				activeItems={data}
			/>
		</div>
	);
};
