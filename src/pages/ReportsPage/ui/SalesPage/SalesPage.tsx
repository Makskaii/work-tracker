import dayjs from "dayjs";
import { useEffect, useState } from "react";
import uuid4 from "uuid4";
import { UniversalTable } from "@/components/Table/universalTable/UniversalTable";
import { $api } from "@/shared/config";
import { DEPARTMENT_IDS, Endpoints } from "@/shared/constants/const";
import { useSprintBorders } from "@/shared/hooks/useSprintBorders";
import type { Header } from "@/shared/types/table";
import type { User } from "@/shared/types/types";
import { getFixedNumber } from "@/shared/utils/getNumber";
import { getCalls } from "../../api/getCalls";
import { getDeals } from "../../api/getDeals";
import type { Deal } from "../../types/deals.types";
import {
	SalesCodes,
	type SalesFields,
	type SalesTableFields,
} from "../../types/types";
import { SalesCard } from "./ui/SalesCard/SalesCard";

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
	{
		title: "Действия",
		key: "id",
		render: (_value, additionalData) => {
			const row = additionalData?.row as SalesTableFields | undefined;

			return (
				<button
					style={{
						background: "#ccc",
					}}
					onClick={() => {
						additionalData?.setRow(row);
					}}
				>
					подробнее
				</button>
			);
		},
	},
];

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

	return responses;
};

const toNumber = (value: string | number) => {
	if (typeof value === "number") return value;
	return Number(String(value).replace(/\s/g, "")) || 0;
};

export const getUsers = async (): Promise<
	{
		ID: string;
		NAME: string;
		LAST_NAME: string;
		UF_DEPARTMENT: number[];
		WORK_POSITION: string;
		PERSONAL_PHOTO: string;
	}[]
> => {
	try {
		const response = await $api.get(Endpoints.users, {
			params: {
				filter: {
					"@UF_DEPARTMENT": [DEPARTMENT_IDS.SALES],
				},
				select: [
					"NAME",
					"ID",
					"LAST_NAME",
					"UF_DEPARTMENT",
					"WORK_POSITION",
					"PERSONAL_PHOTO",
				],
			},
		});

		const items = response.data?.result;

		if (!Array.isArray(items)) {
			console.warn("Expected items to be an array, but got:", items);
			return [];
		}

		return items;
	} catch (error) {
		console.error("Failed to fetch developers", error);
		return [];
	}
};

export const SalesPage = () => {
	const [data, setData] = useState<SalesTableFields[]>([]);
	const [rowItems, setRowItems] = useState<SalesTableFields>();
	const [users, setUsers] = useState<User[]>([]);

	const {
		endOfTheWeek: end,
		startOfTheWeek: start,
		setDay,
	} = useSprintBorders("workweek");

	useEffect(() => {
		const fetchCallsAmount = async () => {
			try {
				const totalCalls = await getCalls(start, end);

				const [items, ppoItems, kpItems, activeDealsCount, wonItems, users] =
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

						await getUsers(),
					]);

				setUsers(
					users
						.map((user) => ({
							id: user.ID,
							value: user.NAME + user.LAST_NAME,
							title: user.NAME + " " + user.LAST_NAME,
							position: user.WORK_POSITION,
							photo: user.PERSONAL_PHOTO,
							department: user.UF_DEPARTMENT[0],
						}))
						.toSorted((a, b) => a.department - b.department),
				);

				const stats: SalesFields = {
					id: "sales-stats",
					callCount: totalCalls,
					bidCount: items.filter(
						(item) =>
							item.stageId !== "UC_9X7H19" && item.stageId !== "UC_B20EGT",
					).length,
					ppoCount: ppoItems.length,
					kpCount: kpItems.length,
					activeDeals: activeDealsCount.reduce(
						(acc, items) => acc + items.length,
						0,
					),
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
					const arr: Deal[] = [];

					switch (row.id) {
						case "1":
							fact = stats.callCount;
							break;
						case "2":
							fact = stats.bidCount;
							arr.push(
								...items.filter(
									(item) =>
										item.stageId !== "UC_9X7H19" &&
										item.stageId !== "UC_B20EGT",
								),
							);
							break;
						case "3":
							fact = stats.ppoCount;
							arr.push(...ppoItems);
							break;
						case "4":
							fact = stats.kpCount;
							arr.push(...kpItems);
							break;
						case "5":
							fact = stats.activeDeals;

							break;
						case "6":
							fact = stats.salesCount;
							arr.push(...wonItems);
							break;
						case "7":
							fact = stats.totalSales;
							arr.push(...wonItems);
							break;
					}

					const plan = toNumber(row.plan);
					const deviation = `${fact - plan > 0 ? "+" : ""} ${fact - plan}`;

					return {
						...row,
						id: uuid4(),
						fact,
						deviation,
						items: arr,
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
		<div
			style={{
				display: "grid",
				gridTemplateColumns: "2fr 1fr",
			}}
		>
			<div>
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
							{dayjs(start).format("DD.MM")}-{dayjs(end).format("DD.MM")}
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
					additionalData={{
						setRow: setRowItems,
					}}
				/>
			</div>

			<div>
				{Object.entries(
					rowItems?.items?.reduce(
						(acc, item) => {
							if (!acc[item.assignedById]) {
								acc[item.assignedById] = [];
							}

							acc[item.assignedById].push(item);

							return acc;
						},
						{} as Record<string, Deal[]>,
					) ?? {},
				).map(([id, items]) => {
					const user = users.find((user) => user.id === id);
					return user && <SalesCard key={id} user={user} deals={items} />;
				})}
			</div>
		</div>
	);
};
