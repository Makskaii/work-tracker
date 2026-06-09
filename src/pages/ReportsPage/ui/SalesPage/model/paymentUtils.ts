import { ProjectCodes } from "@/components/calendar/constants/const";
import { toNumber } from "./profitabilityUtils";
import type { ProjectPayment } from "./types";

export const PAYMENT_STAGE_BINDING_LABELS: Record<string, string> = {
	"403": "Не привязано к этапу",
	"404": "Написание ТЗ",
	"405": "Подписание ТЗ",
	"406": "Разработка",
	"407": "Обучение / сдача",
	"408": "Закрытие проекта",
};

export enum ProjectPaymentStageId {
	Planned = "DT1144_35:NEW",
	Debt = "DT1144_35:CLIENT",
	Canceled = "DT1144_35:FAIL",
	Paid = "DT1144_35:SUCCESS",
}

export type ProjectPaymentStageType =
	| "planned"
	| "debt"
	| "canceled"
	| "paid";

export const getProjectPaymentStageType = (
	stageId?: string | null,
): ProjectPaymentStageType => {
	const normalizedStage = String(stageId ?? "").trim().toUpperCase();

	switch (normalizedStage) {
		case ProjectPaymentStageId.Paid:
			return "paid";
		case ProjectPaymentStageId.Canceled:
			return "canceled";
		case ProjectPaymentStageId.Debt:
			return "debt";
		case ProjectPaymentStageId.Planned:
		default:
			return "planned";
	}
};

type PaymentStageBindingValue = string | number | null | undefined;

const getDisplayValue = (value: PaymentStageBindingValue): string => {
	if (value === null || value === undefined || value === "") {
		return "—";
	}

	if (typeof value === "string" || typeof value === "number") {
		return String(value);
	}

	return "—";
};

export const getPaymentStageBindingLabel = (
	value: PaymentStageBindingValue,
) => {
	const rawValue = getDisplayValue(value);

	return PAYMENT_STAGE_BINDING_LABELS[rawValue] ?? rawValue;
};

export const getRawPaymentAmount = (payment: ProjectPayment) =>
	toNumber(payment[ProjectCodes.paymentAmount]);

export const getRawPaymentPercent = (payment: ProjectPayment) =>
	toNumber(payment[ProjectCodes.paymentPercent]);

export const getPaymentAmount = (
	payment: ProjectPayment,
	dealAmount: number,
) => {
	const amount = getRawPaymentAmount(payment);

	if (amount) {
		return amount;
	}

	const percent = getRawPaymentPercent(payment);

	return dealAmount && percent ? Math.round((dealAmount * percent) / 100) : 0;
};

export const getPaymentPercent = (
	payment: ProjectPayment,
	dealAmount: number,
) => {
	const percent = getRawPaymentPercent(payment);

	if (percent) {
		return percent;
	}

	const amount = getRawPaymentAmount(payment);

	return dealAmount && amount ? Math.round((amount / dealAmount) * 100) : 0;
};
