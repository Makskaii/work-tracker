import { dtoFieldsCodesUserReports as UserCodes } from "../../components/calendar/constants/const";

export interface KanbanTask {
	assignedById: number;
	createdTime: string;
	id: number;
	lastActivityTime: string;
	stageId: string;
	title: string;
	[UserCodes.description]: string;
	[UserCodes.estimateTime]: string;
	[UserCodes.project]: number;
	[UserCodes.stage]: string;
}

export interface WeeklyTasks {
	week: number;
	title: string;
	tasks?: KanbanTask[];
}

export type TasksWithProject = {
	tasks: KanbanTask[];
	projId: string;
};

export type TGroupedTasks = Partial<Record<string | number, KanbanTask[]>>;
