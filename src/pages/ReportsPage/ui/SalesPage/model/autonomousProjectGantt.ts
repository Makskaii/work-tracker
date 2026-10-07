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
	forecastEnd: Date | null;
	forecastStart: Date | null;
	isDependencyDuration: boolean;
	isCollapsedGroupSummary?: boolean;
	isPlanDerived: boolean;
	planEnd: Date | null;
	planStart: Date | null;
};

const getEarliestDate = (dates: Array<Date | null>) => {
	const availableDates = dates.filter((date): date is Date => Boolean(date));

	return availableDates.length
		? new Date(Math.min(...availableDates.map((date) => date.getTime())))
		: null;
};

const getLatestDate = (dates: Array<Date | null>) => {
	const availableDates = dates.filter((date): date is Date => Boolean(date));

	return availableDates.length
		? new Date(Math.max(...availableDates.map((date) => date.getTime())))
		: null;
};

const getCollapsedGroupSummaryRow = (
	groupRow: AutonomousGanttStageRow,
	childRows: AutonomousGanttStageRow[],
): AutonomousGanttStageRow => {
	const childEvents = childRows.flatMap((row) => row.events);
	const sourceEvent = childEvents[0];

	if (!sourceEvent) {
		return groupRow;
	}

	const planStart = getEarliestDate(childEvents.map((event) => event.planStart));
	const planEnd = getLatestDate(
		childEvents.map((event) => event.planEnd ?? event.planStart),
	);
	const forecastStart = getEarliestDate(
		childEvents.map((event) => event.forecastStart),
	);
	const forecastEnd = getLatestDate(
		childEvents.map((event) => event.forecastEnd ?? event.forecastStart),
	);
	const factStart = getEarliestDate(
		childEvents.map((event) => event.factStart),
	);
	const factEnd = getLatestDate(childEvents.map((event) => event.factEnd));
	const displayStart = planStart ?? forecastStart;
	const displayEnd = planEnd ?? forecastEnd ?? displayStart;

	if (!displayStart || !displayEnd) {
		return groupRow;
	}

	return {
		...groupRow,
		events: [
			{
				...sourceEvent,
				displayDate: displayStart,
				displayEnd,
				displayStart,
				event: {
					...sourceEvent.event,
					id: -groupRow.stage.id,
					stageId: groupRow.stage.id,
					title: `${groupRow.stage.title}: сводный период`,
					eventKind: "duration",
				},
				factEnd,
				factStart,
				forecastEnd,
				forecastStart,
				isCollapsedGroupSummary: true,
				isDependencyDuration: false,
				isPlanDerived: childEvents.some((event) => event.isPlanDerived),
				planEnd,
				planStart,
			},
		],
	};
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

export const getVisibleAutonomousGanttRows = (
	rows: AutonomousGanttStageRow[],
	expandedGroupIds: ReadonlySet<number>,
) => {
	const groupIds = new Set(
		rows.filter((row) => row.stage.isGroup).map((row) => row.stage.id),
	);
	const visibleRows: AutonomousGanttStageRow[] = [];
	const visibleStageIds = new Set<number>();

	const appendRow = (row: AutonomousGanttStageRow) => {
		if (!visibleStageIds.has(row.stage.id)) {
			visibleRows.push(row);
			visibleStageIds.add(row.stage.id);
		}
	};

	for (const row of rows) {
		const { stage } = row;

		if (stage.code === "payments") {
			appendRow(row);
			continue;
		}

		if (stage.isGroup) {
			const childRows = rows.filter(
				(childRow) => childRow.stage.parentStageId === stage.id,
			);

			if (expandedGroupIds.has(stage.id)) {
				appendRow(row);

				for (const childRow of childRows) {
					appendRow(childRow);
				}
			} else {
				appendRow(getCollapsedGroupSummaryRow(row, childRows));
			}

			continue;
		}

		if (!stage.parentStageId || !groupIds.has(stage.parentStageId)) {
			appendRow(row);
		}
	}

	return visibleRows;
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
		return event.planStart;
	}

	return (
		event.planEnd ??
		event.planStart
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
			event.forecastStart ?? event.planStart;

		return factDate ?? getDependencyFallbackDate(planDate, today);
	}

	const factDate =
		event.factEnd ??
		(event.event.eventKind === "one_time" ? event.factStart : null);
	const planDate =
		event.forecastEnd ?? event.forecastStart ?? event.planEnd ?? event.planStart;

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
	const storedPlanStart = parseGanttDate(event.planStartDate);
	const storedPlanEnd = parseGanttDate(event.planEndDate);
	// Older one-time events sometimes stored their sole date in planEndDate.
	const planStart = storedPlanStart ??
		(event.eventKind === "one_time" ? storedPlanEnd : null);
	const planEnd = event.eventKind === "one_time"
		? planStart
		: storedPlanEnd;
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
	const resolvedPlanStart = planStart ?? dependencyPlanStart;
	const resolvedPlanEnd = planEnd ??
		(hasDependencyDuration && resolvedPlanStart
			? addDays(resolvedPlanStart, dependencyDurationDays - 1)
			: event.eventKind === "one_time" ? resolvedPlanStart : null);
	const isPlanDerived = !planStart && Boolean(dependencyPlanStart);

	if (hasDependencyDuration) {
		const isAlignedToDependencyPlan =
			Boolean(planStart && dependencyPlanStart) &&
			planStart?.getTime() === dependencyPlanStart?.getTime();
		const forecastStart =
			isAlignedToDependencyPlan || !planStart
				? (dependencyStart ?? planStart ?? factStart)
				: planStart;
		const forecastEnd =
			(isAlignedToDependencyPlan || !planEnd
				? null
				: planEnd) ??
			(forecastStart ? addDays(forecastStart, dependencyDurationDays - 1) : null);
		const eventRow = {
			displayDate: resolvedPlanStart ?? forecastStart,
			displayEnd: resolvedPlanEnd ?? forecastEnd,
			displayStart: resolvedPlanStart ?? forecastStart,
			event,
			factEnd,
			factStart,
			forecastEnd,
			forecastStart,
			isDependencyDuration: true,
			isPlanDerived,
			planEnd: resolvedPlanEnd,
			planStart: resolvedPlanStart,
		};

		eventRowsByStageId.set(event.stageId, eventRow);

		return eventRow;
	}

	const forecastStart = dependencyStart ?? planStart;
	const forecastEnd = event.eventKind === "one_time"
		? forecastStart
		: planEnd ?? forecastStart;
	const displayDate = resolvedPlanStart ?? forecastStart;
	const displayStart = event.eventKind === "duration" ? displayDate : null;
	const displayEnd = event.eventKind === "duration"
		? resolvedPlanEnd ?? forecastEnd ?? displayStart
		: null;

	const eventRow = {
		displayDate,
		displayEnd,
		displayStart,
		event,
		factEnd,
		factStart,
		forecastEnd,
		forecastStart,
		isDependencyDuration: false,
		isPlanDerived,
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
				? getAutonomousPlanAnchorDate(parentRow, stage.dependencyAnchor)
				: null;

			const previousStage = previousStageById.get(stage.id);
			const previousParentRow =
				previousStage?.dependsOnStageId === stage.dependsOnStageId
					? previousEventRowsByStageId.get(stage.dependsOnStageId)
					: null;
			const previousEvent = previousEventById.get(event.id);
			const previousPlanStart = parseGanttDate(previousEvent?.planStartDate) ??
				(event.eventKind === "one_time" ? parseGanttDate(previousEvent?.planEndDate) : null);
			const currentPlanStart = parseGanttDate(event.planStartDate) ??
				(event.eventKind === "one_time" ? parseGanttDate(event.planEndDate) : null);
			const previousParentPlanStart = previousParentRow
				? getAutonomousPlanAnchorDate(
						previousParentRow,
						previousStage?.dependencyAnchor,
					)
				: null;
			const hasManualPlanStartChange =
				Boolean(currentPlanStart) &&
				currentPlanStart?.getTime() !== previousPlanStart?.getTime();
			const isDependencyChanged =
				previousStage?.dependsOnStageId !== stage.dependsOnStageId ||
				(previousStage?.dependencyAnchor ?? DEFAULT_DEPENDENCY_ANCHOR) !==
					(stage.dependencyAnchor ?? DEFAULT_DEPENDENCY_ANCHOR);
			const isParentPlanChanged = planStart?.getTime() !== previousParentPlanStart?.getTime();
			const isDurationChanged = previousStage?.durationDays !== stage.durationDays;

			// Reading a forecast, or changing hours/status/title, must never persist it as the plan.
			if (!isDependencyChanged && !isParentPlanChanged && !isDurationChanged) {
				return event;
			}

			const dependencyStart = planStart ??
				(isDependencyChanged && parentRow
					? getAutonomousDependencyAnchorDate(parentRow, stage.dependencyAnchor, today)
					: null);
			const nextPlanStart =
				hasManualPlanStartChange && currentPlanStart
					? currentPlanStart
					: isDependencyChanged
						? dependencyStart ?? currentPlanStart
					: !isDependencyChanged && previousParentPlanStart && previousPlanStart && planStart
						? addDays(
								previousPlanStart,
								daysBetween(previousParentPlanStart, planStart),
							)
						: currentPlanStart ?? dependencyStart;

			if (!nextPlanStart) {
				return event;
			}
			const durationDays =
				event.eventKind === "duration"
					? getDependencyEventDurationDays(stage, event)
					: null;
			const planStartDate = formatInputDate(nextPlanStart);
			const planEndDate =
				event.eventKind === "duration" && durationDays
					? !isDurationChanged && nextPlanStart.getTime() === currentPlanStart?.getTime() && event.planEndDate
						? event.planEndDate
						: formatInputDate(addDays(nextPlanStart, durationDays - 1))
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
	formatDate = formatDateFull,
) => {
	const isDuration = event.event.eventKind === "duration";
	const range = (start: Date | null, end: Date | null) =>
		`${formatDate(start)}${isDuration ? ` — ${formatDate(end ?? start)}` : ""}`;
	const lines = [event.event.title];
	if (event.planStart) {
		lines.push(`${event.isPlanDerived ? "План по зависимости" : "План"}: ${range(event.planStart, event.planEnd)}`);
	} else {
		lines.push("Плановые даты не заданы");
	}
	if (event.forecastStart && (
		event.forecastStart.getTime() !== event.planStart?.getTime() ||
		event.forecastEnd?.getTime() !== event.planEnd?.getTime()
	)) {
		lines.push(`Прогноз по зависимости: ${range(event.forecastStart, event.forecastEnd)}`);
	}
	if (event.factStart || event.factEnd) {
		lines.push(`Факт: ${range(event.factStart ?? event.factEnd, event.factEnd)}`);
	}
	return lines.join("\n");
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
