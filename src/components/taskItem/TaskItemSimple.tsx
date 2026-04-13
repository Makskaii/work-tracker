import type { Status, TaskProps } from "@/shared/types/types";
import { calcTimeDifference } from "@/shared/utils/calcTimeDifference";
import { StatucBadge } from "../statusBadge/StatucBadge";

export const TaskItem = ({
	task,
	estimateTime,
	timeSpent,
	statuses,
	withTime = true,
}: {
	task: TaskProps;
	timeSpent: number;
	estimateTime: string;
	statuses: Status[];
	withTime?: boolean;
}) => {
	return (
		<div
			key={task.id}
			style={{
				display: "flex",
				border: "1px solid #ccc",
				padding: "10px",
				borderRadius: "12px",
				justifyContent: "space-between",
			}}
		>
			<div
				style={{
					display: "flex",
					maxWidth: "60%",
					flexDirection: "column",
					justifyContent: "space-between",
					textAlign: "left",
				}}
			>
				<span
					style={{
						overflow: "hidden",
						textOverflow: "ellipsis",
						whiteSpace: "nowrap",
						minWidth: "80%",
					}}
				>
					{task.title}
				</span>
				<div
					style={{
						fontSize: "12px",
					}}
				>
					Обновлено {calcTimeDifference(task.lastActivityTime)}
				</div>
			</div>
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					textAlign: "right",
				}}
			>
				<StatucBadge statuses={statuses} status={task.stageId} />
				{withTime && (
					<span>
						{timeSpent ?? 0}/{estimateTime} ч
					</span>
				)}
			</div>
		</div>
	);
};
