import { TaskCodes } from "@/components/calendar/constants/const";
import type { User } from "@/shared/types/types";
import {
	formatHours,
	getPaymentKindFromTaskType,
	getTaskTitle,
	getUserName,
	toNumber,
} from "../model/profitabilityUtils";
import type { ProfitabilityTaskItem } from "../model/types";
import styles from "../SalesProfitabilityReport.module.scss";

type TasksTabProps = {
	items: ProfitabilityTaskItem[];
	users: User[];
	openTask: (id: string | number) => void;
};

export const TasksTab = ({ items, users, openTask }: TasksTabProps) => (
	<div className={styles.tableCard}>
		<div className={styles.tableTitle}>Задачи ({items.length})</div>
		<div className={styles.tasksTable}>
			<div className={styles.tasksHead}>
				<span>Задача</span>
				<span>Ответственный</span>
				<span>Проект</span>
				<span>План</span>
				<span>Факт</span>
				<span>Тип оплаты</span>
				<span>Статус</span>
			</div>
			{items.length ? (
				items.map(({ task, project }) => (
					<button
						key={task.id}
						type="button"
						className={styles.taskRow}
						onClick={() => openTask(task.id)}
					>
						<strong>{getTaskTitle(task)}</strong>
						<span>{getUserName(users, task.assignedById)}</span>
						<span>{project.title}</span>
						<span>{formatHours(toNumber(task[TaskCodes.estimateTime]))}</span>
						<span>{formatHours(toNumber(task[TaskCodes.timeSpent]))}</span>
						<span className={styles.paymentPill}>
							{getPaymentKindFromTaskType(task[TaskCodes.taskType])}
						</span>
						<span className={styles.successPill}>{task.stageId}</span>
					</button>
				))
			) : (
				<div className={styles.emptyState}>
					Задачи по проектам сделки не найдены
				</div>
			)}
		</div>
	</div>
);
