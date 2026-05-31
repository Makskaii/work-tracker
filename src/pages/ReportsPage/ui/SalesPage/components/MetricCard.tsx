import styles from "../SalesProfitabilityReport.module.scss";

type MetricCardProps = {
	title: string;
	value: string;
	accent?: boolean;
	danger?: boolean;
	success?: boolean;
	muted?: boolean;
};

export const MetricCard = ({
	title,
	value,
	accent,
	danger,
	success,
	muted,
}: MetricCardProps) => (
	<div
		className={`${styles.metricCard} ${accent ? styles.accentMetric : ""} ${
			danger ? styles.dangerMetric : ""
		} ${success ? styles.successMetric : ""} ${muted ? styles.mockMetric : ""}`}
	>
		<span>{title}</span>
		<strong>{value}</strong>
		{muted ? <small>mock / disabled</small> : null}
	</div>
);
