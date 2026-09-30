import { $backendApi } from "@/shared/config/axios/axios.config";
import { type GanttPaymentResponse, normalizeGanttPayment } from "./projectGanttResponses";
import type {
	AutonomousProjectPaymentPayload,
} from "./types";

export const fetchAutonomousProjectPayments = async (
	projectId: string,
	signal?: AbortSignal,
) => {
	const response = await $backendApi.get<GanttPaymentResponse[]>(
		`project-reports/projects/${projectId}/payments`,
		{ signal },
	);

	return response.data.map(normalizeGanttPayment);
};

export const createAutonomousProjectPayment = async (
	projectId: string,
	payload: AutonomousProjectPaymentPayload,
) => {
	const response = await $backendApi.post<GanttPaymentResponse>(
		`project-reports/projects/${projectId}/payments`,
		payload,
	);

	return normalizeGanttPayment(response.data);
};

export const updateAutonomousProjectPayment = async (
	paymentId: number,
	payload: Partial<AutonomousProjectPaymentPayload>,
) => {
	const response = await $backendApi.patch<GanttPaymentResponse>(
		`project-reports/payments/${paymentId}`,
		payload,
	);

	return normalizeGanttPayment(response.data);
};

export const deleteAutonomousProjectPayment = (paymentId: number) =>
	$backendApi.delete(`project-reports/payments/${paymentId}`);
