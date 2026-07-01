import type {
	AutonomousPaymentAnchor,
	AutonomousPaymentStatus,
} from "./types";

export type PaymentFormState = {
	amount: string;
	id: number | null;
	paymentAnchor: AutonomousPaymentAnchor;
	paymentDate: string;
	percent: string;
	stageId: number | null;
	status: AutonomousPaymentStatus;
	waitingDays: string;
};

export const DEFAULT_PAYMENT_FORM: PaymentFormState = {
	amount: "",
	id: null,
	paymentAnchor: "stage_end",
	paymentDate: "",
	percent: "",
	stageId: null,
	status: "todo",
	waitingDays: "",
};

export const toNumberOrNull = (value: string) => {
	const normalizedValue = value.trim().replace(",", ".");

	if (!normalizedValue) return null;

	const parsedValue = Number(normalizedValue);

	return Number.isFinite(parsedValue) ? parsedValue : null;
};

const formatPaymentNumber = (value: number) => {
	const roundedValue = Math.round(value * 100) / 100;

	return Number.isInteger(roundedValue)
		? String(roundedValue)
		: String(roundedValue).replace(".", ",");
};

export const calculatePaymentFields = ({
	amount,
	percent,
	projectAmount,
	source,
}: {
	amount: string;
	percent: string;
	projectAmount: number | null | undefined;
	source: "amount" | "percent";
}): Pick<PaymentFormState, "amount" | "percent"> => {
	const normalizedProjectAmount = projectAmount ?? 0;

	if (normalizedProjectAmount <= 0) {
		return { amount, percent };
	}

	if (source === "percent") {
		const percentValue = toNumberOrNull(percent);

		return {
			amount:
				percentValue === null
					? ""
					: formatPaymentNumber((normalizedProjectAmount * percentValue) / 100),
			percent,
		};
	}

	const amountValue = toNumberOrNull(amount);

	return {
		amount,
		percent:
			amountValue === null
				? ""
				: formatPaymentNumber((amountValue / normalizedProjectAmount) * 100),
	};
};
