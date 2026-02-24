import { dtoFieldsCodesUserReports as UserCodes } from "../../../../components/calendar/constants/const";

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

export interface WeeklyTasks {
	week: number;
	title: string;
	tasks?: TaskProps[];
}

export type TasksWithProject = {
	tasks: TaskProps[];
	projId: string;
};

export type TGroupedTasks = Partial<Record<string | number, TaskProps[]>>;
