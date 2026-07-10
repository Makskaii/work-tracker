import type { CSSProperties } from "react";
import type { GanttTimeline } from "./ganttTypes";
import {
	addDays,
	daysBetween,
	formatDateFull,
	formatDateShort,
	getMilestoneStyle,
	getSegmentStyle,
	parseGanttDate,
} from "./ganttUtils";
import type {
	AutonomousProjectPayment,
	ProjectGanttEvent,
	ProjectGanttDependencyAnchor,
	ProjectGanttStage,
} from "./types";

export type AutonomousGanttEventRow = {
	displayDate: Date | null;
	displayEnd: Date | null;
	displayStart: Date | null;
	event: ProjectGanttEvent;
	factEnd: Date | null;
	factStart: Date | null;
	isDependencyDuration: boolean;
	planEnd: Date | null;
	planStart: Date | null;
};

export type AutonomousGanttStageRow = {
	events: AutonomousGanttEventRow[];
	payments: AutonomousProjectPayment[];
	stage: ProjectGanttStage;
};

export type AutonomousProjectGantt = {
	rows: AutonomousGanttStageRow[];
	timeline: GanttTimeline;
};

type AutonomousGanttSchedule = {
	eventRows: AutonomousGanttEventRow[];
	eventRowsByStageId: Map<number, AutonomousGanttEventRow>;
};

const MIN_TIMELINE_DAYS = 56;
const DEFAULT_DEPENDENCY_ANCHOR: ProjectGanttDependencyAnchor = "stage_end";

const normalizeDateStart = (date: Date) =>
	new Date(date.getFullYear(), date.getMonth(), date.getDate());

const getDependencyFallbackDate = (
	planDate: Date | null | undefined,
	today?: Date,
) => {
	if (!planDate) {
		return null;
	}

	if (!today) {
		return planDate;
	}

	const normalizedToday = normalizeDateStart(today);

	return normalizedToday.getTime() > planDate.getTime()
		? normalizedToday
		: planDate;
};

export const getAutonomousEventAnchorDate = (
	event: AutonomousGanttEventRow,
	anchor: ProjectGanttDependencyAnchor | null | undefined,
) => {
	const dependencyAnchor = anchor ?? DEFAULT_DEPENDENCY_ANCHOR;

	if (dependencyAnchor === "stage_start") {
		return (
			event.factStart ??
			event.displayStart ??
			event.planStart ??
			event.displayDate ??
			event.factEnd ??
			event.displayEnd ??
			event.planEnd ??
			null
		);
	}

	return (
		event.factEnd ??
		event.displayEnd ??
		event.planEnd ??
		event.displayDate ??
		event.factStart ??
		event.displayStart ??
		event.planStart ??
		null
	);
};

export const getAutonomousPaymentAnchorDate = (
	event: AutonomousGanttEventRow,
	anchor: ProjectGanttDependencyAnchor | null | undefined,
) => {
	const paymentAnchor = anchor ?? DEFAULT_DEPENDENCY_ANCHOR;
	const fallbackPoint =
		event.factStart ?? event.planStart ?? event.displayDate ?? null;

	if (paymentAnchor === "stage_start") {
		return fallbackPoint;
	}

	return event.factEnd ?? event.planEnd ?? fallbackPoint;
};

export const getAutonomousPlanAnchorDate = (
	event: AutonomousGanttEventRow,
	anchor: ProjectGanttDependencyAnchor | null | undefined,
) => {
	const dependencyAnchor = anchor ?? DEFAULT_DEPENDENCY_ANCHOR;

	if (dependencyAnchor === "stage_start") {
		return (
			event.planStart ??
			(event.isDependencyDuration ? event.displayStart : null) ??
			event.displayDate
		);
	}

	return (
		event.planEnd ??
		(event.isDependencyDuration ? event.displayEnd : null) ??
		event.planStart ??
		event.displayDate
	);
};

export const getAutonomousDependencyAnchorDate = (
	event: AutonomousGanttEventRow,
	anchor: ProjectGanttDependencyAnchor | null | undefined,
	today?: Date,
) => {
	const dependencyAnchor = anchor ?? DEFAULT_DEPENDENCY_ANCHOR;

	if (dependencyAnchor === "stage_start") {
		const factDate =
			event.factStart ??
			(event.event.eventKind === "one_time" ? event.factEnd : null);
		const planDate =
			event.planStart ??
			(event.isDependencyDuration ? event.displayStart : null) ??
			event.displayDate;

		return factDate ?? getDependencyFallbackDate(planDate, today);
	}

	const factDate =
		event.factEnd ??
		(event.event.eventKind === "one_time" ? event.factStart : null);
	const planDate =
		event.planEnd ??
		(event.isDependencyDuration ? event.displayEnd : null) ??
		event.planStart ??
		event.displayDate;

	return factDate ?? getDependencyFallbackDate(planDate, today);
};

