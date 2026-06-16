import dayjs from "dayjs";
import { FaMoneyBillWave } from "react-icons/fa";
import { ProjectCodes } from "@/components/calendar/constants/const";
import {
	getPaymentAmount,
	getPaymentPercent,
	getPaymentStageBindingLabel,
	getProjectPaymentStageType,
} from "../model/paymentUtils";
import type { GanttTimeline } from "../model/ganttTypes";
import { getPaymentMarkerTop } from "../model/ganttPaymentMarkers";
import { getMilestoneStyle } from "../model/ganttUtils";
import { formatMoney } from "../model/profitabilityUtils";
import type { ProjectPayment } from "../model/types";
import styles from "../SalesProfitabilityReport.module.scss";

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

const getPaymentTooltip = (payment: ProjectPayment, dealAmount: number) => {
	const paymentDate = payment[ProjectCodes.paymentDate]
		? dayjs(payment[ProjectCodes.paymentDate])
		: null;
	const date = paymentDate?.isValid()
		? paymentDate.format("DD.MM.YYYY")
		: "—";
	const amount = getPaymentAmount(payment, dealAmount);
	const percent = getPaymentPercent(payment, dealAmount);

	return [
		"Оплата",
		`Сумма: ${formatMoney(amount)}`,
		`Процент: ${percent}%`,
		`Дата: ${date}`,
		`Стадия: ${payment.stageId ?? "—"}`,
		`Этап: ${getPaymentStageBindingLabel(payment[ProjectCodes.paymentStageBinding])}`,
	].join("\n");
};

export const GanttPaymentMarker = ({
	date,
	dealAmount,
	level,
	payment,
	timeline,
}: {
	date: Date;
	dealAmount: number;
	level: number;
	payment: ProjectPayment;
	timeline: GanttTimeline;
}) => {
	const amount = getPaymentAmount(payment, dealAmount);
	const percent = getPaymentPercent(payment, dealAmount);
	const style = {
		...getMilestoneStyle(date, timeline),
		top: getPaymentMarkerTop(level),
	};

	return (
		<span
			className={`${styles.ganttPaymentMarker} ${getPaymentMarkerClass(
				payment.stageId,
			)}`}
			style={style}
			title={getPaymentTooltip(payment, dealAmount)}
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
};
