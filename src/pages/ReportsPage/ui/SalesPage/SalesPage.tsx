import dayjs from "dayjs";
import { useEffect, useState } from "react";
import uuid4 from "uuid4";
import { UniversalTable } from "@/components/Table/universalTable/UniversalTable";
import { $api } from "@/shared/config";
import { DEPARTMENT_IDS, Endpoints } from "@/shared/constants/const";
import { useLoadAllData } from "@/shared/hooks/useLoadAllTasks";
import { useSprintBorders } from "@/shared/hooks/useSprintBorders";
import type { Header } from "@/shared/types/table";
import type { AnyObject, User } from "@/shared/types/types";
import { notify } from "@/shared/ui/NotificationPopup/notify";
import { getFixedNumber } from "@/shared/utils/getNumber";
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
					key={row?.id}
					style={{
						background: "#ccc",
					}}
					onClick={() => {
						additionalData?.setRow(row);

						if (row?.items?.length === 0) {
							notify({
								message: `${row.title} равно 0`,
								type: "warning",
							});
						}
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
		type: "call",
	},
	{
		title: "Количество созданных сделок",
		id: "2",
		plan: 22,
		type: "deal",
	},
	{
		title: "Количество проведенных ППО",
		id: "3",
		plan: 10,
		type: "deal",
	},
	{
		title: "Количество защит КП",
		id: "4",
		plan: 7,
		type: "deal",
	},
	{
		title: "Количество активных карточек в работе",
		id: "5",
		plan: 40,
		type: "deal",
	},
	{
		title: "Количество продаж",
		id: "6",
		plan: 2,
		type: "deal",
	},
	{
		title: "Сумма продаж",
		id: "7",
		plan: 250000,
		type: "deal",
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

export type Call = { id: string; assignedById: string };

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

	const { data: callsData, setFilters } = useLoadAllData<{
		ID: string;
		PORTAL_USER_ID: string;
	}>({
		initialEndpoint: Endpoints.calls,
		initialFilters: {
			params: {
				filter: {
					">=CALL_START_DATE": start,
					"<=CALL_START_DATE": dayjs(end).add(1, "day").format("YYYY-MM-DD"),
					"!PORTAL_USER_ID": 11,
				},
				select: ["ID", "PORTAL_USER_ID"],
			},
		},
		isTiems: false,
	});

	useEffect(() => {
		setFilters({
			params: {
				filter: {
					">=CALL_START_DATE": start,
					"<=CALL_START_DATE": dayjs(end).add(1, "day").format("YYYY-MM-DD"),
					"!PORTAL_USER_ID": 11,
				},
				select: ["ID", "PORTAL_USER_ID"],
			},
		});
	}, [end, start, setFilters]);

	useEffect(() => {
		const fetchCallsAmount = async () => {
			try {
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
					callCount: callsData.length,
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
					const arr: AnyObject[] = [];
					const details: Record<string, Deal[] | Call[]>[] = [];

					switch (row.id) {
						case "1":
							fact = stats.callCount;
							arr.push(
								...callsData.map((call) => ({
									assignedById: call.PORTAL_USER_ID,
									id: call.ID,
								})),
							);
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
							details.push(
								items.reduce(
									(acc, item) => {
										if (!acc[item.assignedById]) {
											acc[item.assignedById] = [];
										}

										acc[item.assignedById].push(item);

										return acc;
									},
									{} as Record<string, Deal[]>,
								),
							);
							break;
						case "3":
							fact = stats.ppoCount;
							arr.push(...ppoItems);
							details.push(
								ppoItems.reduce(
									(acc, item) => {
										if (!acc[item.assignedById]) {
											acc[item.assignedById] = [];
										}

										acc[item.assignedById].push(item);

										return acc;
									},
									{} as Record<string, Deal[]>,
								),
							);
							break;
						case "4":
							fact = stats.kpCount;
							arr.push(...kpItems);
							details.push(
								kpItems.reduce(
									(acc, item) => {
										if (!acc[item.assignedById]) {
											acc[item.assignedById] = [];
										}

										acc[item.assignedById].push(item);

										return acc;
									},
									{} as Record<string, Deal[]>,
								),
							);
							break;
						case "5":
							fact = stats.activeDeals;
							arr.push(
								...activeDealsCount.reduce(
									(acc, items) => acc.concat(items),
									[],
								),
							);
							break;
						case "6":
							fact = stats.salesCount;
							arr.push(...wonItems);
							details.push(
								wonItems.reduce(
									(acc, item) => {
										if (!acc[item.assignedById]) {
											acc[item.assignedById] = [];
										}

										acc[item.assignedById].push(item);

										return acc;
									},
									{} as Record<string, Deal[]>,
								),
							);
							break;
						case "7":
							fact = stats.totalSales;
							arr.push(...wonItems);
							details.push(
								wonItems.reduce(
									(acc, item) => {
										if (!acc[item.assignedById]) {
											acc[item.assignedById] = [];
										}

										acc[item.assignedById].push(item);

										return acc;
									},
									{} as Record<string, Deal[]>,
								),
							);
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
						details,
					};
				});

				setData(preparedData);
			} catch (error) {
				console.error(error);
			}
		};

		fetchCallsAmount();
	}, [start, end, callsData.map, callsData.length]);

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
					additionalData={{
						setRow: setRowItems,
					}}
					fallbackText="Загружаем сделки..."
				/>
			</div>

			{rowItems?.items && (
				<div key={rowItems.id}>
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
						return rowItems.type === "deal" ? (
							user && (
								<SalesCard
									key={id}
									user={user}
									deals={items}
									isTotal={rowItems?.title === "Сумма продаж"}
								/>
							)
						) : (
							<div
								key={rowItems.id + id}
								style={{
									display: "flex",
									flexDirection: "column",
									gap: "16px",
									padding: "16px",
									border: "1px solid #e5e7eb",
									borderRadius: "16px",
									background: "#ffffff",
									boxShadow: "0 4px 20px rgba(15, 23, 42, 0.06)",
								}}
							>
								{user?.title ?? "Неизвестный пользователь"}
								<div
									style={{
										display: "flex",
										alignItems: "center",
										justifyContent: "space-between",
										paddingBottom: "12px",
									}}
								>
									<div
										style={{
											width: "100%",
										}}
									>
										Кол-во звонков: {items.length}
									</div>
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
};
