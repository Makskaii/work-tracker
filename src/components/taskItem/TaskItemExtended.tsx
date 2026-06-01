import type { Status, TaskProps, User } from "@/shared/types/types";
import { calcTimeDifference } from "@/shared/utils/calcTimeDifference";
import { StatucBadge } from "../statusBadge/StatucBadge";

export const TaskItemExtended = ({
	task,
	estimateTime,
	timeSpent,
	paidHoursAdjustment,
	users,
	statuses,
}: {
	task: TaskProps;
	timeSpent: number;
	estimateTime: string;
	paidHoursAdjustment?: {
		value: string;
		total: string;
	};
	statuses: Status[];
	users: User[];
}) => {
	const user = users.find((user) => user.id === String(task.assignedById));

	const getStatucColor = (status: string) => {
		return statuses.find((st) => status === st.STATUS_ID)?.COLOR;
	};

	return (
		<div
			key={task.id}
			style={{
				display: "flex",
				border: "1px solid #ccc",
				padding: "5px 10px",
				borderRadius: "14px",
				flexDirection: "column",
				gap: "5px",
				borderLeft: `5px solid ${getStatucColor(task.stageId)}`,
				cursor: "pointer",
			}}
		>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: "10px",
					justifyContent: "space-between",
					borderBottom: "1px solid #ccc",
				}}
			>
				<span
					style={{
						overflow: "hidden",
						textOverflow: "ellipsis",
						whiteSpace: "nowrap",
						maxWidth: "80%",
					}}
				>
					{task.title}
				</span>

				{user ? (
					<div>
						<img
							src={user?.photo}
							width={"25px"}
							height={"25px"}
							style={{
								borderRadius: "50%",
								cursor: "pointer",
							}}
							alt={user?.title}
							title={user?.title}
						/>{" "}
					</div>
				) : null}
			</div>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
				}}
			>
				<StatucBadge status={task.stageId} statuses={statuses} />
				<span>
					{timeSpent ?? 0}/{estimateTime} ч
					{paidHoursAdjustment
						? ` (${paidHoursAdjustment.value}/${paidHoursAdjustment.total} ч)`
						: ""}
				</span>
			</div>
			<div
				style={{
					fontSize: "12px",
					display: "flex",
					justifyContent: "flex-end",
				}}
			>
				<div>Обновлено {calcTimeDifference(task.lastActivityTime)}</div>
			</div>
		</div>
	);
};
