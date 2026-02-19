import type { TaskProps } from "../../../shared/types/types";
import { StatucBadge } from "../../statusBadge/StatucBadge";

export const TasksList = ({ tasks }: { tasks: TaskProps[] }) => {
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "10px",
			}}
		>
			{tasks.map((task) => (
				<div
					key={task.id}
					style={{
						display: "flex",
						gap: "1rem",
						border: "1px solid #ccc",
						padding: "10px",
						borderRadius: "12px",
					}}
				>
					<StatucBadge status={task.stageId} />

					<span
						style={{
							overflow: "hidden",
							textOverflow: "ellipsis",
							whiteSpace: "nowrap",
							maxWidth: "80%",
							alignSelf: "start",
						}}
					>
						{task.title}
					</span>
				</div>
			))}
		</div>
	);
};