const buildEventRow = (
	event: ProjectGanttEvent,
	stageById: Map<number, ProjectGanttStage>,
	eventByStageId: Map<number, ProjectGanttEvent>,
	eventRowsByStageId: Map<number, AutonomousGanttEventRow>,
	today?: Date,
	visitedStageIds = new Set<number>(),
): AutonomousGanttEventRow => {
	const cachedRow = eventRowsByStageId.get(event.stageId);

	if (cachedRow) {
		return cachedRow;
	}

	const stage = stageById.get(event.stageId);
	const planStart = parseGanttDate(event.planStartDate);
	const planEnd = parseGanttDate(event.planEndDate);
	const factStart = parseGanttDate(event.factStartDate);
	const factEnd = parseGanttDate(event.factEndDate);
	const dependencyEvent =
		stage?.dependsOnStageId && !visitedStageIds.has(stage.dependsOnStageId)
			? eventByStageId.get(stage.dependsOnStageId)
			: null;
	const dependencyRow = dependencyEvent
		? buildEventRow(
				dependencyEvent,
				stageById,
				eventByStageId,
				eventRowsByStageId,
				today,
				new Set([...visitedStageIds, event.stageId]),
			)
		: null;
	const dependencyDurationDays = stage?.durationDays ?? 0;
	const dependencyStart = dependencyRow
		? getAutonomousDependencyAnchorDate(
				dependencyRow,
				stage?.dependencyAnchor,
				today,
			)
		: null;
	const dependencyPlanStart = dependencyRow
		? getAutonomousPlanAnchorDate(dependencyRow, stage?.dependencyAnchor)
		: null;
	const hasDependencyDuration =
		Boolean(stage?.dependsOnStageId) &&
		event.eventKind === "duration" &&
		dependencyDurationDays > 0;

	if (hasDependencyDuration) {
		const isAlignedToDependencyPlan =
			Boolean(planStart && dependencyPlanStart) &&
			planStart?.getTime() === dependencyPlanStart?.getTime();
		const displayStart =
			isAlignedToDependencyPlan || !planStart
				? (dependencyStart ?? planStart ?? factStart)
				: planStart;
		const displayEnd =
			(isAlignedToDependencyPlan || !planEnd
				? null
				: planEnd) ??
			(displayStart ? addDays(displayStart, dependencyDurationDays - 1) : null);
		const eventRow = {
			displayDate: displayStart,
			displayEnd,
			displayStart,
			event,
			factEnd,
			factStart,
			isDependencyDuration: true,
			planEnd: displayEnd,
			planStart: displayStart,
		};

		eventRowsByStageId.set(event.stageId, eventRow);

		return eventRow;
	}

	const resolvedPlanStart = dependencyStart ?? planStart;
	const resolvedPlanEnd = planEnd;
	const resolvedFactStart = factStart;
	const resolvedFactEnd = factEnd;
	const displayDate = resolvedFactStart ?? resolvedPlanStart;
	const displayStart = event.eventKind === "duration" ? displayDate : null;
	const displayEnd =
		event.eventKind === "duration"
			? (resolvedPlanEnd ?? resolvedFactEnd ?? displayStart)
			: null;

	const eventRow = {
		displayDate,
		displayEnd,
		displayStart,
		event,
		factEnd: resolvedFactEnd,
		factStart: resolvedFactStart,
		isDependencyDuration: false,
		planEnd: resolvedPlanEnd,
		planStart: resolvedPlanStart,
	};

	eventRowsByStageId.set(event.stageId, eventRow);

	return eventRow;
};

export const resolveAutonomousGanttSchedule = (
	stages: ProjectGanttStage[],
	events: ProjectGanttEvent[],
	today?: Date,
): AutonomousGanttSchedule => {
	const stageById = new Map(stages.map((stage) => [stage.id, stage]));
	const eventByStageId = new Map(events.map((event) => [event.stageId, event]));
	const eventRowsByStageId = new Map<number, AutonomousGanttEventRow>();
	const eventRows = events.map((event) =>
		buildEventRow(event, stageById, eventByStageId, eventRowsByStageId, today),
	);

	return {
		eventRows,
		eventRowsByStageId,
	};
};

const getPaymentDisplayDate = (
	payment: AutonomousProjectPayment,
	eventRowsByStageId: Map<number, AutonomousGanttEventRow>,
) => {
	const stageEvent = eventRowsByStageId.get(payment.stageId);

	if (!stageEvent || !payment.paymentAnchor) {
		return parseGanttDate(payment.paymentDate);
	}

	return getAutonomousPaymentAnchorDate(stageEvent, payment.paymentAnchor);
};

