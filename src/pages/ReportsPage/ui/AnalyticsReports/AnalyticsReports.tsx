import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/modal";
import { Spinner } from "@/components/spinner/Spinner";
import { $api } from "@/shared/config";
import { DEPARTMENT_IDS, Endpoints } from "@/shared/constants/const";
import { useBitrixSlider } from "@/shared/hooks/useBitrixSlider";
import { usePeriodBorders } from "@/shared/hooks/usePeriodBorders";
import type { User } from "@/shared/types/types";
import { getDeals } from "../../api/getDeals";
import type { Deal } from "../../types/deals.types";
import { SalesCodes } from "../../types/types";
import styles from "./AnalyticsReports.module.scss";
import { DealCard } from "./DealCard";

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
					"@UF_DEPARTMENT": [DEPARTMENT_IDS.ANALYTICS],
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

type Period = "week" | "month" | "quarter" | "year";

type MetricCardProps = {
	title: string;
	value?: string | number | undefined;
	onClick?: () => void;
};

type SegmentedControlProps = {
	value: Period;
	onChange: (value: Period) => void;
};

const periodLabels: Record<Period, string> = {
	week: "Неделя",
	month: "Месяц",
	quarter: "Квартал",
	year: "Год",
};

function SegmentedControl({ value, onChange }: SegmentedControlProps) {
	const options: Period[] = ["week", "month", "quarter", "year"];

	return (
		<div className={styles.segmented}>
			{options.map((option) => (
				<button
					key={option}
					type="button"
					className={`${styles.segmentedItem} ${
						value === option ? styles.segmentedItemActive : ""
					}`}
					onClick={() => onChange(option)}
				>
					{periodLabels[option]}
				</button>
			))}
		</div>
	);
}

function DateRangeButton({ value }: { value: string }) {
	return (
		<button type="button" className={styles.dateButton}>
			{value}
		</button>
	);
}

function MetricCard({ title, value, onClick }: MetricCardProps) {
	return (
		<button type="button" className={`${styles.metricCard}`} onClick={onClick}>
			<div className={styles.metricCardTop}>
				<div className={styles.metricCardTitle}>{title}</div>
				<div className={styles.metricCardChevron}>›</div>
			</div>

			<div className={styles.metricCardTitle}>{value}</div>
		</button>
	);
}

