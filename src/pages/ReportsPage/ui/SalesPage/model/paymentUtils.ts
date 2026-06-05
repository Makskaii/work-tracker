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

const getDisplayValue = (value: unknown): string => {
	if (value === null || value === undefined || value === "") {
		return "—";
	}

	if (typeof value === "string" || typeof value === "number") {
		return String(value);
	}

	if (Array.isArray(value)) {
		const values = value
			.map((item) => getDisplayValue(item))
			.filter((item) => item !== "—");

		return values.length ? values.join(", ") : "—";
	}

	if (typeof value === "object") {
		const record = value as Record<string, unknown>;
		const text =
			record.title ?? record.name ?? record.value ?? record.VALUE ?? record.label;

		return getDisplayValue(text);
	}

	return "—";
};

export const getPaymentStageBindingLabel = (value: unknown) => {
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
