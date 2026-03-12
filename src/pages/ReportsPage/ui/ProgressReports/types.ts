import type { TaskProps } from "@/shared/types/types";

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
