export const TasksStatistics = ({
	tasks,
}: {
	tasks: {
		id: string;
		title: string;
		value: string;
		responsible?: string | undefined;
		status?: string | undefined;
		timeEstimate?: string | undefined;
		timeSpentInLogs?: string | undefined;
		groupId?: string | undefined;
	}[];
}) => {
	const tasksNoTime = tasks.filter((task) => task.timeEstimate === "0").length;
	const tasksInProgress = tasks.filter((task) => task.status === "3").length;
	const totalCompleted = tasks.filter((task) => task.status === "5").length;

	const dataArray = [
		{
			title: "Всего задач по проекту",
			value: tasks.length,
		},
		{
			title: "Выполнено",
			value: totalCompleted,
		},
		{
			title: "% завершённости",
			value: Math.round((totalCompleted / tasks.length) * 100) + "%",
		},
		{
			title: "Задач в работе",
			value: tasksInProgress,
		},
		{
			title: "Задач без оценки",
			value: tasksNoTime,
		},
	];

	return (
		<div>
			<div
				style={{
					display: "flex",
					borderBottom: "1px solid #ccc",
				}}
			>
				<h3>Задачи</h3>
			</div>
			<ul
				style={{
					paddingRight: "1rem",
				}}
			>
				{dataArray.map((item) => (
					<li
						style={{
							display: "flex",
							justifyContent: "space-between",
						}}
					>
						<div>{item.title}</div>
						<div>{item.value}</div>
					</li>
				))}
			</ul>
		</div>
	);
};
