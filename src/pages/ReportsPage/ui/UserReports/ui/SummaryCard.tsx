import {
	REPORT_CATEGORIES,
	REPORT_CATEGORY_TITLES,
	type ReportCategory,
} from "@/components/calendar/helpers/reportCategory";
import { formatHours } from "../model/utils";
import cls from "../ReportsCalendar.module.scss";

type SummaryCardProps = {
	title: string;
	summary: Record<ReportCategory, number>;
};

export const SummaryCard = ({ title, summary }: SummaryCardProps) => (
	<section className={cls.summaryCard}>
		<h3>{title}</h3>
		<div className={cls.summarySubtitle}>Сводка по выбранному периоду</div>
		<div className={cls.summaryGrid}>
			{REPORT_CATEGORIES.map((category) => (
				<div
					key={category}
					className={cls.categorySummary}
					data-category={category}
				>
					<span>{REPORT_CATEGORY_TITLES[category]}</span>
					<strong>{formatHours(summary[category])}</strong>
				</div>
			))}
		</div>
	</section>
);
