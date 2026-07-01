import type { GanttMonthTick, GanttWeekTick } from "../model/ganttTypes";
import styles from "../SalesProfitabilityReport.module.scss";

export const AutonomousGanttScale = ({
	monthTicks,
	weekTicks,
}: {
	monthTicks: GanttMonthTick[];
	weekTicks: GanttWeekTick[];
}) => (
	<div className={styles.ganttScaleHeader}>
		<div className={styles.ganttMonthScale}>
			{monthTicks.map((tick) => (
				<span key={tick.date.toISOString()} style={tick.style}>
					{tick.label}
				</span>
			))}
		</div>
		<div className={styles.ganttWeekScale}>
			{weekTicks.map((tick) => (
				<span key={tick.date.toISOString()} style={tick.style}>
					{tick.label}
				</span>
			))}
		</div>
	</div>
);

export const AutonomousGanttTrackGrid = ({
	monthTicks,
	weekTicks,
}: {
	monthTicks: GanttMonthTick[];
	weekTicks: GanttWeekTick[];
}) => (
	<>
		{weekTicks.map((tick) => (
			<i
				key={`week-${tick.date.toISOString()}`}
				className={styles.ganttTrackWeekLine}
				style={tick.style}
			/>
		))}
		{monthTicks.map((tick) => (
			<i
				key={`month-${tick.date.toISOString()}`}
				className={styles.ganttTrackMonthLine}
				style={{ left: tick.style.left }}
			/>
		))}
	</>
);
