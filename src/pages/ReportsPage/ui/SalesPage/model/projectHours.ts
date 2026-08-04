import { TaskCodes } from "@/components/calendar/constants/const";
import { TaskStageIds } from "@/shared/constants/const";
import type { TaskProps } from "@/shared/types/types";
import {
	getProjectFactHours,
	getProjectPlanHours,
	toNumber,
} from "./profitabilityUtils";
import type { ProfitabilityProject } from "./types";

export type ProjectAutomaticHours = {
	developmentFactHours: number;
	developmentPlanHours: number;
	taskProgress: number;
};

const getTaskStageId = (task: TaskProps) =>
	String(task[TaskCodes.stage] ?? task.stageId ?? "")
		.trim()
		.toUpperCase();

const getTaskProgress = (projects: ProfitabilityProject[]) => {
	const tasks = projects.flatMap((project) => project.tasks);
	const weightedTasks = tasks.filter((task) => {
		const stageId = getTaskStageId(task);
		const estimateHours = toNumber(task[TaskCodes.estimateTime]);

		return stageId !== TaskStageIds.cancelled && estimateHours > 0;
	});
	const totalEstimateHours = weightedTasks.reduce(
		(total, task) => total + toNumber(task[TaskCodes.estimateTime]),
		0,
	);

	if (totalEstimateHours <= 0) {
		return 0;
	}

	const completedEstimateHours = weightedTasks.reduce(
		(total, task) =>
			getTaskStageId(task) === TaskStageIds.done
				? total + toNumber(task[TaskCodes.estimateTime])
				: total,
		0,
	);

	return Math.min(100, Math.max(0, (completedEstimateHours / totalEstimateHours) * 100));
};

export const getProjectAutomaticHours = (
	projects: ProfitabilityProject[],
): ProjectAutomaticHours => {
	const hours = projects.reduce<Omit<ProjectAutomaticHours, "taskProgress">>(
		(total, project) => ({
			developmentFactHours:
				total.developmentFactHours + getProjectFactHours(project.reports),
			developmentPlanHours:
				total.developmentPlanHours + getProjectPlanHours(project.tasks),
		}),
		{
			developmentFactHours: 0,
			developmentPlanHours: 0,
		},
	);

	return {
		...hours,
		taskProgress: getTaskProgress(projects),
	};
};
