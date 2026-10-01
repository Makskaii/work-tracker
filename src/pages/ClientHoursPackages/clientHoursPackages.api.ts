import { $backendApi } from "@/shared/config/axios/axios.config";
import type {
	ClientPackage,
	PackageConsumption,
	PackagePurchase,
	PackageState,
	SupportProjectOption,
} from "./clientHoursPackages.types";

type ApiConsumption = {
	id: number;
	hours: number | string;
	report: {
		bitrixReportId: string;
		bitrixTaskId: string | null;
		taskTitle: string | null;
		bitrixResponsibleId: string | null;
		responsibleName: string | null;
		bitrixCompanyId: string | null;
		companyName: string | null;
		projectTitle: string | null;
		bitrixActivityId: string | null;
		activityTitle: string | null;
		reportDate: string;
		reportTitle: string | null;
		reportDescription: string | null;
	};
};
type ApiPackage = {
	id: number;
	purchasedHours: number | string;
	purchaseDate: string;
	amount: number | string | null;
	comment: string | null;
	remainingHours: number | string;
	consumptions?: ApiConsumption[];
};
export type ApiProjectGroup = {
	project: { id: number; title: string; clientCompany: string | null };
	purchasedHours: number | string;
	remainingHours: number | string;
	state: PackageState;
	lastChargeAt: string | null;
	packages: ApiPackage[];
};

export type SupportHoursPackagePayload = {
	projectId: number;
	purchasedHours: number;
	purchaseDate: string;
	amount?: number;
	comment?: string | null;
};

export type SupportProjectTask = {
	id: string;
	title: string;
	stageId: string | null;
};

const numberValue = (value: number | string | null) => Number(value ?? 0);
const dateLabel = (value: string | null) =>
	value
		? new Intl.DateTimeFormat("ru-RU", {
				day: "2-digit",
				month: "2-digit",
			}).format(new Date(value))
		: "-";
const status = (state: PackageState) =>
	({
		active: ["Активный пакет", "Есть остаток"],
		ending: ["Заканчиваются", "Осталось менее 10%"],
		empty: ["Часы закончились", "Нужна покупка"],
		overdue: ["Перерасход", "Работы сверх пакета"],
	})[state];

export const toClientPackage = (group: ApiProjectGroup): ClientPackage => {
	const purchasedHours = numberValue(group.purchasedHours);
	const remainingHours = numberValue(group.remainingHours);
	const [statusLabel, statusHint] = status(group.state);
	const purchases: PackagePurchase[] = group.packages.map((item) => ({
		id: numberValue(item.id),
		date: item.purchaseDate,
		hours: numberValue(item.purchasedHours),
		remaining: numberValue(item.remainingHours),
		state:
			numberValue(item.remainingHours) > 0 ? "Активный" : "Часы закончились",
		amount: item.amount == null ? null : numberValue(item.amount),
		comment: item.comment,
		consumptions: (item.consumptions ?? []).map(
			(consumption): PackageConsumption => ({
				id: consumption.id,
				hours: numberValue(consumption.hours),
				report: consumption.report,
			}),
		),
	}));

	return {
		id: numberValue(group.project.id),
		client: group.project.clientCompany
			? `${group.project.clientCompany} | ${group.project.title}`
			: group.project.title,
		lastCharge: dateLabel(group.lastChargeAt),
		remainingHours,
		state: group.state,
		status: statusLabel,
		statusHint,
		progress:
			purchasedHours > 0
				? Math.min(
						100,
						Math.max(
							0,
							Math.round(
								((purchasedHours - remainingHours) / purchasedHours) * 100,
							),
						),
					)
				: 0,
		purchases,
	};
};

export const fetchSupportHoursPackages = async (signal?: AbortSignal) => {
	const response = await $backendApi.get<ApiProjectGroup[]>(
		"support-hours-packages",
		{ signal },
	);
	return response.data.map(toClientPackage);
};
export const createSupportHoursPackage = async (
	payload: SupportHoursPackagePayload,
) => $backendApi.post("support-hours-packages", payload);
export const updateSupportHoursPackage = async (
	id: number,
	payload: Omit<SupportHoursPackagePayload, "projectId">,
	fingerprint?: string,
) =>
	$backendApi.patch(`support-hours-packages/${id}`, payload, {
		headers: fingerprint ? { "If-Match": fingerprint } : undefined,
	});
export const deleteSupportHoursPackage = (id: number, fingerprint?: string) =>
	$backendApi.delete(`support-hours-packages/${id}`, {
		headers: fingerprint ? { "If-Match": fingerprint } : undefined,
	});

export const fetchSupportProjects = async (signal?: AbortSignal) => {
	const response = await $backendApi.get<
		Array<{ id: number; title: string; clientCompany: string | null }>
	>("support-hours-packages/projects", { signal });
	return response.data.map(
		(project): SupportProjectOption => ({
			id: numberValue(project.id),
			title: project.clientCompany
				? `${project.clientCompany} | ${project.title}`
				: project.title,
		}),
	);
};

export const fetchSupportProjectTasks = async (
	projectId: number,
	signal?: AbortSignal,
) => {
	const response = await $backendApi.get<SupportProjectTask[]>(
		`support-hours-packages/projects/${projectId}/tasks`,
		{ signal },
	);
	return response.data.map((task) => ({ ...task, id: String(task.id) }));
};

export const syncSupportProjects = (signal?: AbortSignal) =>
	$backendApi.post("support-hours-packages/projects/sync", {}, { signal });

export const syncSupportHoursReports = (signal?: AbortSignal) =>
	$backendApi.post(
		"support-hours-packages/sync",
		{},
		{ signal, timeout: 120_000 },
	);

export type SupportPackageReportPeriod = {
	dateFrom: string;
	dateTo: string;
};

export const fetchSupportHoursPackageReport = async (
	packageId: number,
	period?: SupportPackageReportPeriod,
) => {
	const response = await $backendApi.post<Blob>(
		`support-hours-packages/${packageId}/report`,
		period ?? {},
		{
			responseType: "blob",
			headers: { Accept: "application/pdf" },
			timeout: 120_000,
		},
	);
	return response.data;
};
