import dayjs from "dayjs";
import { ProjectCodes } from "@/components/calendar/constants/const";
import type { GanttRow, GanttStage, GanttTimeline } from "./ganttTypes";
import { addDays, getMilestoneStyle } from "./ganttUtils";
import { toNumber } from "./profitabilityUtils";
import type { ProjectPayment } from "./types";

const PAYMENT_MARKER_BASE_HEIGHT = 92;
const PAYMENT_MARKER_MIN_DISTANCE = 12;
const PAYMENT_MARKER_SLOT_HEIGHT = 68;
const PAYMENT_STAGE_BINDING_ROW: Record<
	string,
	{ id: string; type: GanttRow["type"] }
> = {
	"404": { id: "tz", type: "stage" },
	"405": { id: "tzSign", type: "milestone" },
	"406": { id: "development", type: "stage" },
	"407": { id: "education", type: "stage" },
	"408": { id: "close", type: "milestone" },
};

export type GanttPaymentStageTargetData = {
	date: Date;
	isFallbackDate: boolean;
	paymentBaseDate: Date;
	rowId: string;
	rowIndex: number;
	rowTitle: string;
	rowType: GanttRow["type"];
};

export type GanttPaymentMarkerData = {
	stageTarget: GanttPaymentStageTargetData | null;
	date: Date;
	isPaymentDateFallback: boolean;
	level: number;
	payment: ProjectPayment;
};

export const getPaymentMarkerTopPx = (level: number) =>
	16 + level * PAYMENT_MARKER_SLOT_HEIGHT;

export const getPaymentMarkerTop = (level: number) =>
	`${getPaymentMarkerTopPx(level)}px`;

const getTzPlanStart = (rows: GanttRow[]) => {
	const tzRow = rows.find(
		(row) => row.type === "stage" && row.stage.id === "tz",
	);

	return tzRow?.type === "stage" ? tzRow.stage.planStart : null;
};

const getNormalizedPaymentStageBinding = (payment: ProjectPayment) => {
	const stageBinding = String(
		payment[ProjectCodes.paymentStageBinding] ?? "",
	).trim();

	return stageBinding && stageBinding !== "403" ? stageBinding : "404";
};

const getStageAnchorDate = (stage: GanttStage) => {
	if (stage.factStart && stage.factEnd && stage.factEnd > stage.factStart) {
		if (stage.planStart && stage.factStart < stage.planStart) {
			return stage.planStart;
		}

		if (stage.planEnd && stage.factEnd > stage.planEnd) {
			return stage.planEnd;
		}

		return stage.factEnd;
	}

	return stage.planEnd;
};

const getStagePaymentBaseDate = (stage: GanttStage) =>
	stage.factEnd ?? stage.planEnd ?? stage.factStart ?? stage.planStart;

const getPaymentWaitingDays = (payment: ProjectPayment) =>
	Math.max(0, Math.round(toNumber(payment[ProjectCodes.paymentWaitingDays])));

const getExpectedPaymentDate = (
	stageTarget: GanttPaymentStageTargetData | null,
	payment: ProjectPayment,
) => {
	if (!stageTarget) {
		return null;
	}

	return addDays(stageTarget.paymentBaseDate, getPaymentWaitingDays(payment));
};

const getPaymentStageTarget = (
	payment: ProjectPayment,
	rows: GanttRow[],
): GanttPaymentStageTargetData | null => {
	const stageBinding = getNormalizedPaymentStageBinding(payment);
	const targetRow = PAYMENT_STAGE_BINDING_ROW[stageBinding];

	if (!targetRow) {
		return null;
	}

	const rowIndex = rows.findIndex((row) => {
		if (row.type !== targetRow.type) {
			return false;
		}

		return row.type === "stage"
			? row.stage.id === targetRow.id
			: row.milestone.id === targetRow.id;
	});

	if (rowIndex === -1) {
		return null;
	}

	const row = rows[rowIndex];
	const fallbackDate = getTzPlanStart(rows);
	const ownDate =
		row.type === "stage"
			? getStageAnchorDate(row.stage)
			: row.milestone.date;
	const paymentBaseDate =
		(row.type === "stage"
			? getStagePaymentBaseDate(row.stage)
			: row.milestone.date) ?? fallbackDate;
	const date = ownDate ?? fallbackDate;

	const rowTitle = row.type === "stage" ? row.stage.title : row.milestone.title;

	return date && paymentBaseDate
		? {
				date,
				isFallbackDate: !ownDate,
				paymentBaseDate,
				rowId: targetRow.id,
				rowIndex,
				rowTitle,
				rowType: targetRow.type,
			}
		: null;
};

export const buildPaymentMarkers = (
	payments: ProjectPayment[],
	rows: GanttRow[],
	timeline: GanttTimeline,
): GanttPaymentMarkerData[] => {
	const markerLevels: number[] = [];
	const fallbackPaymentDate = getTzPlanStart(rows);

	return payments
		.map((payment) => {
			const stageTarget = getPaymentStageTarget(payment, rows);
			const expectedPaymentDate = getExpectedPaymentDate(stageTarget, payment);
			const paymentDate = payment[ProjectCodes.paymentDate]
				? dayjs(payment[ProjectCodes.paymentDate])
				: null;
			const isPaymentDateFallback = !paymentDate?.isValid();
			const date =
				expectedPaymentDate ??
				(paymentDate?.isValid() ? paymentDate.toDate() : fallbackPaymentDate);

			if (!date) {
				return null;
			}

			return {
				stageTarget,
				date,
				isPaymentDateFallback,
				payment,
			};
		})
		.filter(
			(
				marker,
			): marker is {
				stageTarget: GanttPaymentStageTargetData | null;
				date: Date;
				isPaymentDateFallback: boolean;
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
		});
};

export const getPaymentRowHeight = (markers: GanttPaymentMarkerData[]) =>
	markers.length > 0
		? Math.max(
				PAYMENT_MARKER_BASE_HEIGHT,
				PAYMENT_MARKER_BASE_HEIGHT +
					Math.max(...markers.map((marker) => marker.level)) *
						PAYMENT_MARKER_SLOT_HEIGHT,
			)
		: PAYMENT_MARKER_BASE_HEIGHT;
