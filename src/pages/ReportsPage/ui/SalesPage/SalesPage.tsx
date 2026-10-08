import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { usePeriodBorders } from "@/shared/hooks/usePeriodBorders";
import type { User } from "@/shared/types/types";
import { SegmentedControl } from "@/shared/ui/SegmentedControl/SegmentedControl";
import type { SalesCall } from "../../api/getSalesReportData";
import type { Deal } from "../../types/deals.types";
import { buildSalesMetrics } from "./model/salesReport";
import { useSalesReport } from "./model/useSalesReport";
import cls from "./SalesPage.module.scss";
import { SalesCard } from "./ui/SalesCard/SalesCard";

// Kept for the existing shared report types.
export type Call = SalesCall;

const rangeLabel = (start: string, end: string) =>
	`${dayjs(start).format("DD.MM.YYYY")} — ${dayjs(end).format("DD.MM.YYYY")}`;
const formatNumber = (value: number, currency = false) =>
	`${value.toLocaleString("ru-RU", { maximumFractionDigits: 2 })}${currency ? " ₽" : ""}`;

export const SalesPage = () => {
	const { setPeriod, start, end, period, setDay, goPrev, goNext } =
		usePeriodBorders("week", "workweek");
	const { snapshot, loading, error, refresh } = useSalesReport(
		start,
		end,
		period,
	);
	const [selectedRowId, setSelectedRowId] = useState("2");
	const rows = useMemo(
		() => (snapshot ? buildSalesMetrics(snapshot.source, snapshot.period) : []),
		[snapshot],
	);
	const selectedRow = rows.find((row) => row.id === selectedRowId);
	const groupedItems = useMemo(() => {
		const groups = new Map<string, Array<Deal | SalesCall>>();
		for (const item of selectedRow?.items ?? []) {
			const id = String(item.assignedById);
			groups.set(id, [...(groups.get(id) ?? []), item]);
		}
		return [...groups.entries()].sort(([left], [right]) => {
			const users = snapshot?.source.users ?? [];
			return (
				users.find((user) => user.id === left)?.title ?? left
			).localeCompare(
				users.find((user) => user.id === right)?.title ?? right,
				"ru",
			);
		});
	}, [selectedRow, snapshot]);
	const showingDifferentPeriod =
		snapshot &&
		(snapshot.start !== start ||
			snapshot.end !== end ||
			snapshot.period !== period);

	return (
		<div className={cls.page}>
			<header className={cls.header}>
				<div>
					<h1>Отчёт по продажам</h1>
					<p>План и факт отдела за выбранный период</p>
				</div>
				<button
					type="button"
					className={cls.currentButton}
					disabled={loading}
					onClick={refresh}
				>
					Обновить данные
				</button>
			</header>
			<div className={cls.workspace}>
				<section className={cls.panel} aria-label="Показатели продаж">
					<div className={cls.toolbar}>
						<SegmentedControl onChange={setPeriod} value={period} />
						<div className={cls.periodNavigation}>
							<button
								type="button"
								className={cls.navButton}
								aria-label="Предыдущий период"
								onClick={goPrev}
							>
								‹
							</button>
							<div className={cls.periodRange}>{rangeLabel(start, end)}</div>
							<button
								type="button"
								className={cls.navButton}
								aria-label="Следующий период"
								onClick={goNext}
							>
								›
							</button>
							<button
								type="button"
								className={cls.currentButton}
								onClick={() => setDay(dayjs())}
							>
								Текущий период
							</button>
						</div>
					</div>
					{error && (
						<div className={cls.error} role="alert">
							Не удалось обновить отчёт из Битрикс24.{" "}
							{snapshot
								? `Показаны последние загруженные данные за ${rangeLabel(snapshot.start, snapshot.end)}.`
								: "Показатели пока недоступны."}
							<button
								type="button"
								className={cls.currentButton}
								disabled={loading}
								onClick={refresh}
							>
								Повторить загрузку
							</button>
						</div>
					)}
					{loading && snapshot && (
						<div className={cls.refreshStatus} role="status">
							Обновляем данные. Показан отчёт за{" "}
							{rangeLabel(snapshot.start, snapshot.end)}.
						</div>
					)}
					{!loading && !error && showingDifferentPeriod && (
						<div className={cls.refreshStatus}>
							Показан отчёт за {rangeLabel(snapshot.start, snapshot.end)}.
						</div>
					)}
					{!snapshot ? (
						<div className={cls.loading} role="status">
							{loading ? "Загружаем звонки и сделки…" : "Отчёт не загружен"}
						</div>
					) : (
						<div className={cls.tableWrap}>
							<p className={cls.selectionHint} id="sales-summary-hint">
								Нажмите на показатель — его сделки или звонки появятся в списке
								ниже.
							</p>
							<table className={cls.table}>
								<thead>
									<tr>
										<th scope="col">Показатель</th>
										<th scope="col">План</th>
										<th scope="col">Факт</th>
										<th scope="col">Отклонение</th>
									</tr>
								</thead>
								<tbody>
									{rows.map((row) => (
										<tr
											key={row.id}
											tabIndex={0}
											aria-selected={selectedRowId === row.id}
											aria-controls="sales-details"
											aria-describedby="sales-summary-hint"
											onClick={() => setSelectedRowId(row.id)}
											onKeyDown={(event) => {
												if (event.key === "Enter" || event.key === " ") {
													event.preventDefault();
													setSelectedRowId(row.id);
												}
											}}
											className={
												selectedRowId === row.id ? cls.selectedRow : undefined
											}
										>
											<th scope="row">
												<span className={cls.metricLabel}>{row.title}</span>
												{row.meta && (
													<span className={cls.metricMeta}>{row.meta}</span>
												)}
											</th>
											<td className={cls.numberCell}>
												{formatNumber(row.plan, row.id === "7")}
											</td>
											<td className={cls.numberCell}>
												{formatNumber(row.fact, row.id === "7")}
											</td>
											<td
												className={`${cls.numberCell} ${row.deviation > 0 ? cls.deviationPositive : row.deviation < 0 ? cls.deviationNegative : cls.deviationNeutral}`}
											>
												{row.deviation > 0 ? "+" : ""}
												{formatNumber(row.deviation, row.id === "7")}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</section>
				{selectedRow && (
					<section
						className={cls.detailsColumn}
						id="sales-details"
						aria-label={`Детализация: ${selectedRow.title}`}
					>
						<div className={cls.detailsHeader}>
							<div>
								<h2>{selectedRow.title}</h2>
								<span className={cls.detailCount}>
									{selectedRow.type === "call" ? "Звонков" : "Сделок"}:{" "}
									{selectedRow.items.length}
								</span>
							</div>
						</div>
						<div className={cls.detailsBody}>
							{!groupedItems.length && (
								<p className={cls.empty}>За этот период данных нет.</p>
							)}
							{groupedItems.map(([id, items]) => {
								const user: User = snapshot?.source.users.find(
									(employee) => employee.id === id,
								) ?? {
									id,
									value: `Сотрудник #${id}`,
									title: `Сотрудник #${id}`,
									position: "",
									photo: "",
									department: 0,
								};
								return selectedRow.type === "deal" ? (
									<SalesCard
										key={`${selectedRow.id}-${id}`}
										user={user}
										deals={items as Deal[]}
										isTotal={selectedRow.id === "7"}
										layout="list"
									/>
								) : (
									<div key={id} className={cls.callsCard}>
										<div className={cls.callsCardTitle}>{user.title}</div>
										<div className={cls.callsCardValue}>
											{items.length.toLocaleString("ru-RU")} звонков
										</div>
									</div>
								);
							})}
						</div>
					</section>
				)}
			</div>
		</div>
	);
};
