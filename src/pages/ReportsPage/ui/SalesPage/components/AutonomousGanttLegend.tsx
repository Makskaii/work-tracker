import styles from "../SalesProfitabilityReport.module.scss";
export const AutonomousGanttLegend = () => (
  <div className={styles.ganttLegend}>
    <span><i className={styles.legendPlan} /> Плановый период</span>
    <span>Завершённость этапов отмечается вручную; фактические даты будут поступать из ежедневной отчётности.</span>
  </div>
);
