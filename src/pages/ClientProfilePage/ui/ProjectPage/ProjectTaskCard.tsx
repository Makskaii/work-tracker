import { TASK_STAGE_IDS } from "@/pages/ReportsPage/constants/statuses";
import type { Status, TaskProps, User } from "@/shared/types/types";
import { calcTimeDifference } from "@/shared/utils/calcTimeDifference";
import { classNames } from "@/shared/utils/utils";
import styles from "./ProjectTaskCard.module.scss";

type Props = {
	task: TaskProps;
	timeSpent: number;
	estimateTime: string;
	statuses: Status[];
	users: User[];
	onClick?: () => void;
};

type TaskStatus = "In work" | "Done" | "Sprint" | "Backlog";

export const ProjectTaskCard = ({ task, statuses, users, onClick }: Props) => {
	const user = users.find((item) => item.id === String(task.assignedById));

	const getStatusColor = (status: string) => {
		return statuses.find((st) => status === st.STATUS_ID)?.COLOR || "#cbd5e1";
	};

	const getTaskStatus = (task: TaskProps): TaskStatus => {
		console.log({ task });
		if (task.stageId === TASK_STAGE_IDS.DONE) {
			return "Done";
		}

		const isInWOrk =
			task.stageId === TASK_STAGE_IDS.IN_WORK ||
			task.stageId === TASK_STAGE_IDS.TESTING ||
			task.stageId === TASK_STAGE_IDS.WAITING ||
			task.stageId === TASK_STAGE_IDS.DOCS;

		if (isInWOrk) {
			return "In work";
		}

		if (task.stageId === TASK_STAGE_IDS.BACKLOG) {
			return "Backlog";
		}

		return "Sprint";
	};

	return (
		<div
			className={styles.card}
			onClick={onClick}
			style={{
				borderLeftColor: getStatusColor(task.stageId),
			}}
		>
			<div className={styles.topRow}>
				<div className={styles.titleBlock}>
					<div className={styles.title}>{task.title}</div>
				</div>
			</div>

			<div className={styles.middleRow}>
				<span
					className={classNames(styles.activityBadge, {
						[styles.inWork]: getTaskStatus(task) === "In work",
						[styles.done]: getTaskStatus(task) === "Done",
						[styles.backlog]: getTaskStatus(task) === "Backlog",
						[styles.sprint]: getTaskStatus(task) === "Sprint",
					})}
				>
					{getTaskStatus(task)}
				</span>
			</div>

			<div className={styles.bottomRow}>
				<div className={styles.updatedText}>
					Обновлено {calcTimeDifference(task.lastActivityTime)}
				</div>

				{user ? (
					<div className={styles.assigneeName}>{user.title}</div>
				) : (
					<div className={styles.assigneeName}>Не назначено</div>
				)}
			</div>
		</div>
	);
};
