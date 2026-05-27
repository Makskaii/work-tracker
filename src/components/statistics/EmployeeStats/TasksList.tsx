import { ReportCodes, TaskCodes } from "@/components/calendar/constants/const";
import type { ReportProps } from "@/components/calendar/types/types";
import { TaskItem } from "@/components/taskItem/TaskItemSimple";
import type { Status, TaskProps } from "../../../shared/types/types";
import cls from "./StatsModal.module.scss";

const getNumberValue = (value: unknown) => {
	if (typeof value === "number") {
		return Number.isFinite(value) ? value : 0;
	}

	if (typeof value === "string") {
		const normalizedValue = value.trim().replace(",", ".");

		if (!normalizedValue) {
			return 0;
		}

		const numberValue = Number(normalizedValue);

		return Number.isFinite(numberValue) ? numberValue : 0;
	}

	return 0;
};

const getPaymentTypeValue = (report: ReportProps) => {
	return String(
		report[ReportCodes.taskType] ??
			report[ReportCodes.activityType] ??
			report[ReportCodes.title] ??
			report.title ??
			"",
	).toLowerCase();
};

const formatSplitHours = (value: number) => {
	return Number.isInteger(value) ? String(value) : value.toFixed(1);
};

export const TasksList = ({
	tasks,
	reports,
	statuses,
	activeTaskId,
	onTaskSelect,
}: {
	tasks: TaskProps[];
	reports: {
		[key: string]: ReportProps[];
	};
	statuses: Status[];
	activeTaskId: string;
	onTaskSelect: (taskId: string) => void;
}) => {
	if (!tasks.length) {
		return <div className={cls.tasksEmptyState}>Нет задач для отображения</div>;
	}

	return (
		<div className={cls.tasksList}>
			{tasks.map((task) => {
				const taskId = String(task.id);
				const taskReports = reports?.[taskId] ?? [];

				const timespent = taskReports.reduce((acc, report) => {
					return acc + getNumberValue(report[ReportCodes.timeSpent]);
				}, 0);

				const paySplit = taskReports.reduce(
					(acc, report) => {
						const hours = getNumberValue(report[ReportCodes.timeSpent]);
						const paymentType = getPaymentTypeValue(report);

						if (paymentType.includes("client")) {
							acc.client += hours;
							return acc;
						}

						if (paymentType.includes("company")) {
							acc.company += hours;
							return acc;
						}

						if (paymentType.includes("unpaid")) {
							acc.unpaid += hours;
							return acc;
						}

						if (
							paymentType.includes("not") ||
							paymentType.includes("work") ||
							paymentType.includes("404")
						) {
							acc.notWork += hours;
							return acc;
						}

						acc.client += hours;
						return acc;
					},
					{
						client: 0,
						company: 0,
						unpaid: 0,
						notWork: 0,
					},
				);

				const hasPaySplit =
					paySplit.client > 0 ||
					paySplit.company > 0 ||
					paySplit.unpaid > 0 ||
					paySplit.notWork > 0;
				const isActive = taskId === activeTaskId;

				return (
					<button
						key={taskId}
						type="button"
						className={`${cls.taskButton} ${
							isActive ? cls.taskButtonActive : ""
						}`}
						onClick={() => onTaskSelect(taskId)}
					>
						<TaskItem
							task={task}
							estimateTime={task[TaskCodes.estimateTime]}
							timeSpent={timespent}
							statuses={statuses}
						/>

						{hasPaySplit && (
							<div className={cls.taskPaySplit}>
								{paySplit.client > 0 && (
									<span className={`${cls.payChip} ${cls.payChipClient}`}>
										client paid {formatSplitHours(paySplit.client)} ч
									</span>
								)}

								{paySplit.company > 0 && (
									<span className={`${cls.payChip} ${cls.payChipCompany}`}>
										company paid {formatSplitHours(paySplit.company)} ч
									</span>
								)}

								{paySplit.unpaid > 0 && (
									<span className={`${cls.payChip} ${cls.payChipUnpaid}`}>
										unpaid {formatSplitHours(paySplit.unpaid)} ч
									</span>
								)}

								{paySplit.notWork > 0 && (
									<span className={`${cls.payChip} ${cls.payChipNotWork}`}>
										not at work {formatSplitHours(paySplit.notWork)} ч
									</span>
								)}
							</div>
						)}
					</button>
				);
			})}
		</div>
	);
};
