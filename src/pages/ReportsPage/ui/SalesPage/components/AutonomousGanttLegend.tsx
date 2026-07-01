import styles from "../SalesProfitabilityReport.module.scss";

export const AutonomousGanttLegend = () => (
	<div className={styles.ganttLegend}>
		<span>
			<i className={styles.legendPlan} /> Плановый период
		</span>
		<span>
			<i className={styles.legendFact} /> Фактическая работа
		</span>
		<span>
			<i className={styles.legendLate} /> Поздний старт
		</span>
		<span>
			<i className={styles.legendEarly} /> Ранний старт
		</span>
		<span>
			<i className={styles.legendOverdue} /> Просрочка завершения
		</span>
		<span>
			<i className={styles.legendReserve} /> Запас до планового срока
		</span>
		<span>
			<i className={styles.legendSign} /> Подписание ТЗ
		</span>
		<span>
			<i className={styles.legendClose} /> Акт / закрытие
		</span>
	</div>
);
