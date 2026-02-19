/** biome-ignore-all lint/suspicious/noExplicitAny: <Для объектов с разными полями> */
import { dtoFieldsCodesUserReports as UserCodes } from "../../components/calendar/constants/const";
export type AnyObject = {
	[key: string]: any;
};

export interface TaskProps {
	id: string;
	title: string;
	createdBy: string;
	assignedById: number;
	createdTime: string;
	lastActivityTime: string;
	stageId: string;
	[UserCodes.project]: number;
	[UserCodes.estimateTime]: string;
	[UserCodes.description]: string;
	[UserCodes.stage]: string;
	[UserCodes.timeSpent]: string;
}

export interface User {
	id: string;
	value: string;
	title: string;
	position: string;
	photo: string;
}
