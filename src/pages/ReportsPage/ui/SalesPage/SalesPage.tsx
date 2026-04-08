import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { UniversalTable } from "@/components/Table/universalTable/UniversalTable";
import { useSprintBorders } from "@/shared/hooks/useSprintBorders";
import { getCalls } from "../../api/getCalls";
import { getDeals } from "../../api/getDeals";
import { headersForSales } from "../../constants/SalesTitleMap";
import {
	SalesCodes,
	type SalesFields,
	type SalesTableFields,
} from "../../types/types";

const rows: Omit<SalesTableFields, "fact" | "deviation" | "comment">[] = [
	{
		title: "Количество звонков по отделу",
		id: "1",
		plan: 700,
	},
	{
		title: "Количество созданных сделок",
		id: "2",
		plan: 22,
	},
	{
		title: "Количество проведенных ППО",
		id: "3",
		plan: 10,
	},
	{
		title: "Количество защит КП",
		id: "4",
		plan: 7,
	},
	{
		title: "Количество активных карточек в работе",
		id: "5",
		plan: 40,
	},
	{
		title: "Количество продаж",
		id: "6",
		plan: 2,
	},
	{
		title: "Сумма продаж",
		id: "7",
		plan: 250000,
	},
];

const TARGET_STAGE_IDS = [
	"NEW",
	"PREPARATION",
	"PREPAYMENT_INVOICE",
	"EXECUTING",
	"FINAL_INVOICE",
	"UC_HDHLH5",
	"UC_ZLNOOX",
	"UC_EEZLOG",
] as const;

const getDealsCountByStages = async ({
	categoryId = 0,
}: {
	start: string;
	end: string;
	categoryId?: number;
}) => {
	const responses = await Promise.all(
		TARGET_STAGE_IDS.map((stageId) =>
			getDeals({
				categoryId,
				stageId,
			}),
		),
	);

	return responses.reduce((acc, items) => acc + items.length, 0);
};

const toNumber = (value: string | number) => {
	if (typeof value === "number") return value;
	return Number(String(value).replace(/\s/g, "")) || 0;
};

export const SalesPage = () => {
	const [data, setData] = useState<SalesTableFields[]>([]);

	const { endOfTheWeek, startOfTheWeek, setDay } = useSprintBorders();

	const start = dayjs(startOfTheWeek).subtract(1, "day").format("YYYY-MM-DD");
	const end = dayjs(endOfTheWeek).subtract(3, "day").format("YYYY-MM-DD");

	useEffect(() => {
		const fetchCallsAmount = async () => {
			try {
				const totalCalls = await getCalls(start, end);

				const [items, ppoItems, kpItems, activeDealsCount, wonItems] =
					await Promise.all([
						await getDeals({
							">=createdTime": start,
							"<=createdTime": end,
							categoryId: 0,
						}),
						getDeals({
							">=createdTime": dayjs(start)
								.subtract(30, "day")
								.format("YYYY-MM-DD"),
							"<=createdTime": end,
							categoryId: 0,
							[`>=${SalesCodes.ppoDay}`]: start,
							[`<=${SalesCodes.ppoDay}`]: end,
							[SalesCodes.ppoSuccess]: 390,
						}),
						getDeals({
							">=createdTime": dayjs(start)
								.subtract(30, "day")
								.format("YYYY-MM-DD"),
							"<=createdTime": end,
							categoryId: 0,
							[`>=${SalesCodes.kpday}`]: start,
							[`<=${SalesCodes.kpday}`]: end,
							[SalesCodes.kpSuccess]: 388,
						}),
						getDealsCountByStages({
							start: dayjs(start).subtract(17, "day").format("YYYY-MM-DD"),
							end,
							categoryId: 0,
						}),
						await getDeals({
							">=movedTime": start,
							"<=movedTime": dayjs(end).add(1, "day").format("YYYY-MM-DD"),
							categoryId: 0,
							stageId: "WON",
						}),
					]);

				const stats: SalesFields = {
					id: "sales-stats",
					callCount: totalCalls,
					bidCount: items.filter(
						(item) =>
							item.stageId !== "UC_9X7H19" && item.stageId !== "UC_B20EGT",
					).length,
					ppoCount: ppoItems.length,
					kpCount: kpItems.length,
					activeDeals: activeDealsCount,
					salesCount: wonItems.length,
					totalSales: wonItems.reduce((acc: number, item) => {
						if (item.stageId === "WON") {
							return acc + Number(item.opportunity || 0);
						}
						return acc;
					}, 0),
				};

				const preparedData: SalesTableFields[] = rows.map((row) => {
					let fact = 0;

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
							fact = stats.kpCount;
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
					}

					const plan = toNumber(row.plan);
					const deviation = `${fact - plan > 0 ? "+" : ""} ${fact - plan}`;

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

		fetchCallsAmount();
	}, [start, end]);

	return (
		<div style={{ maxWidth: "1000px" }}>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: "1rem",
				}}
			>
				<button
					style={{
						background: "white",
						color: "#aeacac",
					}}
					onClick={() => {
						setDay((prev) => prev.subtract(7, "day"));
					}}
				>
					пред. неделя
				</button>

				<div
					style={{
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
					}}
				>
					<div>
						{dayjs(startOfTheWeek).subtract(1, "day").format("DD.MM")}-
						{dayjs(endOfTheWeek).subtract(3, "day").format("DD.MM")}
					</div>
				</div>

				<button
					style={{
						background: "white",
						color: "#aeacac",
					}}
					onClick={() => {
						setDay((prev) => prev.add(7, "day"));
					}}
				>
					след. неделя
				</button>
			</div>

			<UniversalTable<SalesTableFields>
				headers={headersForSales}
				activeItems={data}
				fallbackText="Загружаем сделки..."
			/>
		</div>
	);
};
