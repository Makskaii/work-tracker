import { useEffect, useState } from "react";
import { $api } from "../../../shared/config";
import { Endpoints, TASK_SELECT_FIELDS } from "../../../shared/constants/const";
import type { TaskProps } from "../../../shared/types/types";
import { StatucBadge } from "../../statusBadge/StatucBadge";

export const TasksList = ({
	userId,
	borders,
}: {
	borders: {
		startOfTheWeek: string;
		endOfTheWeek: string;
	};
	userId: string;
}) => {
	const [tasks, setTasks] = useState<TaskProps[]>([]);

	useEffect(() => {
		const getTasks = async () => {
			try {
				const response = await $api.get(Endpoints.reports, {
					params: {
						entityTypeId: 1072,

						select: TASK_SELECT_FIELDS,
						filter: {
							"<=createdTime": borders.endOfTheWeek,
							">=createdTime": borders.startOfTheWeek,
							assignedById: userId,
						},
					},
				});

				setTasks(response.data.result.items);
			} catch {
				console.log("Ошибка при получении списка сотрудников");
			}
		};

		getTasks();
	}, [userId, borders]);

	return (
		<div
			style={{
				padding: "1rem",
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