function AnalyticsCommertialReportPage() {
	const [data, setData] = useState<
		{
			title: string;
			value?: string | number;
			items?: Deal[];
		}[]
	>([]);
	const [loading, setLoading] = useState(false);
	const [users, setUsers] = useState<User[]>([]);
	const [selectedUser, setSelectedUser] = useState<string>("");
	const [open, setOpen] = useState(false);
	const [activeItems, setActiveItems] = useState<Deal[]>([]);

	const { setPeriod, start, end, period } = usePeriodBorders(
		"week",
		"workweek",
	);

	const { openTask } = useBitrixSlider();

	const analyticFilter = useMemo(
		() => (selectedUser !== "" ? { [SalesCodes.analytic]: selectedUser } : {}),
		[selectedUser],
	);

	useEffect(() => {
		const fetchCallsAmount = async () => {
			setLoading(true);
			try {
				const users = await getUsers();
				const [ppoItems, kpItems, wonItems] = await Promise.all([
					await getDeals({
						categoryId: 0,
						[`>=${SalesCodes.ppoDay}`]: start,
						[`<=${SalesCodes.ppoDay}`]: end,
						[SalesCodes.ppoSuccess]: 390,
						...analyticFilter,
					}),
					await getDeals({
						categoryId: 0,
						[`>=${SalesCodes.kpday}`]: start,
						[`<=${SalesCodes.kpday}`]: end,
						[SalesCodes.kpSuccess]: 388,
						...analyticFilter,
					}),
					await getDeals({
						">=movedTime": start,
						"<=movedTime": end,
						categoryId: 0,
						stageId: "WON",
						...analyticFilter,
					}),
				]);
				console.log({ ppoItems, kpItems, wonItems });

				const metrics = [
					{
						title: "Количество ППО",
						value: ppoItems.length,
						items: ppoItems,
					},
					{
						title: "Количество защит КП",
						value: kpItems.length,
						items: kpItems,
					},
					{
						title: "Количество посчитанных смет",
						value: kpItems.length,
					},
					{
						title: "Количество продаж",
						value: wonItems.reduce((acc: number, item) => {
							if (item.stageId === "WON") {
								return acc + Number(item.opportunity || 0);
							}
							return acc;
						}, 0),
						items: wonItems,
					},
					{
						title: "Средняя сумма сметы",
						value: kpItems.reduce((acc: number, item) => {
							return (
								acc + Number(item[SalesCodes.estimateCost]?.split("|")[0] || 0)
							);
						}, 0),
						items: kpItems.filter((deal) => deal[SalesCodes.estimateCost]),
					},
					{
						title: "Средняя сумма проданных смет",
						value: wonItems.reduce((acc: number, item) => {
							if (item.stageId === "WON") {
								return (
									acc + Number(item[SalesCodes.totalCost]?.split("|")[0] || 0)
								);
							}
							return acc;
						}, 0),
					},
					{
						title: "Средняя сумма выигранных сделок",
						value:
							wonItems.length !== 0
								? wonItems.reduce((acc: number, item) => {
										if (item.stageId === "WON") {
											return (
												acc +
												Number(item[SalesCodes.totalCost]?.split("|")[0] || 0)
											);
										}
										return acc;
									}, 0) / wonItems.length
								: 0,
					},
				];

				setData(metrics);

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
			} catch (error) {
				console.error(error);
			} finally {
				setLoading(false);
			}
		};

		fetchCallsAmount();
	}, [start, end, analyticFilter]);

	return (
		<section className={styles.section}>
			<div className={styles.headerCard}>
				<div className={styles.header}>
					<div className={styles.headerContent}>
						<h2 className={styles.title}>
							Отчёт по коммерческой эффективности отдела аналитики
						</h2>
					</div>

					<div className={styles.headerControls}>
						<SegmentedControl value={period} onChange={setPeriod} />
						<select
							className={styles.select}
							value={selectedUser}
							onChange={(e) => setSelectedUser(e.target.value)}
						>
							<option value={""}>Весь отдел</option>
							{users.map((user) => (
								<option key={user.id} value={String(user.id)}>
									{user.title}
								</option>
							))}
						</select>
						<DateRangeButton
							value={`${dayjs(start).format("DD-MM-YYYY")} - ${dayjs(end).format("DD-MM-YYYY")}`}
						/>
					</div>
				</div>
			</div>

			<div className={styles.metricsSection}>
				<div className={styles.metricsHead}>
					<h3 className={styles.metricsTitle}>Ключевые показатели</h3>
				</div>
				<></>

				{loading ? (
					<div
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							height: "300px",
						}}
					>
						<Spinner text="Загружаем данные" />
					</div>
				) : (
					<div className={styles.metricsGrid}>
						{data.map((metric) => {
							return (
								<MetricCard
									key={metric.title}
									title={metric.title}
									value={metric.value}
									onClick={() => {
										if (!metric.items) return;
										setActiveItems(metric.items);
										setOpen(true);
										console.log("open drawer:", metric.title);
									}}
								/>
							);
						})}
					</div>
				)}
			</div>

			<Modal onClose={() => setOpen(false)} isOpen={open} innerScroll>
				{activeItems.map((item) => (
					<DealCard
						deal={item}
						analyticName={
							users.find(
								(user) => Number(user.id) === item[SalesCodes.analytic],
							)?.title
						}
						onClick={() => openTask(item.id)}
					/>
				))}
			</Modal>
		</section>
	);
}

export default AnalyticsCommertialReportPage;
