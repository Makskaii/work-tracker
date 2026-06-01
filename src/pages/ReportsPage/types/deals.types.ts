import type { SalesCodes } from "./types";

export const DealCodes = {
	parentProject: "PARENT_ID_1092",
	purchasedHours: "UF_CRM_1779792196",
	ganttTzStart: "UF_CRM_1780238222047",
	ganttTzWeeks: "UF_CRM_1780238273554",
	ganttTzPlanEnd: "UF_CRM_1780238289279",
	ganttTzFactEnd: "UF_CRM_1780238301776",
	ganttTzSignDate: "UF_CRM_1780238310960",
	ganttDevWeeks: "UF_CRM_1780238352126",
	ganttDevPlanStart: "UF_CRM_1780238366221",
	ganttDevPlanEnd: "UF_CRM_1780238375511",
	ganttDevFactStart: "UF_CRM_1780238389232",
	ganttDevFactEnd: "UF_CRM_1780238396015",
	ganttEducationWeeks: "UF_CRM_1780238431177",
	ganttEducationPlanStart: "UF_CRM_1780238442297",
	ganttEducationPlanEnd: "UF_CRM_1780238457838",
	ganttEducationFactStart: "UF_CRM_1780238469090",
	ganttEducationFactEnd: "UF_CRM_1780238479985",
	ganttCloseDate: "UF_CRM_1780238489044",
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
	assignedById: number;
	companyId?: string | number | null;
}
