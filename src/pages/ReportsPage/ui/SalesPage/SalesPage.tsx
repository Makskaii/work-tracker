import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { UniversalTable } from "@/components/Table/universalTable/UniversalTable";
import { Endpoints } from "@/shared/constants/const";
import { useLoadAllData } from "@/shared/hooks/useLoadAllTasks";
import { usePeriodBorders } from "@/shared/hooks/usePeriodBorders";
import type { Header } from "@/shared/types/table";
import type { AnyObject, User } from "@/shared/types/types";
import { notify } from "@/shared/ui/NotificationPopup/notify";
import { getDeals } from "../../api/getDeals";
import { getUsers } from "../../api/getUsers";
import type { Deal } from "../../types/deals.types";
import {
	SalesCodes,
	type SalesFields,
	type SalesTableFields,
} from "../../types/types";
import { SegmentedControl } from "../AnalyticsReports/AnalyticsReports";
import { periodLabelMap } from "./model/periodLabelMap";
import cls from "./SalesPage.module.scss";
import { SalesCard } from "./ui/SalesCard/SalesCard";

const getPlanByPeriod = (
	row: Omit<SalesTableFields, "fact" | "deviation" | "comment">,
	period: string,
) => {
	if (row.id === "5") return row.plan;

	if (row.id === "7") return row.plan;

	if (period === "week") return row.plan;

	if (period === "month") return Number(row.plan) * 4;

	if (period === "quarter") return Number(row.plan) * 13;

	if (period === "year") return Number(row.plan) * 52;

	return row.plan;
};
const headersForSales: Header<SalesTableFields>[] = [
	{
		title: "Данные",
		key: "title",
	},
	{
		title: "Плановые показатели",
		key: "plan",
		convertFn: (value, additionalData) => {
			if (additionalData?.row.id === "5") return value;

			if (additionalData?.row.id === "7") return value;

			if (additionalData?.period === "week") return value;

			if (additionalData?.period === "month") return Number(value) * 4;

			if (additionalData?.period === "quarter") return Number(value) * 13;

			if (additionalData?.period === "year") return Number(value) * 52;

			return value;
		},
	},
	{
		title: "Фактические показатели",
		key: "fact",
	},
	{
		title: "Отклонение",
		key: "deviation",
	},
	{
		title: "Действия",
		key: "id",
		render: (_value, additionalData) => {
			const row = additionalData?.row as SalesTableFields | undefined;
			const handleDetailsClick = () => {
				if (!row) return;

				if (!row.items?.length) {
					notify({
						message: `${row.title}: 0`,
						type: "warning",
					});
					return;
				}

				additionalData?.setSelectedRowId?.(row.id);
			};

			return (
				<button
					type="button"
					className={cls.detailsButton}
					onClick={handleDetailsClick}
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
		plan: 15,
		type: "deal",
	},
	{
		title: "Количество проведенных ППО",
		id: "3",
		plan: 7,
		type: "deal",
	},
	{
		title: "Количество защит КП",
		id: "4",
		plan: 5,
		type: "deal",
	},
	{
		title: "Количество активных карточек в работе",
		id: "5",
		plan: 40,
		type: "deal",
	},
	{
		title: "Сумма продаж",
		id: "7",
		plan: 1000000,
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
	signal,
}: {
	start: string;
	end: string;
	categoryId?: number;
	signal?: AbortSignal;
}) => {
	const responses = await Promise.all(
		TARGET_STAGE_IDS.map((stageId) =>
			getDeals(
				{
					categoryId,
					stageId,
				},
				signal,
			),
		),
	);

	return responses;
};

const getPeriodStep = (period: "week" | "month" | "quarter" | "year") => {
	switch (period) {
		case "week":
			return { value: 7, unit: "day" as const };
		case "month":
			return { value: 1, unit: "month" as const };
		case "quarter":
			return { value: 3, unit: "month" as const };
		case "year":
			return { value: 1, unit: "year" as const };
		default:
			return { value: 7, unit: "day" as const };
	}
};

export const SalesPage = () => {
	const [data, setData] = useState<SalesTableFields[]>([]);
	const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

	const selectedRow = useMemo(() => {
		return data.find((row) => row.id === selectedRowId);
	}, [data, selectedRowId]);
	const [users, setUsers] = useState<User[]>([]);

	const { setPeriod, start, end, period, setDay } = usePeriodBorders(
		"week",
		"workweek",
	);

	const step = getPeriodStep(period);

	const {
		data: callsData,
		setFilters,
		loading,
	} = useLoadAllData<{
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
		const controller = new AbortController();
		const { signal } = controller;

		const fetchCallsAmount = async () => {
			try {
				const [items, ppoItems, kpItems, activeDealsCount, wonItems, users] =
					await Promise.all([
						getDeals(
							{
								">=createdTime": start,
								"<=createdTime": end,
								categoryId: 0,
							},
							signal,
						),
						getDeals(
							{
								">=createdTime": dayjs(start)
									.subtract(30, "day")
									.format("YYYY-MM-DD"),
								"<=createdTime": end,
								categoryId: 0,
								[`>=${SalesCodes.ppoDay}`]: start,
								[`<=${SalesCodes.ppoDay}`]: end,
								[SalesCodes.ppoSuccess]: 390,
							},
							signal,
						),
						getDeals(
							{
								">=createdTime": dayjs(start)
									.subtract(30, "day")
									.format("YYYY-MM-DD"),
								"<=createdTime": end,
								categoryId: 0,
								[`>=${SalesCodes.kpday}`]: start,
								[`<=${SalesCodes.kpday}`]: end,
								[SalesCodes.kpSuccess]: 388,
							},
							signal,
						),
						getDealsCountByStages({
							start: dayjs(start).subtract(17, "day").format("YYYY-MM-DD"),
							end,
							categoryId: 0,
							signal,
						}),
						getDeals(
							{
								">=movedTime": start,
								"<=movedTime": dayjs(end).add(1, "day").format("YYYY-MM-DD"),
								categoryId: 0,
								stageId: "WON",
							},
							signal,
						),
						getUsers(signal),
					]);

				if (signal.aborted) {
					return;
				}

				setUsers(
					users
						.map((user) => ({
							id: user.ID,
							value: `${user.NAME} ${user.LAST_NAME}`,
							title: `${user.NAME} ${user.LAST_NAME}`,
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
								...activeDealsCount.reduce<AnyObject[]>(
									(acc, items) => acc.concat(items),
									[],
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

					const plan = Number(getPlanByPeriod(row, period));

					const deviation = `${fact - plan > 0 ? "+" : ""} ${fact - plan}`;

					return {
						...row,
						id: row.id,
						fact,
						deviation,
						items: arr,
						details,
					};
				});

				if (signal.aborted) {
					return;
				}

				setData(preparedData);
			} catch (error) {
				if (error instanceof DOMException && error.name === "AbortError") {
					return;
				}

				console.error(error);
			}
		};

		fetchCallsAmount();

		return () => {
			controller.abort();
		};
	}, [start, end, callsData, period]);

	return (
		<div className={cls.page}>
			<div className={cls.panel}>
				<div className={cls.controls}>
					<SegmentedControl
						onChange={setPeriod}
						value={period}
						loading={loading}
					/>

					<button
						disabled={loading}
						className={cls.navButton}
						onClick={() => {
							setDay((prev) => prev.subtract(step.value, step.unit));
						}}
					>
						пред. {periodLabelMap[period]}
					</button>

					<div className={cls.periodRange}>
						<div>
							{dayjs(start).format("DD.MM")} - {dayjs(end).format("DD.MM")}
						</div>
					</div>

					<button
						className={cls.navButton}
						onClick={() => {
							setDay((prev) => prev.add(step.value, step.unit));
						}}
					>
						след. {periodLabelMap[period]}
					</button>
				</div>

				<UniversalTable<SalesTableFields>
					headers={headersForSales}
					activeItems={data}
					additionalData={{
						setSelectedRowId,
						period,
					}}
					fallbackText="Загружаем сделки..."
					loading={loading}
				/>
			</div>

			{selectedRow?.items?.length ? (
				<div key={selectedRow.id} className={cls.detailsColumn}>
					{Object.entries(
						selectedRow.items.reduce(
							(acc, item) => {
								const assignedById = String(item.assignedById);

								if (!acc[assignedById]) {
									acc[assignedById] = [];
								}

								acc[assignedById].push(item);

								return acc;
							},
							{} as Record<string, Array<Deal | Call>>,
						),
					).map(([id, items]) => {
						const user = users.find((user) => String(user.id) === String(id));

						if (selectedRow.type === "deal") {
							return (
								<SalesCard
									key={`${selectedRow.id}-${id}`}
									user={
										user ?? {
											id,
											value: "Неизвестный пользователь",
											title: "Неизвестный пользователь",
											position: "",
											photo: "",
											department: 0,
										}
									}
									deals={items as Deal[]}
									isTotal={selectedRow.title === "Сумма продаж"}
								/>
							);
						}

						return (
							<div key={`${selectedRow.id}-${id}`} className={cls.callsCard}>
								<div className={cls.callsCardTitle}>
									{user?.title ?? "Неизвестный пользователь"}
								</div>

								<div className={cls.callsCardHeader}>
									<div style={{ width: "100%" }}>
										Кол-во звонков: {items.length}
									</div>
								</div>
							</div>
						);
					})}
				</div>
			) : null}
		</div>
	);
};
