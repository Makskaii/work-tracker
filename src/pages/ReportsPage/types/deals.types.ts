import type { SalesCodes } from "./types";

export interface Deal {
	id: string;
	createdTime: string;
	opportunity: string;
	stageId: string;
	isNew: string;
	title: string;
	createdBy: string;
	movedTime: string;
	[SalesCodes.kpSuccess]: number;
	[SalesCodes.ppoSuccess]: number;
	[SalesCodes.analytic]: number;
	[SalesCodes.estimateCost]: number;
	[SalesCodes.totalCost]: number;
	[SalesCodes.costFile]: string[];
}
