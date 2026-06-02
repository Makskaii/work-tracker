import { useMemo } from "react";
import type {
	GanttMilestone,
	GanttStage,
	GanttTimeline,
} from "../model/ganttTypes";
import {
	buildProjectGantt,
	formatDateFull,
	formatDateShort,
	formatDeviation,
	getDateMax,
	getDateMin,
	getGanttTimeline,
	getMilestoneStyle,
	getMonthTicks,
	getSegmentStyle,
	getStageDeviation,
	getStageStatus,
} from "../model/ganttUtils";
import type { ProfitabilityProject } from "../model/types";
import styles from "../SalesProfitabilityReport.module.scss";

export const ProjectGantt = ({
	project,
}: {
	project: ProfitabilityProject | null;
}) => {
	const today = useMemo(() => {
		const currentDate = new Date();

		return new Date(
			currentDate.getFullYear(),
			currentDate.getMonth(),
			currentDate.getDate(),
		);
	}, []);
	const gantt = useMemo(
		() => buildProjectGantt(project, today),
		[project, today],
	);
	const timeline = useMemo(
		() => getGanttTimeline(gantt.rows, today),
		[gantt.rows, today],
	);
	const monthTicks = useMemo(() => getMonthTicks(timeline), [timeline]);
	const hasDates = gantt.rows.some((row) =>
		row.type === "milestone"
			? row.milestone.date
			: row.stage.planStart || row.stage.planEnd || row.stage.factStart,
	);

	return (
		<div className={styles.ganttCard}>
			<div className={styles.ganttHeader}>
				<div>
					<h3>Диаграмма Ганта: {gantt.summary.projectTitle}</h3>
					<p>План пересчитывается по зависимостям между этапами</p>
				</div>
			</div>

			<div className={styles.ganttMetrics}>
				<GanttMetric title="Проект" value={gantt.summary.projectTitle} accent />
				<GanttMetric
					title="Плановое завершение"
					value={formatDateShort(gantt.summary.finalPlanEnd)}
				/>
				<GanttMetric
					title="Факт / текущее завершение"
					value={formatDateShort(gantt.summary.currentFinish)}
				/>
				<GanttMetric
					title="Отклонение проекта"
					value={formatDeviation(gantt.summary.projectDeviation)}
					danger={(gantt.summary.projectDeviation ?? 0) > 0}
				/>
				<GanttMetric
					title="Просроченных этапов"
					value={String(gantt.summary.overdueStages)}
					danger={gantt.summary.overdueStages > 0}
				/>
				<GanttMetric
					title="Этапов раньше плана"
					value={String(gantt.summary.earlyStages)}
					success={gantt.summary.earlyStages > 0}
				/>
				<GanttMetric
					title="Суммарная просрочка"
					value={`${gantt.summary.totalOverdueDays} дн.`}
					danger={gantt.summary.totalOverdueDays > 0}
				/>
				<GanttMetric
					title="Дата подписания ТЗ"
					value={formatDateShort(gantt.summary.tzSignDate)}
					warning
				/>
			</div>

			<GanttLegend />

			<div className={styles.ganttBoard}>
				<div className={styles.ganttScaleLabel}>Этапы проекта</div>
				<div className={styles.ganttScale}>
					{monthTicks.map((tick) => (
						<span key={tick.date.toISOString()} style={tick.style}>
							{tick.label}
						</span>
					))}
				</div>

				{hasDates ? (
					gantt.rows.map((row) =>
						row.type === "milestone" ? (
							<GanttMilestoneRow
								key={row.milestone.id}
								milestone={row.milestone}
								timeline={timeline}
							/>
						) : (
							<GanttStageRow
								key={row.stage.id}
								stage={row.stage}
								timeline={timeline}
								today={today}
							/>
						),
					)
				) : (
					<div className={styles.ganttEmpty}>
						Заполните даты и длительности этапов в проекте, чтобы построить Гант.
					</div>
				)}
			</div>

			<GanttStageTable stages={gantt.stages} today={today} />
		</div>
	);
};

const GanttMetric = ({
	title,
	value,
	accent,
	danger,
	success,
	warning,
}: {
	title: string;
	value: string;
	accent?: boolean;
	danger?: boolean;
	success?: boolean;
	warning?: boolean;
}) => (
	<div
		className={`${styles.ganttMetric} ${accent ? styles.ganttMetricAccent : ""} ${
			danger ? styles.ganttMetricDanger : ""
		} ${success ? styles.ganttMetricSuccess : ""} ${
			warning ? styles.ganttMetricWarning : ""
		}`}
	>
		<span>{title}</span>
		<strong>{value}</strong>
	</div>
);

