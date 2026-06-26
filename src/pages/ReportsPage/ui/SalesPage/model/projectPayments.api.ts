import { $backendApi } from "@/shared/config/axios/axios.config";
import type {
	AutonomousProjectPayment,
	AutonomousProjectPaymentPayload,
} from "./types";

export const fetchAutonomousProjectPayments = async (
	projectId: string,
	signal?: AbortSignal,
) => {
	const response = await $backendApi.get<AutonomousProjectPayment[]>(
		`project-reports/projects/${projectId}/payments`,
		{ signal },
	);

	return response.data;
};

export const createAutonomousProjectPayment = async (
	projectId: string,
	payload: AutonomousProjectPaymentPayload,
) => {
	const response = await $backendApi.post<AutonomousProjectPayment>(
		`project-reports/projects/${projectId}/payments`,
		payload,
	);

	return response.data;
};

export const updateAutonomousProjectPayment = async (
	paymentId: number,
	payload: Partial<AutonomousProjectPaymentPayload>,
) => {
	const response = await $backendApi.patch<AutonomousProjectPayment>(
		`project-reports/payments/${paymentId}`,
		payload,
	);

	return response.data;
};

export const deleteAutonomousProjectPayment = (paymentId: number) =>
	$backendApi.delete(`project-reports/payments/${paymentId}`);
