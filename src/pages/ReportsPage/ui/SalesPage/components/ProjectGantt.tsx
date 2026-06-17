import {
	type Ref,
	useCallback,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { FaExclamationTriangle } from "react-icons/fa";
import { EntityTypeIds } from "@/shared/constants/const";
import { useBitrixSlider } from "@/shared/hooks/useBitrixSlider";
import {
	fetchProjectIncidents,
	type ProjectIncident,
} from "../model/api";
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
import {
	buildPaymentMarkers,
	getPaymentRowHeight,
} from "../model/ganttPaymentMarkers";
import type { ProfitabilityProject } from "../model/types";
import styles from "../SalesProfitabilityReport.module.scss";
import { GanttPaymentMarker } from "./GanttPaymentMarker";
import { ProjectIncidentModal } from "./ProjectIncidentModal";

type GanttPaymentLink = {
	endY: number;
	overdueEndX?: number;
	overdueEndY?: number;
	overdueTargetY?: number;
	startX: number;
	id: string;
	startY: number;
	targetX: number;
};

type GanttPaymentLinksLayout = {
	height: number;
	links: GanttPaymentLink[];
	width: number;
};

const PAYMENT_OVERDUE_LINK_Y_OFFSET = 132;

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
	const [paymentLinksLayout, setPaymentLinksLayout] =
		useState<GanttPaymentLinksLayout>({
			height: 0,
			links: [],
			width: 0,
		});
	const ganttBoardRef = useRef<HTMLDivElement>(null);
	const paymentMarkerRefs = useRef(new Map<string, HTMLSpanElement>());
	const ganttRowTrackRefs = useRef(new Map<string, HTMLDivElement>());
	const ganttAnchorRefs = useRef(new Map<string, HTMLElement>());
	const ganttOverdueRefs = useRef(new Map<string, HTMLElement>());
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

		return buildPaymentMarkers(project.payments, gantt.rows, timeline);
	}, [gantt.rows, project, timeline]);
	const paymentRowHeight = getPaymentRowHeight(paymentMarkers);
	const setPaymentMarkerRef = useCallback(
		(paymentId: string) => (node: HTMLSpanElement | null) => {
			if (node) {
				paymentMarkerRefs.current.set(paymentId, node);
				return;
			}

			paymentMarkerRefs.current.delete(paymentId);
		},
		[],
	);
	const setGanttRowTrackRef = useCallback(
		(rowId: string) => (node: HTMLDivElement | null) => {
			if (node) {
				ganttRowTrackRefs.current.set(rowId, node);
				return;
			}

			ganttRowTrackRefs.current.delete(rowId);
		},
		[],
	);
	const setGanttAnchorRef = useCallback(
		(rowId: string) => (node: HTMLElement | null) => {
			if (node) {
				ganttAnchorRefs.current.set(rowId, node);
				return;
			}

			ganttAnchorRefs.current.delete(rowId);
		},
		[],
	);
	const setGanttOverdueRef = useCallback(
		(rowId: string) => (node: HTMLElement | null) => {
			if (node) {
				ganttOverdueRefs.current.set(rowId, node);
				return;
			}

			ganttOverdueRefs.current.delete(rowId);
		},
		[],
	);

	useLayoutEffect(() => {
		const board = ganttBoardRef.current;

		if (!board) {
			return;
		}

		let animationFrameId: number | null = null;
		const updatePaymentLinks = () => {
			const boardRect = board.getBoundingClientRect();
			const links = paymentMarkers.reduce<GanttPaymentLink[]>((items, marker) => {
				if (!marker.anchor) {
					return items;
				}

				const anchor = marker.anchor;
				const paymentNode = paymentMarkerRefs.current.get(
					String(marker.payment.id),
				);
				const rowNode = ganttRowTrackRefs.current.get(anchor.rowId);

				if (!paymentNode || !rowNode) {
					return items;
				}

				const paymentRect = paymentNode.getBoundingClientRect();
				const rowRect = rowNode.getBoundingClientRect();
				const anchorNode = ganttAnchorRefs.current.get(anchor.rowId);
				const overdueNode = ganttOverdueRefs.current.get(anchor.rowId);
				const anchorRect = anchorNode?.getBoundingClientRect();
				const overdueRect = overdueNode?.getBoundingClientRect();
				const startX =
					paymentRect.left +
					paymentRect.width / 2 -
					boardRect.left +
					board.scrollLeft;
				const startY = paymentRect.bottom - boardRect.top + board.scrollTop;
				const endY = anchorRect
					? anchorRect.top +
						anchorRect.height / 2 -
						boardRect.top +
						board.scrollTop
					: rowRect.top + rowRect.height / 2 - boardRect.top + board.scrollTop;
				const getTargetX = () => {
					if (anchorRect) {
						return anchor.rowType === "milestone"
							? anchorRect.left +
									anchorRect.width / 2 -
									boardRect.left +
									board.scrollLeft
							: anchorRect.right - boardRect.left + board.scrollLeft;
					}

					const markerStyle = getMilestoneStyle(anchor.date, timeline);
					const left = Number.parseFloat(String(markerStyle.left ?? 0));
					const safeLeft = Number.isFinite(left)
						? Math.min(Math.max(left, 0), 100)
						: 0;

					return (
						rowRect.left -
						boardRect.left +
						board.scrollLeft +
						(rowRect.width * safeLeft) / 100
					);
				};
				const targetX = getTargetX();
				const overdueEndX = overdueRect
					? overdueRect.right - boardRect.left + board.scrollLeft
					: undefined;
				const overdueTargetY = overdueRect
					? overdueRect.top +
						overdueRect.height / 2 -
						boardRect.top +
						board.scrollTop
					: undefined;

				if (endY <= startY) {
					return items;
				}

				items.push({
					endY,
					id: String(marker.payment.id),
					overdueEndX,
					overdueTargetY,
					overdueEndY:
						overdueEndX === undefined
							? undefined
							: Math.max(startY, endY - PAYMENT_OVERDUE_LINK_Y_OFFSET),
					startX,
					startY,
					targetX,
				});

				return items;
			}, []);

			setPaymentLinksLayout({
				height: board.scrollHeight,
				links,
				width: board.scrollWidth,
			});
		};
		const schedulePaymentLinksUpdate = () => {
			if (animationFrameId !== null) {
				cancelAnimationFrame(animationFrameId);
			}

			animationFrameId = requestAnimationFrame(() => {
				animationFrameId = null;
				updatePaymentLinks();
			});
		};
		const resizeObserver = new ResizeObserver(schedulePaymentLinksUpdate);

		updatePaymentLinks();
		resizeObserver.observe(board);
		window.addEventListener("resize", schedulePaymentLinksUpdate);
		board.addEventListener("scroll", schedulePaymentLinksUpdate, {
			passive: true,
		});

		return () => {
			if (animationFrameId !== null) {
				cancelAnimationFrame(animationFrameId);
			}

			resizeObserver.disconnect();
			window.removeEventListener("resize", schedulePaymentLinksUpdate);
			board.removeEventListener("scroll", schedulePaymentLinksUpdate);
		};
	}, [paymentMarkers, timeline]);
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

				<div ref={ganttBoardRef} className={styles.ganttBoard}>
					<GanttPaymentLinks layout={paymentLinksLayout} />
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
						{paymentMarkers.map(({ anchor, date, level, payment }) => (
							<GanttPaymentMarker
								anchor={anchor ?? undefined}
								key={String(payment.id)}
								ref={setPaymentMarkerRef(String(payment.id))}
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
									anchorRef={setGanttAnchorRef(row.milestone.id)}
									key={row.milestone.id}
									milestone={row.milestone}
									monthTicks={monthTicks}
									rowRef={setGanttRowTrackRef(row.milestone.id)}
									timeline={timeline}
									weekTicks={weekTicks}
								/>
							) : (
								<GanttStageRow
									anchorRef={setGanttAnchorRef(row.stage.id)}
									key={row.stage.id}
									monthTicks={monthTicks}
									onOverdueClick={handleOverdueClick}
									overdueRef={setGanttOverdueRef(row.stage.id)}
									rowRef={setGanttRowTrackRef(row.stage.id)}
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

const GanttPaymentLinks = ({
	layout,
}: {
	layout: GanttPaymentLinksLayout;
}) =>
	layout.links.length > 0 && layout.width > 0 && layout.height > 0 ? (
		<svg
			aria-hidden="true"
			className={styles.ganttPaymentLinksLayer}
			height={layout.height}
			viewBox={`0 0 ${layout.width} ${layout.height}`}
			width={layout.width}
		>
			{layout.links.map((link) => (
				<g key={link.id}>
					<path
						className={styles.ganttPaymentLinkLine}
						d={`M ${link.startX} ${link.startY} V ${link.endY} H ${link.targetX}`}
					/>
					{link.overdueEndX !== undefined &&
					link.overdueEndY !== undefined &&
					link.overdueTargetY !== undefined ? (
						<path
							className={styles.ganttPaymentOverdueLinkLine}
							d={`M ${link.startX} ${link.overdueEndY} H ${link.overdueEndX} V ${link.overdueTargetY}`}
						/>
					) : null}
				</g>
			))}
		</svg>
	) : null;

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
	anchorRef,
	monthTicks,
	onOverdueClick,
	overdueRef,
	rowRef,
	stage,
	timeline,
	today,
	weekTicks,
}: {
	anchorRef?: Ref<HTMLSpanElement>;
	monthTicks: GanttMonthTick[];
	onOverdueClick: () => void;
	overdueRef?: Ref<HTMLSpanElement>;
	rowRef?: Ref<HTMLDivElement>;
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
			<div ref={rowRef} className={styles.ganttTrack} title={tooltip}>
				<GanttTrackGrid monthTicks={monthTicks} weekTicks={weekTicks} />
				{planSegment ? (
					<span
						className={`${styles.ganttSegment} ${styles.ganttPlan}`}
						ref={factSegment ? undefined : anchorRef}
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
						ref={overdueRef}
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
						ref={anchorRef}
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
	anchorRef,
	milestone,
	monthTicks,
	rowRef,
	timeline,
	weekTicks,
}: {
	anchorRef?: Ref<HTMLSpanElement>;
	milestone: GanttMilestone;
	monthTicks: GanttMonthTick[];
	rowRef?: Ref<HTMLDivElement>;
	timeline: GanttTimeline;
	weekTicks: GanttWeekTick[];
}) => (
	<>
		<div className={styles.ganttRowInfo}>
			<strong>{milestone.title}</strong>
			<span>{milestone.description}</span>
		</div>
		<div ref={rowRef} className={styles.ganttTrack}>
			<GanttTrackGrid monthTicks={monthTicks} weekTicks={weekTicks} />
			{milestone.date ? (
				<span
					className={`${styles.ganttMilestone} ${
						milestone.color === "warning"
							? styles.ganttMilestoneWarning
							: styles.ganttMilestoneAccent
					}`}
					ref={anchorRef}
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
