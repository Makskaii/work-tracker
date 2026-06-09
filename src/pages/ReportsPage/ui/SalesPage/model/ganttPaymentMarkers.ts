import dayjs from "dayjs";
import type { GanttTimeline } from "./ganttTypes";
import { getMilestoneStyle } from "./ganttUtils";
import type { ProjectPayment } from "./types";

const PAYMENT_MARKER_BASE_HEIGHT = 92;
const PAYMENT_MARKER_MIN_DISTANCE = 5;
const PAYMENT_MARKER_SLOT_HEIGHT = 58;

export type GanttPaymentMarkerData = {
	date: Date;
	level: number;
	payment: ProjectPayment;
};

export const getPaymentMarkerTop = (level: number) =>
	`${16 + level * PAYMENT_MARKER_SLOT_HEIGHT}px`;

export const buildPaymentMarkers = (
	payments: ProjectPayment[],
	timeline: GanttTimeline,
): GanttPaymentMarkerData[] => {
	const markerLevels: number[] = [];

	return payments
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
