import { $api } from "@/shared/config";
import { Endpoints } from "@/shared/constants/const";
import { type Deal, DealCodes } from "../types/deals.types";
import { SalesCodes } from "../types/types";

type CrmDeal = {
	ID: string;
	TITLE: string;
	CATEGORY_ID?: string | number | null;
	STAGE_ID: string;
	OPPORTUNITY: string;
	ASSIGNED_BY_ID: string | number;
	COMPANY_ID?: string | number | null;
	DATE_CREATE?: string;
	MOVED_TIME?: string;
	[DealCodes.parentProject]?: string | number | Array<string | number> | null;
	[DealCodes.purchasedHours]?: string | number | null;
	[DealCodes.ganttTzStart]?: string | null;
	[DealCodes.ganttTzWeeks]?: string | number | null;
	[DealCodes.ganttTzPlanEnd]?: string | null;
	[DealCodes.ganttTzFactEnd]?: string | null;
	[DealCodes.ganttTzSignDate]?: string | null;
	[DealCodes.ganttDevWeeks]?: string | number | null;
	[DealCodes.ganttDevPlanStart]?: string | null;
	[DealCodes.ganttDevPlanEnd]?: string | null;
	[DealCodes.ganttDevFactStart]?: string | null;
	[DealCodes.ganttDevFactEnd]?: string | null;
	[DealCodes.ganttEducationWeeks]?: string | number | null;
	[DealCodes.ganttEducationPlanStart]?: string | null;
	[DealCodes.ganttEducationPlanEnd]?: string | null;
	[DealCodes.ganttEducationFactStart]?: string | null;
	[DealCodes.ganttEducationFactEnd]?: string | null;
	[DealCodes.ganttCloseDate]?: string | null;
};

type CrmDealListResponse = {
	result?: CrmDeal[];
	next?: number | null;
};

const DEAL_SELECT_FIELDS = [
	"ID",
	"TITLE",
	"CATEGORY_ID",
	"STAGE_ID",
	"OPPORTUNITY",
	"ASSIGNED_BY_ID",
	"COMPANY_ID",
	"DATE_CREATE",
	"MOVED_TIME",
	DealCodes.parentProject,
	DealCodes.purchasedHours,
	DealCodes.ganttTzStart,
	DealCodes.ganttTzWeeks,
	DealCodes.ganttTzPlanEnd,
	DealCodes.ganttTzFactEnd,
	DealCodes.ganttTzSignDate,
	DealCodes.ganttDevWeeks,
	DealCodes.ganttDevPlanStart,
	DealCodes.ganttDevPlanEnd,
	DealCodes.ganttDevFactStart,
	DealCodes.ganttDevFactEnd,
	DealCodes.ganttEducationWeeks,
	DealCodes.ganttEducationPlanStart,
	DealCodes.ganttEducationPlanEnd,
	DealCodes.ganttEducationFactStart,
	DealCodes.ganttEducationFactEnd,
	DealCodes.ganttCloseDate,
] as const;

const mapCrmDeal = (deal: CrmDeal): Deal => ({
	id: String(deal.ID),
	title: deal.TITLE,
	categoryId: deal.CATEGORY_ID,
	stageId: deal.STAGE_ID,
	opportunity: deal.OPPORTUNITY,
	assignedById: Number(deal.ASSIGNED_BY_ID),
	companyId: deal.COMPANY_ID,
	createdTime: deal.DATE_CREATE ?? "",
	movedTime: deal.MOVED_TIME ?? "",
	createdBy: "",
	isNew: "",
	[SalesCodes.kpSuccess]: 0,
	[SalesCodes.ppoSuccess]: 0,
	[SalesCodes.analytic]: 0,
	[SalesCodes.estimateCost]: "",
	[SalesCodes.totalCost]: "",
	[SalesCodes.costFile]: [],
	[SalesCodes.kpday]: "",
	[SalesCodes.ppoDay]: "",
	[DealCodes.parentProject]: deal[DealCodes.parentProject],
	[DealCodes.purchasedHours]: deal[DealCodes.purchasedHours],
	[DealCodes.ganttTzStart]: deal[DealCodes.ganttTzStart],
	[DealCodes.ganttTzWeeks]: deal[DealCodes.ganttTzWeeks],
	[DealCodes.ganttTzPlanEnd]: deal[DealCodes.ganttTzPlanEnd],
	[DealCodes.ganttTzFactEnd]: deal[DealCodes.ganttTzFactEnd],
	[DealCodes.ganttTzSignDate]: deal[DealCodes.ganttTzSignDate],
	[DealCodes.ganttDevWeeks]: deal[DealCodes.ganttDevWeeks],
	[DealCodes.ganttDevPlanStart]: deal[DealCodes.ganttDevPlanStart],
	[DealCodes.ganttDevPlanEnd]: deal[DealCodes.ganttDevPlanEnd],
	[DealCodes.ganttDevFactStart]: deal[DealCodes.ganttDevFactStart],
	[DealCodes.ganttDevFactEnd]: deal[DealCodes.ganttDevFactEnd],
	[DealCodes.ganttEducationWeeks]: deal[DealCodes.ganttEducationWeeks],
	[DealCodes.ganttEducationPlanStart]: deal[DealCodes.ganttEducationPlanStart],
	[DealCodes.ganttEducationPlanEnd]: deal[DealCodes.ganttEducationPlanEnd],
	[DealCodes.ganttEducationFactStart]: deal[DealCodes.ganttEducationFactStart],
	[DealCodes.ganttEducationFactEnd]: deal[DealCodes.ganttEducationFactEnd],
	[DealCodes.ganttCloseDate]: deal[DealCodes.ganttCloseDate],
});

export const getCrmDeals = async (
	filter: Record<string, string | number | boolean | undefined>,
	signal?: AbortSignal,
): Promise<Deal[]> => {
	const items: CrmDeal[] = [];
	let start: number | null = 0;

	while (start !== null) {
		const response: { data: CrmDealListResponse } = await $api.post(
			Endpoints.crmDeals,
			{
				select: DEAL_SELECT_FIELDS,
				filter,
				order: {
					ID: "DESC",
				},
				start,
			},
			{
				signal,
			},
		);

		items.push(...(response.data.result ?? []));
		start = response.data.next ?? null;
	}

	return items.map(mapCrmDeal);
};

export const getProfitabilityDeals = async (
	signal?: AbortSignal,
	categoryId = 0,
) => {
	const deals = await getCrmDeals(
		{
			CATEGORY_ID: categoryId,
			[`>${DealCodes.parentProject}`]: 0,
		},
		signal,
	);
	const dealsById = new Map<string, Deal>();

	for (const deal of deals) {
		dealsById.set(String(deal.id), deal);
	}

	return Array.from(dealsById.values());
};
