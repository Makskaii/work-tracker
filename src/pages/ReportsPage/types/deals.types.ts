import type { SalesCodes } from "./types";

export const DealCodes = {
	parentProject: "PARENT_ID_1092",
	purchasedHours: "UF_CRM_1779792196",
} as const;

export interface Deal {
	id: string;
	createdTime: string;
	opportunity: string;
	stageId: string;
	categoryId?: string | number | null;
	isNew: string;
	title: string;
	createdBy: string;
	movedTime: string;
	[SalesCodes.kpSuccess]: number;
	[SalesCodes.ppoSuccess]: number;
	[SalesCodes.analytic]: number;
	[SalesCodes.estimateCost]: string;
	[SalesCodes.totalCost]: string;
	[SalesCodes.costFile]: string[];
	[SalesCodes.kpday]: string;
	[SalesCodes.ppoDay]: string;
	[DealCodes.parentProject]?: string | number | Array<string | number> | null;
	[DealCodes.purchasedHours]?: string | number | null;
	assignedById: number;
	companyId?: string | number | null;
	companyTitle?: string | null;
}
