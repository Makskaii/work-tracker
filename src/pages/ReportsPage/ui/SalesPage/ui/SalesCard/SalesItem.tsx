import dayjs from "dayjs";
import type { Deal } from "@/pages/ReportsPage/types/deals.types";
import { SalesCodes } from "@/pages/ReportsPage/types/types";
import cls from "./SalesCard.module.scss";

const formatDate = (value?: string) => {
	if (!value) return "—";
	const calendarDate = value.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
	const date = dayjs(calendarDate ?? value);
	if (
		!date.isValid() ||
		(calendarDate && date.format("YYYY-MM-DD") !== calendarDate)
	) {
		return "—";
	}
	return date.format("DD.MM.YYYY");
};

export const SalesItem = ({
	deal,
	onTitleClick,
	layout = "cards",
}: {
	deal: Deal;
	onTitleClick?: () => void;
	layout?: "cards" | "list";
}) => {
	const amount = Number(deal.opportunity);
	const hasAmount =
		deal.opportunity !== null &&
		deal.opportunity !== undefined &&
		String(deal.opportunity).trim() !== "" &&
		Number.isFinite(amount);
	const title = deal.title?.trim() || `Сделка №${deal.id}`;
	const isList = layout === "list";
	const className = `${cls.deal} ${isList ? cls.dealRow : ""}`;
	const content = (
		<>
			<span className={cls.dealHeading}>
				<span className={cls.dealTitle}>{title}</span>
				{onTitleClick && (
					<span className={cls.openIcon} aria-hidden="true">
						↗
					</span>
				)}
			</span>
			{(hasAmount || isList) && (
				<span className={cls.amount}>
					{hasAmount
						? `${amount.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} ₽`
						: "—"}
				</span>
			)}
			<span className={cls.dealDates}>
				<span>
					<span className={cls.dateLabel}>ППО</span>
					{formatDate(deal[SalesCodes.ppoDay])}
				</span>
				<span>
					<span className={cls.dateLabel}>КП</span>
					{formatDate(deal[SalesCodes.kpday])}
				</span>
			</span>
		</>
	);

	return onTitleClick ? (
		<button
			type="button"
			className={className}
			aria-label={`Открыть сделку «${title}»`}
			onClick={onTitleClick}
		>
			{content}
		</button>
	) : (
		<div className={className}>{content}</div>
	);
};
