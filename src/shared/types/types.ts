/** biome-ignore-all lint/suspicious/noExplicitAny: <Для объектов с разными полями> */
import type { Dispatch, SetStateAction } from "react";
import type { ProjectFromList } from "@/pages/ReportsPage/ReportsPage";
import type { ActivityListItem } from "@/pages/ReportsPage/types/types";
import { TaskCodes as UserCodes } from "../../components/calendar/constants/const";
import type { ClientsCodes } from "../constants/const";
export type AnyObject = {
	[key: string]: any;
};

export type ClientListItems = {
	ID: string;
	NAME: string;
};

export type ProjectListDto = {
	ID: string;
	NAME: string;
	PROPERTY_87: {
		[key: string]: string;
	};
};

export interface ClientProjectProps {
	id: number;
	createdBy: number;
	updatedBy: number;
	title: string;
	movedBy: number;
	createdTime: string;
	updatedTime: string;
	movedTime: string;
	categoryId: number;
	assignedById: number;
	lastActivityBy: number;
	lastActivityTime: string;
	[ClientsCodes.title]: string;
	[ClientsCodes.client]: number;
	projectId: string;
}

export interface TaskProps {
	id: string;
	title: string;
	createdBy: string;
	assignedById: number;
	createdTime: string;
	lastActivityTime: string;
	stageId: string;
	movedTime: string;
	[UserCodes.client]: number;
	[UserCodes.estimateTime]: string;
	[UserCodes.description]: string;
	[UserCodes.stage]: string;
	[UserCodes.timeSpent]: string;
	[UserCodes.project]: string;
	[UserCodes.linkedTasks]?: number[];
	[UserCodes.hours]: number;
}

export interface User {
	id: string;
	value: string;
	title: string;
	position: string;
	photo: string;
	department: number;
}

export type ClientsWithPropjects = ClientListItems & {
	projects: ClientProjectProps[];
};

export type UserReports = {
	setUser: (id: string) => void;
	tasks: TaskProps[];
	clientsList: ClientsWithPropjects[];
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
	statuses: Status[];
	activities: ActivityListItem[];
	projects: ProjectFromList[];
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
