import dayjs from "dayjs";
import { ProjectCodes } from "@/components/calendar/constants/const";
import type { GanttRow, GanttTimeline } from "./ganttTypes";
import { getMilestoneStyle } from "./ganttUtils";
import type { ProjectPayment } from "./types";

const PAYMENT_MARKER_BASE_HEIGHT = 92;
const PAYMENT_MARKER_MIN_DISTANCE = 5;
const PAYMENT_MARKER_SLOT_HEIGHT = 58;
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

export type GanttPaymentAnchorData = {
	date: Date;
	isFallbackDate: boolean;
	rowId: string;
	rowIndex: number;
	rowTitle: string;
	rowType: GanttRow["type"];
};

export type GanttPaymentMarkerData = {
	anchor: GanttPaymentAnchorData | null;
	date: Date;
	level: number;
	payment: ProjectPayment;
};

export const getPaymentMarkerTopPx = (level: number) =>
	16 + level * PAYMENT_MARKER_SLOT_HEIGHT;

export const getPaymentMarkerTop = (level: number) =>
	`${getPaymentMarkerTopPx(level)}px`;

const getLatestPlanEnd = (rows: GanttRow[]) =>
	rows.reduce<Date | null>((latestDate, row) => {
		if (row.type !== "stage" || !row.stage.planEnd) {
			return latestDate;
		}

		if (!latestDate || row.stage.planEnd > latestDate) {
			return row.stage.planEnd;
		}

		return latestDate;
	}, null);

const getPaymentAnchor = (
	payment: ProjectPayment,
	rows: GanttRow[],
): GanttPaymentAnchorData | null => {
	const stageBinding = String(
		payment[ProjectCodes.paymentStageBinding] ?? "",
	).trim();
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
	const fallbackDate = getLatestPlanEnd(rows);
	const ownDate =
		row.type === "stage"
			? row.stage.planEnd
			: row.milestone.date;
	const date = ownDate ?? fallbackDate;

	const rowTitle = row.type === "stage" ? row.stage.title : row.milestone.title;

	return date
		? {
				date,
				isFallbackDate: !ownDate,
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

	return payments
		.map((payment) => {
			const paymentDate = payment[ProjectCodes.paymentDate]
				? dayjs(payment[ProjectCodes.paymentDate])
				: null;

			if (!paymentDate?.isValid()) {
				return null;
			}

			return {
				anchor: getPaymentAnchor(payment, rows),
				date: paymentDate.toDate(),
				payment,
			};
		})
		.filter(
			(
				marker,
			): marker is {
				anchor: GanttPaymentAnchorData | null;
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
