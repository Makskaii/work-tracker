import dayjs from "dayjs";
import { $api } from "@/shared/config";
import { Endpoints } from "@/shared/constants/const";
import type { User } from "@/shared/types/types";
import type { Deal } from "../types/deals.types";
import { SalesCodes } from "../types/types";

export type SalesCall = { id: string; assignedById: string };
export type SalesReportSource = {
	calls: SalesCall[];
	created: Deal[];
	ppo: Deal[];
	kp: Deal[];
	active: Deal[];
	won: Deal[];
	users: User[];
};

const ACTIVE_STAGES = [
	"NEW",
	"PREPARATION",
	"PREPAYMENT_INVOICE",
	"EXECUTING",
	"FINAL_INVOICE",
	"UC_HDHLH5",
	"UC_ZLNOOX",
	"UC_EEZLOG",
];
const DEAL_SELECT = [
	"id",
	"title",
	"createdTime",
	"assignedById",
	"opportunity",
	"stageId",
	"movedTime",
	SalesCodes.ppoDay,
	SalesCodes.kpday,
	SalesCodes.ppoSuccess,
	SalesCodes.kpSuccess,
];

type RestPage<T> = {
	result?: T[] | { items?: T[] };
	next?: number | null;
	error?: string;
	error_description?: string;
};

// Each endpoint uses its returned cursor, including responses without `total`.
const readAllPages = async <
	T extends { id?: string | number; ID?: string | number },
>(
	endpoint: string,
	params: Record<string, unknown>,
	signal?: AbortSignal,
): Promise<T[]> => {
	let start = 0;
	const items = new Map<string, T>();
	while (true) {
		signal?.throwIfAborted();
		const { data } = await $api.get<RestPage<T>>(endpoint, {
			params: { ...params, start },
			signal,
		});
		signal?.throwIfAborted();
		const page = Array.isArray(data?.result)
			? data.result
			: data?.result?.items;
		if (data?.error || !Array.isArray(page)) {
			throw new Error(
				data?.error_description ||
					"Не удалось получить данные отчёта из Битрикс24",
			);
		}
		for (const item of page) {
			const id = item?.id ?? item?.ID;
			if (id === undefined || id === null || String(id) === "") {
				throw new Error("Битрикс24 вернул неполные данные отчёта");
			}
			items.set(String(id), item);
		}
		if (data.next === undefined || data.next === null) break;
		if (!Number.isSafeInteger(data.next) || data.next <= start) {
			throw new Error("Не удалось загрузить все страницы отчёта из Битрикс24");
		}
		start = data.next;
	}
	return [...items.values()];
};

export const getSalesPeriodBounds = (start: string, end: string) => {
	const nextDay = dayjs(end).add(1, "day").format("YYYY-MM-DD");
	return {
		start: `${start}T00:00:00+03:00`,
		endExclusive: `${nextDay}T00:00:00+03:00`,
		nextDay,
	};
};

export const getSalesReportData = async ({
	start,
	end,
	signal,
}: {
	start: string;
	end: string;
	signal?: AbortSignal;
}): Promise<SalesReportSource> => {
	const bounds = getSalesPeriodBounds(start, end);
	const deals = (filter: Record<string, unknown>) =>
		readAllPages<Deal>(
			Endpoints.crmItems,
			{
				entityTypeId: 2,
				select: DEAL_SELECT,
				order: { id: "ASC" },
				filter: { categoryId: 0, ...filter },
			},
			signal,
		);
	type PortalUser = {
		ID: string;
		NAME: string;
		LAST_NAME: string;
		PERSONAL_PHOTO: string;
		WORK_POSITION: string;
		UF_DEPARTMENT: number[];
	};
	const [calls, created, ppo, kp, active, won, users] = await Promise.all([
		readAllPages<{ ID: string; PORTAL_USER_ID: string }>(
			Endpoints.calls,
			{
				filter: {
					">=CALL_START_DATE": bounds.start,
					"<CALL_START_DATE": bounds.endExclusive,
					"!PORTAL_USER_ID": 11,
				},
				select: ["ID", "PORTAL_USER_ID"],
				sort: "ID",
				order: "ASC",
			},
			signal,
		),
		deals({
			">=createdTime": bounds.start,
			"<createdTime": bounds.endExclusive,
		}),
		deals({
			[`>=${SalesCodes.ppoDay}`]: start,
			[`<${SalesCodes.ppoDay}`]: bounds.nextDay,
			[SalesCodes.ppoSuccess]: 390,
		}),
		deals({
			[`>=${SalesCodes.kpday}`]: start,
			[`<${SalesCodes.kpday}`]: bounds.nextDay,
			[SalesCodes.kpSuccess]: 388,
		}),
		deals({ "@stageId": ACTIVE_STAGES }),
		deals({
			stageId: "WON",
			">=movedTime": bounds.start,
			"<movedTime": bounds.endExclusive,
		}),
		readAllPages<PortalUser>(
			Endpoints.users,
			{
				select: [
					"ID",
					"NAME",
					"LAST_NAME",
					"UF_DEPARTMENT",
					"WORK_POSITION",
					"PERSONAL_PHOTO",
				],
				order: { ID: "ASC" },
			},
			signal,
		),
	]);
	return {
		calls: calls.map((call) => ({
			id: String(call.ID),
			assignedById: String(call.PORTAL_USER_ID),
		})),
		created,
		ppo,
		kp,
		active,
		won,
		users: users.map((user) => {
			const title =
				[user.NAME, user.LAST_NAME].filter(Boolean).join(" ") ||
				`Сотрудник #${user.ID}`;
			return {
				id: String(user.ID),
				value: title,
				title,
				photo: user.PERSONAL_PHOTO,
				position: user.WORK_POSITION,
				department: Number(user.UF_DEPARTMENT?.[0] ?? 0),
			};
		}),
	};
};
