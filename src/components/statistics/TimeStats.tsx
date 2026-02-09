export const TimeStats = ({
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
	const hrsPolanned =
		tasks?.reduce((acc, task) => acc + Number(task.timeEstimate), 0) / 3600;
	const inProgress =
		tasks
			.filter((task) => task.status === "3")
			.reduce((acc, task) => acc + Number(task.timeEstimate), 0) / 3600;

	const hrsDone = Math.ceil(
		tasks.reduce((acc, task) => acc + Number(task.timeSpentInLogs), 0) / 3600,
	);

	const hrsInWork = Math.ceil(
		tasks
			.filter((task) => task.status === "3")
			.reduce((acc, task) => acc + Number(task.timeSpentInLogs), 0) / 3600,
	);

	const dataArray = [
		{
			title: "План",
			value: hrsPolanned,
		},
		{
			title: "В работе",
			value: inProgress,
		},
		{
			title: "Факт",
			value: hrsDone,
		},
		{
			title: "В работе",
			value: hrsInWork,
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
				<h3>Часы</h3>
			</div>
			<ul>
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
