import { useMemo, useState } from "react";
import dayjs from "dayjs";
import { FaExclamationTriangle, FaMoneyBillWave } from "react-icons/fa";
import { ProjectCodes } from "@/components/calendar/constants/const";
import { EntityTypeIds } from "@/shared/constants/const";
import { useBitrixSlider } from "@/shared/hooks/useBitrixSlider";
import {
	fetchProjectIncidents,
	type ProjectIncident,
} from "../model/api";
import {
	getPaymentAmount,
	getPaymentPercent,
	getPaymentStageBindingLabel,
	getProjectPaymentStageType,
} from "../model/paymentUtils";
import type {
	GanttMilestone,
	GanttMonthTick,
	GanttStage,
	GanttTimeline,
	GanttWeekTick,
} from "../model/ganttTypes";
import {
	buildProjectGantt,
	daysBetween,
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
	getWeekTicks,
} from "../model/ganttUtils";
import { formatMoney } from "../model/profitabilityUtils";
import type { ProfitabilityProject, ProjectPayment } from "../model/types";
import styles from "../SalesProfitabilityReport.module.scss";
import { ProjectIncidentModal } from "./ProjectIncidentModal";

const PAYMENT_MARKER_BASE_HEIGHT = 92;
const PAYMENT_MARKER_MIN_DISTANCE = 5;
const PAYMENT_MARKER_SLOT_HEIGHT = 58;

const getPaymentMarkerClass = (stageId = "") => {
	const stageType = getProjectPaymentStageType(stageId);

	if (stageType === "paid") {
		return styles.ganttPaymentPaid;
	}

	if (stageType === "canceled") {
		return styles.ganttPaymentCanceled;
	}

	if (stageType === "debt") {
		return styles.ganttPaymentDebt;
	}

	return styles.ganttPaymentPlanned;
};

const getPaymentTooltip = (payment: ProjectPayment, dealAmount: number) => {
	const paymentDate = payment.createdTime ? dayjs(payment.createdTime) : null;
	const date = paymentDate?.isValid()
		? paymentDate.format("DD.MM.YYYY")
		: "—";
	const amount = getPaymentAmount(payment, dealAmount);
	const percent = getPaymentPercent(payment, dealAmount);

	return [
		"Оплата",
		`Сумма: ${formatMoney(amount)}`,
		`Процент: ${percent}%`,
		`Дата: ${date}`,
		`Стадия: ${payment.stageId ?? "—"}`,
		`Этап: ${getPaymentStageBindingLabel(payment[ProjectCodes.paymentStageBinding])}`,
	].join("\n");
};

