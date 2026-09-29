import { $backendApi } from "@/shared/config/axios/axios.config";
import type { SupportTransferDraft, SupportTransferPreview } from "./supportTransfer.model";
const body = ({ projectId: _projectId, ...request }: SupportTransferDraft) => request;
export const previewSupportTransfer = async (draft: SupportTransferDraft, token: string) => {
  const { data } = await $backendApi.post<SupportTransferPreview>(`support-hours-packages/projects/${draft.projectId}/transfers/preview`, body(draft), { headers: { "X-Bitrix-Token": token }, timeout: 120_000 });
  return data;
};
export const commitSupportTransfer = async (draft: SupportTransferDraft, fingerprint: string, token: string, operationId: string) => {
  const { data } = await $backendApi.post(`support-hours-packages/projects/${draft.projectId}/transfers`, body(draft), { headers: { "X-Bitrix-Token": token, "If-Match": fingerprint, "Idempotency-Key": operationId }, timeout: 120_000 });
  return data;
};
export const resumeSupportTransfer = async (projectId: number, operationId: string, token: string, cancel = false) => {
  const { data } = await $backendApi.post(`support-hours-packages/projects/${projectId}/transfers/${operationId}/${cancel ? "cancel" : "resume"}`, {}, { headers: { "X-Bitrix-Token": token }, timeout: 120_000 });
  return data;
};
export const pendingTransferFromError = (error: unknown): string | null => {
  const response = (error as { response?: { data?: { pendingTransferId?: unknown } } })?.response;
  const id = response?.data?.pendingTransferId;
  return typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id) ? id : null;
};
