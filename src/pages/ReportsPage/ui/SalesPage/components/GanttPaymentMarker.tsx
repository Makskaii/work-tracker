import dayjs from "dayjs";
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

const GANTT_ROW_HEIGHT = 74;
const GANTT_ROW_CENTER_OFFSET = GANTT_ROW_HEIGHT / 2;

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
	anchorTitle?: string,
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
		`Сумма: ${formatMoney(amount)}`,
		`Процент: ${percent}%`,
		`Дата: ${date}`,
		`Стадия: ${payment.stageId ?? "—"}`,
		`Этап: ${getPaymentStageBindingLabel(payment[ProjectCodes.paymentStageBinding])}`,
	];

	if (anchorTitle) {
		lines.push(`Привязка: ${anchorTitle}`);
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
	const style = {
		...getMilestoneStyle(date, timeline),
		top: getPaymentMarkerTop(level),
	};
	const anchorTop = anchor
		? paymentRowHeight +
			anchor.rowIndex * GANTT_ROW_HEIGHT +
			GANTT_ROW_CENTER_OFFSET
		: 0;
	const anchorStyle = anchor
		? {
				...getMilestoneStyle(anchor.date, timeline),
				top: `${anchorTop}px`,
			}
		: null;

	return (
		<>
			<span
				className={`${styles.ganttPaymentMarker} ${getPaymentMarkerClass(
					payment.stageId,
				)}`}
				style={style}
				title={getPaymentTooltip(payment, dealAmount, anchor?.rowTitle)}
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
					<i
						className={styles.ganttPaymentMarkerConnector}
						style={{ height: `${Math.max(anchorTop - 10, 0)}px` }}
					/>
					<i className={styles.ganttPaymentMarkerAnchor} />
				</span>
			) : null}
		</>
	);
};