const GanttLegend = () => (
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

const GanttStageRow = ({
	stage,
	timeline,
	today,
}: {
	stage: GanttStage;
	timeline: GanttTimeline;
	today: Date;
}) => {
	const factEnd =
		stage.factEnd ??
		(stage.factStart ? getDateMax(stage.factStart, today) : null);
	const status = getStageStatus(stage, today);
	const planSegment =
		stage.planStart && stage.planEnd
			? {
					start: stage.planStart,
					end: stage.planEnd,
				}
			: null;
	const factStartInPlan =
		planSegment && stage.factStart
			? getDateMax(stage.factStart, planSegment.start)
			: null;
	const factEndInPlan =
		planSegment && factEnd ? getDateMin(factEnd, planSegment.end) : null;
	const factSegment =
		factStartInPlan && factEndInPlan && factEndInPlan > factStartInPlan
			? {
					start: factStartInPlan,
					end: factEndInPlan,
				}
			: null;
	const lateStart =
		planSegment &&
		stage.factStart &&
		stage.factStart > planSegment.start &&
		planSegment.end > planSegment.start
			? {
					start: planSegment.start,
					end: getDateMin(stage.factStart, planSegment.end) ?? planSegment.end,
				}
			: null;
	const earlyStart =
		stage.planStart && stage.factStart && stage.factStart < stage.planStart
			? {
					start: stage.factStart,
					end: stage.planStart,
				}
			: null;
	const overdue =
		stage.planEnd &&
		((stage.factEnd && stage.factEnd > stage.planEnd) ||
			(!stage.factEnd && today > stage.planEnd))
			? {
					start: stage.planEnd,
					end: stage.factEnd ?? today,
				}
			: null;
	const reserve =
		stage.planEnd && stage.factEnd && stage.factEnd < stage.planEnd
			? {
					start: stage.factEnd,
					end: stage.planEnd,
				}
			: null;

	return (
		<>
			<div className={styles.ganttRowInfo}>
				<strong>{stage.title}</strong>
				<span>{stage.description}</span>
				<small>
					План: {formatDateFull(stage.planStart)} -{" "}
					{formatDateFull(stage.planEnd)}
				</small>
				<small>
					Факт: {formatDateFull(stage.factStart)} -{" "}
					{formatDateFull(stage.factEnd)}
				</small>
			</div>
			<div className={styles.ganttTrack}>
				{planSegment ? (
					<span
						className={`${styles.ganttSegment} ${styles.ganttPlan}`}
						style={getSegmentStyle(
							planSegment.start,
							planSegment.end,
							timeline,
						)}
					/>
				) : null}
				{earlyStart ? (
					<span
						className={`${styles.ganttSegment} ${styles.ganttEarly}`}
						style={getSegmentStyle(earlyStart.start, earlyStart.end, timeline)}
					/>
				) : null}
				{lateStart ? (
					<span
						className={`${styles.ganttSegment} ${styles.ganttLate}`}
						style={getSegmentStyle(lateStart.start, lateStart.end, timeline)}
					/>
				) : null}
				{reserve ? (
					<span
						className={`${styles.ganttSegment} ${styles.ganttReserve}`}
						style={getSegmentStyle(reserve.start, reserve.end, timeline)}
					/>
				) : null}
				{overdue ? (
					<span
						className={`${styles.ganttSegment} ${styles.ganttOverdue}`}
						style={getSegmentStyle(overdue.start, overdue.end, timeline)}
					>
						Просрочка
					</span>
				) : null}
				{factSegment ? (
					<span
						className={`${styles.ganttSegment} ${styles.ganttFact}`}
						style={getSegmentStyle(
							factSegment.start,
							factSegment.end,
							timeline,
						)}
					>
						Факт
					</span>
				) : null}
				<span className={styles.ganttStatus}>{status}</span>
			</div>
		</>
	);
};

const GanttMilestoneRow = ({
	milestone,
	timeline,
}: {
	milestone: GanttMilestone;
	timeline: GanttTimeline;
}) => {
	return (
		<>
			<div className={styles.ganttRowInfo}>
				<strong>{milestone.title}</strong>
				<span>{milestone.description}</span>
			</div>
			<div className={styles.ganttTrack}>
				{milestone.date ? (
					<span
						className={`${styles.ganttMilestone} ${
							milestone.color === "warning"
								? styles.ganttMilestoneWarning
								: styles.ganttMilestoneAccent
						}`}
						style={getMilestoneStyle(milestone.date, timeline)}
					>
						<b />
						<small>
							{milestone.title === "Подписание ТЗ"
								? "ТЗ подписано"
								: "Акт / закрытие"}
							<br />
							{formatDateShort(milestone.date)}
						</small>
					</span>
				) : (
					<span className={styles.ganttNoDate}>Дата не заполнена</span>
				)}
			</div>
		</>
	);
};

const GanttStageTable = ({
	stages,
	today,
}: {
	stages: GanttStage[];
	today: Date;
}) => (
	<div className={styles.ganttTable}>
		<div className={styles.ganttTableHead}>
			<span>Этап</span>
			<span>План</span>
			<span>Факт</span>
			<span>Отклонение</span>
			<span>Статус</span>
		</div>
		{stages.map((stage) => {
			const deviation = getStageDeviation(stage, today);
			const status = getStageStatus(stage, today);

			return (
				<div key={stage.id} className={styles.ganttTableRow}>
					<strong>{stage.title}</strong>
					<span>
						{formatDateFull(stage.planStart)} - {formatDateFull(stage.planEnd)}
					</span>
					<span>
						{formatDateFull(stage.factStart)} - {formatDateFull(stage.factEnd)}
					</span>
					<span>{formatDeviation(deviation)}</span>
					<span
						className={
							status.startsWith("Просрочен")
								? styles.ganttStatusDanger
								: status === "Завершён раньше плана"
									? styles.ganttStatusSuccess
									: styles.ganttStatusNeutral
						}
					>
						{status}
					</span>
				</div>
			);
		})}
	</div>
);
