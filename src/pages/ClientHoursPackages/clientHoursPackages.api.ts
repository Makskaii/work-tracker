import { $backendApi } from "@/shared/config/axios/axios.config";
import type { ClientPackage, PackagePurchase, PackageState } from "./clientHoursPackages.types";

type ApiPackage = { id: number; purchasedHours: number | string; purchaseDate: string; amount: number | string | null; comment: string | null; remainingHours: number | string };
type ApiProjectGroup = { project: { id: number; title: string; clientCompany: string | null }; purchasedHours: number | string; remainingHours: number | string; state: PackageState; lastChargeAt: string | null; packages: ApiPackage[] };

export type SupportHoursPackagePayload = { projectId: number; purchasedHours: number; purchaseDate: string; amount?: number; comment?: string };

const numberValue = (value: number | string | null) => Number(value ?? 0);
const dateLabel = (value: string | null) => value ? new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit" }).format(new Date(value)) : "-";
const status = (state: PackageState) => ({ active: ["Активный пакет", "Есть остаток"], ending: ["Заканчиваются", "Осталось менее 10%"], empty: ["Часы закончились", "Нужна покупка"], overdue: ["Перерасход", "Работы сверх пакета"] }[state]);

const toClientPackage = (group: ApiProjectGroup): ClientPackage => {
	const purchasedHours = numberValue(group.purchasedHours);
	const remainingHours = numberValue(group.remainingHours);
	const [statusLabel, statusHint] = status(group.state);
	const purchases: PackagePurchase[] = group.packages.map((item) => ({ id: item.id, date: item.purchaseDate, hours: numberValue(item.purchasedHours), remaining: numberValue(item.remainingHours), state: numberValue(item.remainingHours) > 0 ? "Активный" : "Часы закончились", amount: item.amount == null ? null : numberValue(item.amount), comment: item.comment }));

	return { id: group.project.id, client: group.project.clientCompany ? `${group.project.clientCompany} | ${group.project.title}` : group.project.title, lastCharge: dateLabel(group.lastChargeAt), remainingHours, state: group.state, status: statusLabel, statusHint, progress: purchasedHours > 0 ? Math.min(100, Math.max(0, Math.round(((purchasedHours - remainingHours) / purchasedHours) * 100))) : 0, purchases };
};

export const fetchSupportHoursPackages = async (signal?: AbortSignal) => {
	const response = await $backendApi.get<ApiProjectGroup[]>("support-hours-packages", { signal });
	return response.data.map(toClientPackage);
};
export const createSupportHoursPackage = async (payload: SupportHoursPackagePayload) => $backendApi.post("support-hours-packages", payload);
export const updateSupportHoursPackage = async (id: number, payload: Omit<SupportHoursPackagePayload, "projectId">) => $backendApi.patch(`support-hours-packages/${id}`, payload);
export const deleteSupportHoursPackage = (id: number) => $backendApi.delete(`support-hours-packages/${id}`);
