import { TaskCodes as UserCodes } from "../../../components/calendar/constants/const";
import type { AnyObject, TaskProps } from "../../../shared/types/types";

export const groupTasksByWeek = (res: AnyObject[]) => {
	const result = res.map((item, i) => {
		if (item.data.result.items.length === 0)
			return {
				week: i + 1,
				title: "Нет задач",
			};

		return {
			week: i + 1,
			title: `${item.data.result.items.length} задач`,
			tasks: item.data.result.items,
		};
	});

	return result;
};

const getTaskProjectId = (task: TaskProps) => {
	const projectId = task[UserCodes.parentproject] ?? task[UserCodes.project];

	return projectId === null || projectId === undefined
		? "unknown"
		: String(projectId).trim() || "unknown";
};

export const groupTasksByProject = (tasks: TaskProps[]) => {
	return Object.groupBy(tasks, getTaskProjectId);
};