export const ProjectGantt = ({
	project,
	dealAmount = 0,
}: {
	project: ProfitabilityProject | null;
	dealAmount?: number;
}) => {
	const [incidents, setIncidents] = useState<ProjectIncident[]>([]);
	const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
	const [isIncidentsLoading, setIsIncidentsLoading] = useState(false);
	const { openTask } = useBitrixSlider();
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
	const weekTicks = useMemo(() => getWeekTicks(timeline), [timeline]);
	const hasDates = gantt.rows.some((row) =>
		row.type === "milestone"
			? row.milestone.date
			: row.stage.planStart || row.stage.planEnd || row.stage.factStart,
	);
	const paymentMarkers = useMemo(() => {
		if (!project) {
			return [];
		}

		const markerLevels: number[] = [];

		return project.payments
			.map((payment) => {
				const paymentDate = payment.createdTime ? dayjs(payment.createdTime) : null;

				if (!paymentDate?.isValid()) {
					return null;
				}

				return {
					date: paymentDate.toDate(),
					payment,
				};
			})
			.filter(
				(
					marker,
				): marker is {
					date: Date;
					payment: ProjectPayment;
				} => Boolean(marker),
			)
			.toSorted((a, b) => a.date.getTime() - b.date.getTime())
			.map((marker) => {
				const style = getMilestoneStyle(marker.date, timeline);
				const left = Number.parseFloat(String(style.left ?? 0));
				let level = markerLevels.findIndex(
					(levelLeft) => left - levelLeft >= PAYMENT_MARKER_MIN_DISTANCE,
				);

				if (level === -1) {
					level = markerLevels.length;
				}

				markerLevels[level] = left;

				return {
					...marker,
					level,
				};
			}) as Array<{ date: Date; level: number; payment: ProjectPayment }>;
	}, [project, timeline]);
	const paymentRowHeight =
		paymentMarkers.length > 0
			? Math.max(
					PAYMENT_MARKER_BASE_HEIGHT,
					PAYMENT_MARKER_BASE_HEIGHT +
						Math.max(...paymentMarkers.map((marker) => marker.level)) *
							PAYMENT_MARKER_SLOT_HEIGHT,
				)
			: PAYMENT_MARKER_BASE_HEIGHT;
	const handleOverdueClick = async () => {
		if (!project) {
			setIncidents([]);
			setIsIncidentModalOpen(true);
			return;
		}

		setIsIncidentModalOpen(true);
		setIsIncidentsLoading(true);

		try {
			const items = await fetchProjectIncidents({ project });
			setIncidents(items);
		} catch {
			setIncidents([]);
		} finally {
			setIsIncidentsLoading(false);
		}
	};

	return (
		<>
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
					<GanttScale monthTicks={monthTicks} weekTicks={weekTicks} />
					<div
						className={styles.ganttRowInfo}
						style={{ minHeight: paymentRowHeight }}
					>
						<strong>Оплаты</strong>
						<span>Смарт-процесс оплат по проекту</span>
					</div>
					<div
						className={styles.ganttTrack}
						style={{ minHeight: paymentRowHeight }}
					>
						<GanttTrackGrid monthTicks={monthTicks} weekTicks={weekTicks} />
						{paymentMarkers.map(({ date, level, payment }) => (
							<GanttPaymentMarker
								key={String(payment.id)}
								date={date}
								dealAmount={dealAmount}
								level={level}
								payment={payment}
								timeline={timeline}
							/>
						))}
					</div>

					{hasDates ? (
						gantt.rows.map((row) =>
							row.type === "milestone" ? (
								<GanttMilestoneRow
									key={row.milestone.id}
									milestone={row.milestone}
									monthTicks={monthTicks}
									timeline={timeline}
									weekTicks={weekTicks}
								/>
							) : (
								<GanttStageRow
									key={row.stage.id}
									monthTicks={monthTicks}
									onOverdueClick={handleOverdueClick}
									stage={row.stage}
									timeline={timeline}
									today={today}
									weekTicks={weekTicks}
								/>
							),
						)
					) : (
						<div className={styles.ganttEmpty}>
							Заполните даты и длительности этапов в проекте, чтобы построить
							Гант.
						</div>
					)}
				</div>

				<GanttStageTable stages={gantt.stages} today={today} />
			</div>
			<ProjectIncidentModal
				incidents={incidents}
				isLoading={isIncidentsLoading}
				isOpen={isIncidentModalOpen}
				onClose={() => setIsIncidentModalOpen(false)}
				onIncidentOpen={(incidentId) =>
					openTask(incidentId, EntityTypeIds.projectIncidents)
				}
			/>
		</>
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

const GanttScale = ({
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

const GanttTrackGrid = ({
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

const getStageTooltip = (stage: GanttStage, today: Date) => {
	const deviation = getStageDeviation(stage, today);

	return [
		stage.title,
		`План: ${formatDateFull(stage.planStart)} — ${formatDateFull(stage.planEnd)}`,
		`Факт: ${formatDateFull(stage.factStart)} — ${formatDateFull(stage.factEnd)}`,
		`Отклонение: ${formatDeviation(deviation)}`,
		`Статус: ${getStageStatus(stage, today)}`,
	].join("\n");
};

const GanttStageRow = ({
	monthTicks,
	onOverdueClick,
	stage,
	timeline,
	today,
	weekTicks,
}: {
	monthTicks: GanttMonthTick[];
	onOverdueClick: () => void;
	stage: GanttStage;
	timeline: GanttTimeline;
	today: Date;
	weekTicks: GanttWeekTick[];
}) => {
	const factEnd =
		stage.factEnd ??
		(stage.factStart ? getDateMax(stage.factStart, today) : null);
	const status = getStageStatus(stage, today);
	const tooltip = getStageTooltip(stage, today);
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
	const overdueDays = overdue ? daysBetween(overdue.start, overdue.end) : 0;
	const reserve =
		stage.planEnd && stage.factEnd && stage.factEnd < stage.planEnd
			? {
					start: stage.factEnd,
					end: stage.planEnd,
				}
			: null;

	return (
		<>
			<div className={styles.ganttRowInfo} title={tooltip}>
				<strong>{stage.title}</strong>
				<span>{stage.description}</span>
				<small>
					План: {formatDateFull(stage.planStart)} —{" "}
					{formatDateFull(stage.planEnd)}
				</small>
				<small>
					Факт: {formatDateFull(stage.factStart)} —{" "}
					{formatDateFull(stage.factEnd)}
				</small>
			</div>
			<div className={styles.ganttTrack} title={tooltip}>
				<GanttTrackGrid monthTicks={monthTicks} weekTicks={weekTicks} />
				{planSegment ? (
					<span
						className={`${styles.ganttSegment} ${styles.ganttPlan}`}
						style={getSegmentStyle(
							planSegment.start,
							planSegment.end,
							timeline,
						)}
						title={tooltip}
					/>
				) : null}
				{earlyStart ? (
					<span
						className={`${styles.ganttSegment} ${styles.ganttEarly}`}
						style={getSegmentStyle(earlyStart.start, earlyStart.end, timeline)}
						title={tooltip}
					/>
				) : null}
				{lateStart ? (
					<span
						className={`${styles.ganttSegment} ${styles.ganttLate}`}
						style={getSegmentStyle(lateStart.start, lateStart.end, timeline)}
						title={tooltip}
					/>
				) : null}
				{reserve ? (
					<span
						className={`${styles.ganttSegment} ${styles.ganttReserve}`}
						style={getSegmentStyle(reserve.start, reserve.end, timeline)}
						title={tooltip}
					/>
				) : null}
				{overdue ? (
					<span
						className={`${styles.ganttSegment} ${styles.ganttOverdue}`}
						style={getSegmentStyle(overdue.start, overdue.end, timeline)}
						title={tooltip}
					/>
				) : null}
				{overdue ? (
					<button
						type="button"
						className={styles.ganttOverdueBadge}
						style={getSegmentStyle(overdue.start, overdue.end, timeline)}
						onClick={onOverdueClick}
						title={`Просрочка: +${overdueDays} дн.`}
					>
						<FaExclamationTriangle
							aria-hidden="true"
							className={styles.ganttOverdueIcon}
						/>
						Просрочка +{overdueDays} дн.
					</button>
				) : null}
				{factSegment ? (
					<span
						className={`${styles.ganttSegment} ${styles.ganttFact}`}
						style={getSegmentStyle(
							factSegment.start,
							factSegment.end,
							timeline,
						)}
						title={tooltip}
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
	monthTicks,
	timeline,
	weekTicks,
}: {
	milestone: GanttMilestone;
	monthTicks: GanttMonthTick[];
	timeline: GanttTimeline;
	weekTicks: GanttWeekTick[];
}) => (
	<>
		<div className={styles.ganttRowInfo}>
			<strong>{milestone.title}</strong>
			<span>{milestone.description}</span>
		</div>
		<div className={styles.ganttTrack}>
			<GanttTrackGrid monthTicks={monthTicks} weekTicks={weekTicks} />
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

const GanttPaymentMarker = ({
	date,
	dealAmount,
	level,
	payment,
	timeline,
}: {
	date: Date;
	dealAmount: number;
	level: number;
	payment: ProjectPayment;
	timeline: GanttTimeline;
}) => {
	const amount = getPaymentAmount(payment, dealAmount);
	const percent = getPaymentPercent(payment, dealAmount);
	const style = {
		...getMilestoneStyle(date, timeline),
		top: `${16 + level * PAYMENT_MARKER_SLOT_HEIGHT}px`,
	};

	return (
		<span
			className={`${styles.ganttPaymentMarker} ${getPaymentMarkerClass(
				payment.stageId,
			)}`}
			style={style}
			title={getPaymentTooltip(payment, dealAmount)}
		>
			<b>
				<FaMoneyBillWave aria-hidden="true" />
			</b>
			<small>
				Оплата{percent ? ` ${percent}%` : ""}
				<br />
				{formatMoney(amount)}
			</small>
		</span>
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
						{formatDateFull(stage.planStart)} — {formatDateFull(stage.planEnd)}
					</span>
					<span>
						{formatDateFull(stage.factStart)} — {formatDateFull(stage.factEnd)}
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
