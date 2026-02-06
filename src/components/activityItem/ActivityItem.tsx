import { useFormContext } from "react-hook-form";
import { AsyncSelect } from "../form/SelectField";

export const ActivityItem = ({
	id,
	tasks,
	projects,
}: {
	id: string;
	tasks: { id: string; title: string; value: string }[];
	projects: { id: string; title: string; value: string }[];
}) => {
	const { register } = useFormContext();

	return (
		<div
			style={{
				display: "flex",
				gap: "2rem",
				padding: "1rem",
				border: "1px solid black",
				borderRadius: "10px",
				alignItems: "center",
			}}
		>
			<div
				style={{
					display: "flex",
					gap: "5px",
				}}
			>
				<p>c</p>
				<input type="datetime-local" {...register(`${id}.startDate`)} />
			</div>
			<div
				style={{
					display: "flex",
					gap: "5px",
				}}
			>
				<p>до</p>
				<input type="datetime-local" {...register(`${id}.endDate`)} />
			</div>
			<div>
				<AsyncSelect options={activityTypes} name={`${id}.activityType`} />
			</div>
			<div>
				<AsyncSelect options={tasks} name={`${id}.activityTask`} />
			</div>
			<div>
				<AsyncSelect options={projects} name={`${id}.activityProject`} />
			</div>
			<div>
				<input type="text" {...register(`${id}.description`)} />
			</div>
		</div>
	);
};

const activityTypes = [
	{
		id: "1",
		title: "Встреча",
		value: "meeting",
	},
	{
		id: "2",
		title: "Задача",
		value: "task",
	},
];
