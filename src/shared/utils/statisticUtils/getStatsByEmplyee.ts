import { dtoFieldsCodesUserReports } from "../../../components/calendar/constants/const";
import type { TaskProps } from "../../types/types";
import { convertNumberFormat } from "../numberUtils";

export const getStatsByEmplyee = (
	tasks: TaskProps[],
	statsParams: {
		title: string;
		key: string;
		filterFn?: (task: TaskProps) => void;
	}[],
) => {
	const res = statsParams.map((stat) => {
		return {
			title: stat.title,
			value: stat?.filterFn ? tasks.filter(stat?.filterFn) : tasks,
			estimateTime: stat?.filterFn
				? tasks.filter(stat?.filterFn).reduce((acc, task) => {
						return (
							acc +
							+convertNumberFormat(task[dtoFieldsCodesUserReports.estimateTime])
						);
					}, 0)
				: tasks.reduce((acc, task) => {
						return (
							acc +
							+convertNumberFormat(task[dtoFieldsCodesUserReports.estimateTime])
						);
					}, 0),
			timeSpent: stat?.filterFn
				? tasks.filter(stat?.filterFn).reduce((acc, task) => {
						return acc + +task[dtoFieldsCodesUserReports.timeSpent];
					}, 0)
				: tasks.reduce((acc, task) => {
						return acc + +task[dtoFieldsCodesUserReports.timeSpent];
					}, 0),
		};
	});

	return res;
};
