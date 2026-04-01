import { StatucBadge } from "@/components/statusBadge/StatucBadge";
import type { Status, TaskProps, User } from "@/shared/types/types";
import { calcTimeDifference } from "@/shared/utils/calcTimeDifference";
import styles from "./ProjectTaskCard.module.scss";

type Props = {
	task: TaskProps;
	timeSpent: number;
	estimateTime: string;
	statuses: Status[];
	users: User[];
	onClick?: () => void;
};

export const ProjectTaskCard = ({
	task,
	timeSpent,
	estimateTime,
	statuses,
	users,
	onClick,
}: Props) => {
	const user = users.find((item) => item.id === String(task.assignedById));

	const getStatusColor = (status: string) => {
		return statuses.find((st) => status === st.STATUS_ID)?.COLOR || "#cbd5e1";
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
					<div className={styles.taskId}>#{task.id}</div>
					<div className={styles.title}>{task.title}</div>
				</div>

				{user ? (
					<div className={styles.assignee}>
						<img
							src={user.photo}
							alt={user.title}
							title={user.title}
							className={styles.avatar}
						/>
					</div>
				) : (
					<div className={styles.emptyAvatar}>—</div>
				)}
			</div>

			<div className={styles.middleRow}>
				<StatucBadge status={task.stageId} statuses={statuses} />
				<div className={styles.metaPill}>
					Списано: {timeSpent ?? 0}/{estimateTime} ч
				</div>
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
