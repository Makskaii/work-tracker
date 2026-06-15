import {
	PAYMENT_KIND_BY_SORT,
	PAYMENT_SORT_TITLES,
	type PaymentSort,
} from "@/components/calendar/helpers/paymentType";
import { formatHours } from "../model/utils";
import cls from "../ReportsCalendar.module.scss";

type SummaryCardProps = {
	title: string;
	paymentSummary: Record<PaymentSort, number>;
	showNotAtWork: boolean;
	notAtWorkHours: number;
};

export const SummaryCard = ({
	title,
	paymentSummary,
	showNotAtWork,
	notAtWorkHours,
}: SummaryCardProps) => (
	<section className={cls.summaryCard}>
		<h3>{title}</h3>
		<div className={cls.summarySubtitle}>Сводка по выбранному периоду</div>
		<div className={cls.summaryGrid}>
			{([0, 1, 2] as PaymentSort[]).map((sort) => {
				const kind = PAYMENT_KIND_BY_SORT[sort];

				return (
					<div key={sort} className={`${cls.summaryItem} ${cls[kind]}`}>
						<span>{PAYMENT_SORT_TITLES[sort]}</span>
						<strong>{formatHours(paymentSummary[sort])}</strong>
					</div>
				);
			})}
			{showNotAtWork && (
				<div className={`${cls.summaryItem} ${cls.notAtWork}`}>
					<span>not at work</span>
					<strong>{formatHours(notAtWorkHours)}</strong>
				</div>
			)}
		</div>
	</section>
);
