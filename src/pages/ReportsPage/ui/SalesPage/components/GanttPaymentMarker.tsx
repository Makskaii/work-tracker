import dayjs from "dayjs";
import { forwardRef } from "react";
import { FaMoneyBillWave } from "react-icons/fa";
import { ProjectCodes } from "@/components/calendar/constants/const";
import type { GanttTimeline } from "../model/ganttTypes";
import {
	getPaymentMarkerTop,
	type GanttPaymentStageTargetData,
} from "../model/ganttPaymentMarkers";
import { getMilestoneStyle } from "../model/ganttUtils";
import {
	getPaymentAmount,
	getPaymentStageBindingLabel,
	getProjectPaymentStageType,
} from "../model/paymentUtils";
import { formatMoney } from "../model/profitabilityUtils";
import type { ProjectPayment } from "../model/types";
import styles from "../SalesProfitabilityReport.module.scss";

const PAYMENT_MARKER_EDGE_OFFSET = 8;
const PAYMENT_MARKER_NEAR_START_THRESHOLD = 14;

const getPaymentMarkerClass = (stageId?: string | null) => {
	const stageType = getProjectPaymentStageType(stageId);

	if (stageType === "paid") {
		return styles.ganttPaymentPaid;
	}

	return styles.ganttPaymentCanceled;
};

const getPaymentTooltip = (
	payment: ProjectPayment,
	dealAmount: number,
	stageTarget?: GanttPaymentStageTargetData,
) => {
	const paymentDate = payment[ProjectCodes.paymentDate]
		? dayjs(payment[ProjectCodes.paymentDate])
		: null;
	const date = paymentDate?.isValid()
		? paymentDate.format("DD.MM.YYYY")
		: "—";
	const amount = getPaymentAmount(payment, dealAmount);
	const lines = [
		"Оплата",
		`Дата платежа: ${date}`,
		`Сумма: ${formatMoney(amount)}`,
		`Этап: ${getPaymentStageBindingLabel(payment[ProjectCodes.paymentStageBinding])}`,
	];

	if (stageTarget) {
		lines.push(`Привязка к этапу: ${stageTarget.rowTitle}`);
	}

	if (stageTarget?.isFallbackDate) {
		lines.push("Дата этапа не заполнена, использована последняя плановая дата");
	}

	return lines.join("\n");
};

type GanttPaymentMarkerProps = {
	date: Date;
	dealAmount: number;
	level: number;
	payment: ProjectPayment;
	stageTarget?: GanttPaymentStageTargetData;
	timeline: GanttTimeline;
};

export const GanttPaymentMarker = forwardRef<
	HTMLSpanElement,
	GanttPaymentMarkerProps
>(({
	date,
	dealAmount,
	level,
	payment,
	stageTarget,
	timeline,
}, ref) => {
	const amount = getPaymentAmount(payment, dealAmount);
	const markerStyle = getMilestoneStyle(date, timeline);
	const left = Number.parseFloat(String(markerStyle.left ?? 0));
	const safeLeft = Number.isFinite(left)
		? Math.min(Math.max(left, PAYMENT_MARKER_EDGE_OFFSET), 100 - PAYMENT_MARKER_EDGE_OFFSET)
		: left;
	const markerLeft = `${safeLeft}%`;
	const isNearStart = safeLeft < PAYMENT_MARKER_NEAR_START_THRESHOLD;
	const style = {
		...markerStyle,
		left: markerLeft,
		top: getPaymentMarkerTop(level),
	};
	return (
			<span
				ref={ref}
				className={`${styles.ganttPaymentMarker} ${getPaymentMarkerClass(
					payment.stageId,
				)} ${isNearStart ? styles.ganttPaymentMarkerNearStart : ""}`}
				style={style}
				title={getPaymentTooltip(payment, dealAmount, stageTarget)}
			>
				<b>
					<FaMoneyBillWave aria-hidden="true" />
				</b>
				<small>{formatMoney(amount)}</small>
			</span>
	);
});

GanttPaymentMarker.displayName = "GanttPaymentMarker";