export const isAutonomousPaymentDueByCompletedStage = (
	payment: AutonomousProjectPayment,
	eventByStageId: Map<number, ProjectGanttEvent>,
) => {
	const event = payment.stageId ? eventByStageId.get(payment.stageId) : null;

	if (payment.status === "paid" || !event) {
		return false;
	}

	if (event.eventKind === "one_time") {
		return Boolean(event.factStartDate || event.factEndDate);
	}

	if (payment.paymentAnchor === "stage_start") {
		return Boolean(event.factStartDate);
	}

	return Boolean(event.factEndDate);
};

const formatInputDate = (date: Date) =>
	`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const getDependencyEventDurationDays = (
	stage: ProjectGanttStage,
	event: ProjectGanttEvent,
) => {
	if (stage.durationDays) {
		return stage.durationDays;
	}

	const planStart = parseGanttDate(event.planStartDate);
	const planEnd = parseGanttDate(event.planEndDate);

	return planStart && planEnd
		? Math.max(daysBetween(planStart, planEnd) + 1, 1)
		: null;
};

export const recalculateAutonomousDependencyEvents = (
	sourceEvents: ProjectGanttEvent[],
	sourceStages: ProjectGanttStage[],
	previousEvents: ProjectGanttEvent[] = sourceEvents,
	previousStages: ProjectGanttStage[] = sourceStages,
	today?: Date,
) => {
	const stageById = new Map(sourceStages.map((stage) => [stage.id, stage]));
	const previousStageById = new Map(
		previousStages.map((stage) => [stage.id, stage]),
	);
	const previousEventById = new Map(
		previousEvents.map((event) => [event.id, event]),
	);
	const { eventRowsByStageId: previousEventRowsByStageId } =
		resolveAutonomousGanttSchedule(previousStages, previousEvents, today);
	let nextEvents = sourceEvents;
	let hasChanged = true;
	let guard = 0;

	while (hasChanged && guard < sourceStages.length) {
		hasChanged = false;
		guard += 1;

		const { eventRowsByStageId } = resolveAutonomousGanttSchedule(
			sourceStages,
			nextEvents,
			today,
		);

		nextEvents = nextEvents.map((event) => {
			const stage = stageById.get(event.stageId);

			if (!stage?.dependsOnStageId) {
				return event;
			}

			const parentRow = eventRowsByStageId.get(stage.dependsOnStageId);
			const planStart = parentRow
				? getAutonomousDependencyAnchorDate(
						parentRow,
						stage.dependencyAnchor,
						today,
					)
				: null;

			if (!planStart) {
				return event;
			}

			const previousStage = previousStageById.get(stage.id);
			const previousParentRow =
				previousStage?.dependsOnStageId === stage.dependsOnStageId
					? previousEventRowsByStageId.get(stage.dependsOnStageId)
					: null;
			const previousPlanStart = previousEventById.get(event.id)?.planStartDate
				? parseGanttDate(previousEventById.get(event.id)?.planStartDate)
				: null;
			const currentPlanStart = parseGanttDate(event.planStartDate);
			const previousParentPlanStart = previousParentRow
				? getAutonomousDependencyAnchorDate(
						previousParentRow,
						previousStage?.dependencyAnchor,
						today,
					)
				: null;
			const previousParentPlanAnchor = previousParentRow
				? getAutonomousPlanAnchorDate(
						previousParentRow,
						previousStage?.dependencyAnchor,
					)
				: null;
			const hasManualPlanStartChange =
				Boolean(currentPlanStart && previousPlanStart) &&
				currentPlanStart?.getTime() !== previousPlanStart?.getTime();
			const wasAlignedToParentPlan =
				Boolean(previousPlanStart && previousParentPlanAnchor) &&
				previousPlanStart?.getTime() === previousParentPlanAnchor?.getTime();
			const nextPlanStart =
				hasManualPlanStartChange && currentPlanStart
					? currentPlanStart
					: wasAlignedToParentPlan
						? planStart
					: previousParentPlanStart && previousPlanStart
						? addDays(
								previousPlanStart,
								daysBetween(previousParentPlanStart, planStart),
							)
						: planStart;
			const durationDays =
				event.eventKind === "duration"
					? getDependencyEventDurationDays(stage, event)
					: null;
			const planStartDate = formatInputDate(nextPlanStart);
			const planEndDate =
				event.eventKind === "duration" && durationDays
					? formatInputDate(addDays(nextPlanStart, durationDays - 1))
					: null;

			if (
				event.planStartDate === planStartDate &&
				event.planEndDate === planEndDate
			) {
				return event;
			}

			hasChanged = true;

			return {
				...event,
				planEndDate,
				planStartDate,
			};
		});
	}

	return nextEvents;
};

const applyPaymentDisplayDates = (
	payments: AutonomousProjectPayment[],
	eventRowsByStageId: Map<number, AutonomousGanttEventRow>,
) =>
	payments.map((payment) => {
		const displayDate = getPaymentDisplayDate(payment, eventRowsByStageId);

		return displayDate
			? {
					...payment,
					paymentDate: formatInputDate(displayDate),
				}
			: payment;
	});

const getTimeline = (rows: AutonomousGanttStageRow[], today: Date): GanttTimeline => {
	const dates = rows.flatMap((row) => [
		...row.events.flatMap((event) => [
			event.planStart,
			event.planEnd,
			event.factStart,
			event.factEnd,
			event.displayDate,
			event.displayStart,
			event.displayEnd,
		]),
		...row.payments.map((payment) => parseGanttDate(payment.paymentDate)),
	]);
	const validDates = [...dates, today].filter((date): date is Date =>
		Boolean(date),
	);
	const minDate = new Date(Math.min(...validDates.map((date) => date.getTime())));
	const maxDate = new Date(Math.max(...validDates.map((date) => date.getTime())));
	const start = addDays(minDate, -7);
	let end = addDays(maxDate, 14);

	if (daysBetween(start, end) < MIN_TIMELINE_DAYS) {
		end = addDays(start, MIN_TIMELINE_DAYS);
	}

	return {
		end,
		start,
		totalDays: Math.max(daysBetween(start, end), 1),
	};
};

export const resolveAutonomousPaymentDates = ({
	events,
	payments,
	stages,
	today,
}: {
	events: ProjectGanttEvent[];
	payments: AutonomousProjectPayment[];
	stages: ProjectGanttStage[];
	today?: Date;
}) => {
	const { eventRowsByStageId } = resolveAutonomousGanttSchedule(
		stages,
		events,
		today,
	);

	return applyPaymentDisplayDates(payments, eventRowsByStageId);
};

export const buildAutonomousProjectGantt = ({
	events,
	payments,
	stages,
	today,
}: {
	events: ProjectGanttEvent[];
	payments: AutonomousProjectPayment[];
	stages: ProjectGanttStage[];
	today: Date;
}): AutonomousProjectGantt => {
	const { eventRows, eventRowsByStageId } = resolveAutonomousGanttSchedule(
		stages,
		events,
		today,
	);
	const paymentsWithDisplayDates = applyPaymentDisplayDates(
		payments,
		eventRowsByStageId,
	);
	const rows = stages
		.toSorted((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
		.map((stage) => ({
			events: eventRows
				.filter((event) => event.event.stageId === stage.id)
				.toSorted(
					(a, b) =>
						a.event.sortOrder - b.event.sortOrder || a.event.id - b.event.id,
				),
			payments:
				stage.code === "payments"
					? paymentsWithDisplayDates
							.toSorted((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
					: [],
			stage,
		}));

	return {
		rows,
		timeline: getTimeline(rows, today),
	};
};

export const getAutonomousEventStyle = (
	event: AutonomousGanttEventRow,
	timeline: GanttTimeline,
): CSSProperties | null => {
	if (event.isDependencyDuration || event.event.eventKind === "duration") {
		return event.displayStart && event.displayEnd
			? getSegmentStyle(event.displayStart, event.displayEnd, timeline)
			: null;
	}

	return event.displayDate ? getMilestoneStyle(event.displayDate, timeline) : null;
};

export const getPaymentStatusLabel = (
	status: AutonomousProjectPayment["status"],
) => {
	return status === "paid" ? "Оплачено" : "Неоплачено";
};

export const formatAutonomousEventTooltip = (
	event: AutonomousGanttEventRow,
) => {
	if (event.isDependencyDuration) {
		return [
			event.event.title,
			`Расчётный период: ${formatDateFull(event.displayStart)} — ${formatDateFull(event.displayEnd)}`,
			`Факт. завершение: ${formatDateFull(event.factEnd)}`,
		].join("\n");
	}

	if (event.event.eventKind === "one_time") {
		return [
			event.event.title,
			`План: ${formatDateFull(event.planStart)}`,
			`Факт: ${formatDateFull(event.factStart)}`,
		].join("\n");
	}

	return [
		event.event.title,
		`План: ${formatDateFull(event.planStart)} — ${formatDateFull(event.planEnd)}`,
		`Факт: ${formatDateFull(event.factStart)} — ${formatDateFull(event.factEnd)}`,
	].join("\n");
};

export const formatAutonomousPaymentTooltip = (
	payment: AutonomousProjectPayment,
	stageTitle: string,
) =>
	[
		"Оплата",
		`Дата платежа: ${formatDateShort(parseGanttDate(payment.paymentDate))}`,
		`Статус: ${getPaymentStatusLabel(payment.status)}`,
		`Этап: ${stageTitle}`,
		`Сумма: ${payment.amount ?? "—"}`,
		`Дней ожидания: ${payment.waitingDays ?? "—"}`,
	].join("\n");
