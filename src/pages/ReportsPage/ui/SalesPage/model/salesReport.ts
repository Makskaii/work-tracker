import type { Period } from "@/shared/hooks/usePeriodBorders";
import type {
	SalesCall,
	SalesReportSource,
} from "../../../api/getSalesReportData";
import type { Deal } from "../../../types/deals.types";

export type SalesMetric = {
	id: string;
	title: string;
	plan: number;
	fact: number;
	deviation: number;
	type: "call" | "deal";
	items: Array<Deal | SalesCall>;
	meta?: string;
};

export const isReportableSalesDeal = (deal: Pick<Deal, "title">) =>
	!/открытая\s+линия\s+evolution/i.test(String(deal.title ?? ""));

export const buildSalesMetrics = (
	source: SalesReportSource,
	period: Period,
): SalesMetric[] => {
	const multiplier = { week: 1, month: 4, quarter: 13, year: 52 }[period];
	const visible = (deals: Deal[]) => deals.filter(isReportableSalesDeal);
	const created = visible(source.created).filter(
		(deal) => !["UC_9X7H19", "UC_B20EGT"].includes(deal.stageId),
	);
	const won = visible(source.won);
	const definitions = [
		{
			id: "1",
			title: "Звонки по отделу",
			plan: 700 * multiplier,
			type: "call" as const,
			items: source.calls,
		},
		{
			id: "2",
			title: "Созданные сделки",
			plan: 15 * multiplier,
			type: "deal" as const,
			items: created,
		},
		{
			id: "3",
			title: "Проведённые ППО",
			plan: 7 * multiplier,
			type: "deal" as const,
			items: visible(source.ppo),
		},
		{
			id: "4",
			title: "Защиты КП",
			plan: 5 * multiplier,
			type: "deal" as const,
			items: visible(source.kp),
		},
		{
			id: "5",
			title: "Активные карточки в работе",
			plan: 40,
			type: "deal" as const,
			items: visible(source.active),
			meta: "На текущий момент",
		},
		{
			id: "7",
			title: "Сумма продаж",
			plan: 1_000_000,
			type: "deal" as const,
			items: won,
		},
	];
	return definitions.map((row) => {
		const fact =
			row.id === "7"
				? won.reduce((sum, deal) => {
						const value = Number(deal.opportunity || 0);
						return sum + (Number.isFinite(value) ? value : 0);
					}, 0)
				: row.items.length;
		return { ...row, fact, deviation: fact - row.plan };
	});
};
