import dayjs from "dayjs";
import { FaMoneyBillWave } from "react-icons/fa";
import { ProjectCodes } from "@/components/calendar/constants/const";
import type { GanttTimeline } from "../model/ganttTypes";
import {
	getPaymentMarkerTop,
	getPaymentMarkerTopPx,
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

const GANTT_ROW_HEIGHT = 74;
const GANTT_ROW_CENTER_OFFSET = GANTT_ROW_HEIGHT / 2;
const PAYMENT_MARKER_ICON_HEIGHT = 18;
const PAYMENT_MARKER_ICON_CENTER_OFFSET = PAYMENT_MARKER_ICON_HEIGHT / 2;
const PAYMENT_MARKER_EDGE_OFFSET = 3;
const PAYMENT_MARKER_NEAR_START_THRESHOLD = 8;

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

export const GanttPaymentMarker = ({
	anchor,
	date,
	dealAmount,
	level,
	payment,
	paymentRowHeight,
	timeline,
}: {
	anchor?: GanttPaymentAnchorData;
	date: Date;
	dealAmount: number;
	level: number;
	payment: ProjectPayment;
	paymentRowHeight: number;
	timeline: GanttTimeline;
}) => {
	const amount = getPaymentAmount(payment, dealAmount);
	const percent = getPaymentPercent(payment, dealAmount);
	const markerStyle = getMilestoneStyle(date, timeline);
	const left = Number.parseFloat(String(markerStyle.left ?? 0));
	const safeLeft = Number.isFinite(left)
		? Math.min(Math.max(left, PAYMENT_MARKER_EDGE_OFFSET), 100 - PAYMENT_MARKER_EDGE_OFFSET)
		: left;
	const markerLeft = `${safeLeft}%`;
	const isNearStart = safeLeft < PAYMENT_MARKER_NEAR_START_THRESHOLD;
	const connectorLeft = isNearStart
		? `calc(${markerLeft} + ${PAYMENT_MARKER_ICON_CENTER_OFFSET}px)`
		: markerLeft;
	const style = {
		...markerStyle,
		left: markerLeft,
		top: getPaymentMarkerTop(level),
	};
	const anchorTop = anchor
		? paymentRowHeight +
			anchor.rowIndex * GANTT_ROW_HEIGHT +
			GANTT_ROW_CENTER_OFFSET
		: 0;
	const connectorTop =
		getPaymentMarkerTopPx(level) + PAYMENT_MARKER_ICON_CENTER_OFFSET;
	const connectorHeight = Math.max(anchorTop - connectorTop, 0);
	const anchorStyle = anchor
		? {
				left: connectorLeft,
				height: `${connectorHeight}px`,
				top: `${connectorTop}px`,
			}
		: null;

	return (
		<>
			<span
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
			{anchorStyle ? (
				<span className={styles.ganttPaymentMarkerLink} style={anchorStyle}>
					<i className={styles.ganttPaymentMarkerConnector} />
					<i className={styles.ganttPaymentMarkerAnchor} />
				</span>
			) : null}
		</>
	);
};
