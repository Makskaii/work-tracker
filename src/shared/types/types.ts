/** biome-ignore-all lint/suspicious/noExplicitAny: <Для объектов с разными полями> */
import type { Dispatch, SetStateAction } from "react";
import type { ProjectFromList } from "@/pages/ReportsPage/ReportsPage";
import type { ActivityListItem } from "@/pages/ReportsPage/types/types";
import type { ProjectCodes } from "../../components/calendar/constants/const";
import { TaskCodes } from "../../components/calendar/constants/const";
import type { ClientsCodes } from "../constants/const";
export type AnyObject = {
	[key: string]: any;
};

export type ClientListItems = {
	ID: string;
	NAME: string;
	id?: string;
	title?: string;
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
	[ProjectCodes.company]?: string | number | null;
	projectId: string;
}

export const ClientTaskStatuses = {
	done: "Done",
	inWork: "In work",
	backlog: "Backlog",
	newProposal: "New proposal",
	approval: "Approval",
} as const;

export type ClientTaskStatus =
	(typeof ClientTaskStatuses)[keyof typeof ClientTaskStatuses];

export type ClientTaskStatusFilter = keyof typeof ClientTaskStatuses;

export interface ClientTaskProps {
	id: string;
	title: string;
	status: ClientTaskStatus;
	createdTime?: string;
	lastActivityTime?: string;
	movedTime?: string;
	stageId?: string;
	[TaskCodes.hours]?: string | number | null;
	[TaskCodes.client]?: string | number | null;
	[TaskCodes.parentproject]?: string | number | null;
	[TaskCodes.description]?: string | null;
	[TaskCodes.comment]?: string | null;
	[TaskCodes.deadline]?: string | null;
	[TaskCodes.linkedTasks]?: number[];
}

export interface TaskProps {
	id: string;
	title: string;
	status?: ClientTaskStatus;
	createdBy: string;
	assignedById: number;
	createdTime: string;
	lastActivityTime: string;
	stageId: string;
	movedTime: string;
	[TaskCodes.client]: number;
	[TaskCodes.estimateTime]: string;
	[TaskCodes.description]: string;
	[TaskCodes.stage]: string;
	[TaskCodes.timeSpent]: string;
	[TaskCodes.sprintDateStart]: string;
	[TaskCodes.project]: string;
	[TaskCodes.linkedTasks]?: number[];
	[TaskCodes.hours]: number;
	[TaskCodes.deadline]: string;
	[TaskCodes.comment]: string;
	[TaskCodes.parentproject]: string;
	[TaskCodes.company]?: string | number | null;
	[TaskCodes.taskType]?: string | number | null;
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
