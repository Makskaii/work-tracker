/** biome-ignore-all lint/suspicious/noExplicitAny: <Для объектов с разными полями> */
import type { Dispatch, SetStateAction } from "react";
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
	department: number;
}

export type UserReports = {
	setUser: (id: string) => void;
	tasks: TaskProps[];
	projects: { ID: string; NAME: string }[];
	setCurrProject: (id: string) => void;
	setTitle: (id: string) => void;
	title: string;
	user: string;
	users: User[];
	userIds: string[];
	currProject?: string;
	setMonth: Dispatch<SetStateAction<number>>;
	setYear: Dispatch<SetStateAction<number>>;
	month?: number;
	year?: number;
	statuses: {
		ID: string;
		ENTITY_ID: string;
		STATUS_ID: string;
		NAME: string;
		NAME_INIT: string;
		SORT: string;
		SYSTEM: string;
		COLOR: string;
		SEMANTICS: string;
		CATEGORY_ID: string;
	}[];
};

export interface Status {
	ID: string;
	ENTITY_ID: string;
	STATUS_ID: string;
	NAME: string;
	NAME_INIT: string;
	SORT: string;
	SYSTEM: string;
	COLOR: string;
	SEMANTICS: string;
	CATEGORY_ID: string;
}

export type ReportsContext = UserReports;
