import { convertToDate } from "../../shared/utils";

export const DateStats = ({
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
		deadline?: string;
		endDate?: string;
	}[];
}) => {
	const latestDeadline = tasks.toSorted(
		(a, b) =>
			new Date(b.deadline ?? "").getTime() -
			new Date(a.deadline ?? "").getTime(),
	)[0]?.deadline;

	const latestEndDate = tasks.toSorted(
		(a, b) =>
			new Date(b.endDate ?? "").getTime() - new Date(a.endDate ?? "").getTime(),
	)[0]?.endDate;

	const dataArray = [
		{
			title: "Дата завершения самой последней задачи",
			value: !convertToDate(latestDeadline ?? latestEndDate)
				? "Дедлайны не установлены"
				: convertToDate(latestDeadline ?? latestEndDate),
		},
	];

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
			}}
		>
			<div>
				<div
					style={{
						display: "flex",
						borderBottom: "1px solid #ccc",
					}}
				>
					<h3>Сроки</h3>
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
		</div>
	);
};
