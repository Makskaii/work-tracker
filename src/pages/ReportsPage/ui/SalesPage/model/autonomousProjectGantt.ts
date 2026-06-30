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
	ProjectGanttStage,
} from "./types";

export type AutonomousGanttEventRow = {
	displayDate: Date | null;
	displayEnd: Date | null;
	displayStart: Date | null;
	event: ProjectGanttEvent;
	factEnd: Date | null;
	factStart: Date | null;
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

const MIN_TIMELINE_DAYS = 56;

const buildEventRow = (
	event: ProjectGanttEvent,
	stageById: Map<number, ProjectGanttStage>,
	eventByStageId: Map<number, ProjectGanttEvent>,
	visitedStageIds = new Set<number>(),
): AutonomousGanttEventRow => {
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
				new Set([...visitedStageIds, event.stageId]),
			)
		: null;
	const dependencyDurationDays = stage?.durationDays ?? 0;
	const dependencyStart =
		dependencyRow?.factEnd ??
		dependencyRow?.displayEnd ??
		dependencyRow?.planEnd ??
		null;
	const hasDependencyDuration =
		Boolean(stage?.dependsOnStageId) && dependencyDurationDays > 0;

	if (hasDependencyDuration) {
		const displayStart = planStart ?? factStart ?? dependencyStart;
		const displayEnd =
			planEnd ??
			factEnd ??
			(displayStart ? addDays(displayStart, dependencyDurationDays) : null);

		return {
			displayDate: displayStart,
			displayEnd,
			displayStart,
			event,
			factEnd,
			factStart,
			planEnd,
			planStart,
		};
	}

	const resolvedPlanStart = planStart;
	const resolvedPlanEnd = planEnd;
	const resolvedFactStart = factStart;
	const resolvedFactEnd = factEnd;
	const displayDate = resolvedFactStart ?? resolvedPlanStart;
	const displayStart = event.eventKind === "duration" ? displayDate : null;
	const displayEnd =
		event.eventKind === "duration"
			? (resolvedFactEnd ?? resolvedPlanEnd ?? displayStart)
			: null;

	return {
		displayDate,
		displayEnd,
		displayStart,
		event,
		factEnd: resolvedFactEnd,
		factStart: resolvedFactStart,
		planEnd: resolvedPlanEnd,
		planStart: resolvedPlanStart,
	};
};

const getPaymentDisplayDate = (
	payment: AutonomousProjectPayment,
	eventRowsByStageId: Map<number, AutonomousGanttEventRow>,
) => {
	const stageEvent = eventRowsByStageId.get(payment.stageId);

	if (!stageEvent) {
		return parseGanttDate(payment.paymentDate);
	}

	return payment.paymentAnchor === "stage_start"
		? (stageEvent.factStart ?? stageEvent.planStart ?? stageEvent.displayStart)
		: (stageEvent.factEnd ?? stageEvent.planEnd ?? stageEvent.displayEnd);
};

const formatInputDate = (date: Date) =>
	`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

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
}: {
	events: ProjectGanttEvent[];
	payments: AutonomousProjectPayment[];
	stages: ProjectGanttStage[];
}) => {
	const stageById = new Map(stages.map((stage) => [stage.id, stage]));
	const eventByStageId = new Map(events.map((event) => [event.stageId, event]));
	const eventRows = events.map((event) =>
		buildEventRow(event, stageById, eventByStageId),
	);
	const eventRowsByStageId = new Map(
		eventRows.map((event) => [event.event.stageId, event]),
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
	const stageById = new Map(stages.map((stage) => [stage.id, stage]));
	const eventByStageId = new Map(events.map((event) => [event.stageId, event]));
	const eventRows = events.map((event) =>
		buildEventRow(event, stageById, eventByStageId),
	);
	const eventRowsByStageId = new Map(
		eventRows.map((event) => [event.event.stageId, event]),
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
	if (event.event.eventKind === "duration") {
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
) =>
	[
		event.event.title,
		`План: ${formatDateFull(event.planStart)} — ${formatDateFull(event.planEnd)}`,
		`Факт: ${formatDateFull(event.factStart)} — ${formatDateFull(event.factEnd)}`,
	].join("\n");

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
