import styles from "../SalesProfitabilityReport.module.scss";

export const ProfitabilitySkeleton = () => (
	<div className={styles.skeletonWrap}>
		<div className={styles.skeletonCards}>
			{Array.from({ length: 6 }, (_, index) => (
				<span key={index} />
			))}
		</div>
		<div className={styles.skeletonTable}>
			{Array.from({ length: 5 }, (_, index) => (
				<span key={index} />
			))}
		</div>
	</div>
);
