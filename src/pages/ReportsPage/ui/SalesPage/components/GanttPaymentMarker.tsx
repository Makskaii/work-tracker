import dayjs from "dayjs";
import { forwardRef } from "react";
import { FaMoneyBillWave } from "react-icons/fa";
import { ProjectCodes } from "@/components/calendar/constants/const";
import type { GanttTimeline } from "../model/ganttTypes";
import {
	getPaymentMarkerTop,
	type GanttPaymentAnchorData,
} from "../model/ganttPaymentMarkers";
import { getMilestoneStyle } from "../model/ganttUtils";
import {
	getPaymentAmount,
	getPaymentPercent,
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

	if (stageType === "canceled") {
		return styles.ganttPaymentCanceled;
	}

	if (stageType === "debt") {
		return styles.ganttPaymentDebt;
	}

	return styles.ganttPaymentPlanned;
};

const getPaymentTooltip = (
	payment: ProjectPayment,
	dealAmount: number,
	anchor?: GanttPaymentAnchorData,
) => {
	const paymentDate = payment[ProjectCodes.paymentDate]
		? dayjs(payment[ProjectCodes.paymentDate])
		: null;
	const date = paymentDate?.isValid()
		? paymentDate.format("DD.MM.YYYY")
		: "—";
	const amount = getPaymentAmount(payment, dealAmount);
	const percent = getPaymentPercent(payment, dealAmount);
	const lines = [
		"Оплата",
		`Дата платежа: ${date}`,
		`Сумма: ${formatMoney(amount)}`,
		`Процент: ${percent}%`,
		`Стадия: ${payment.stageId ?? "—"}`,
		`Этап: ${getPaymentStageBindingLabel(payment[ProjectCodes.paymentStageBinding])}`,
	];

	if (anchor) {
		lines.push(`Привязка к этапу: ${anchor.rowTitle}`);
	}

	if (anchor?.isFallbackDate) {
		lines.push("Дата этапа не заполнена, использована последняя плановая дата");
	}

	return lines.join("\n");
};

type GanttPaymentMarkerProps = {
	anchor?: GanttPaymentAnchorData;
	date: Date;
	dealAmount: number;
	level: number;
	payment: ProjectPayment;
	timeline: GanttTimeline;
};

export const GanttPaymentMarker = forwardRef<
	HTMLSpanElement,
	GanttPaymentMarkerProps
>(({
	anchor,
	date,
	dealAmount,
	level,
	payment,
	timeline,
}, ref) => {
	const amount = getPaymentAmount(payment, dealAmount);
	const percent = getPaymentPercent(payment, dealAmount);
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
				title={getPaymentTooltip(payment, dealAmount, anchor)}
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
});

GanttPaymentMarker.displayName = "GanttPaymentMarker";
