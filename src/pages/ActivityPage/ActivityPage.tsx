import { useEffect, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import uuid4 from "uuid4";
import { ActivityItem } from "../../components/activityItem/ActivityItem";
import { $api } from "../../shared/config";
import { Endpoints } from "../../shared/constants/const";
import type { AnyObject } from "../../shared/types/types";

export const ActivityPage = () => {
	const [tasks, setTasks] = useState([]);
	const [projects, setProjects] = useState([]);

	const [activitiList, setActivitiList] = useState([
		{
			id: uuid4(),
		},
	]);

	const methods = useForm<{
		[key: string]: {
			id: string;
			startDate?: string;
			endDate?: string;
			activityType: string;
			task?: string;
			project?: string;
			description?: string;
		};
	}>({
		mode: "onChange",
		reValidateMode: "onChange",
	});

	useEffect(() => {
		const getTasks = async () => {
			try {
				const response = await $api.get(Endpoints.tasks);

				setTasks(
					response.data.result.tasks.map((task: AnyObject) => ({
						id: task.id,
						title: task.title,
						value: task.title,
					})),
				);
			} catch {
				console.log("Ошибка при получении списка задач");
			}
		};

		getTasks();
	}, []);

	useEffect(() => {
		const getProjects = async () => {
			try {
				const response = await $api.get(Endpoints.groups);

				setProjects(
					response.data.result.map((group: AnyObject) => ({
						id: group.ID,
						title: group.NAME,
						value: group.NAME,
					})),
				);
			} catch {
				console.log("Ошибка при получении списка задач");
			}
		};

		getProjects();
	}, []);

	return (
		<div
			style={{
				height: "100%",
				width: "100%",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				flexDirection: "column",
			}}
		>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					width: "100%",
					marginBottom: "1rem",
					gap: "1rem",
					justifyContent: "space-between",
				}}
			>
				<div>Введите активность за день</div>
				<button
					style={{
						alignSelf: "flex-start",
					}}
					onClick={() =>
						setActivitiList([
							...activitiList,
							{
								id: uuid4(),
							},
						])
					}
				>
					Добавить активность
				</button>
			</div>

			<div
				style={{
					display: "flex",
					width: "100%",
					justifyContent: "flex-end",
				}}
			></div>

			<FormProvider {...methods}>
				<form>
					<div
						style={{
							height: "700px",
							width: "100%",
							display: "flex",
							alignItems: "center",
							flexDirection: "column",
							gap: "1rem",
						}}
					>
						{activitiList?.map((activityItem) => (
							<ActivityItem
								key={activityItem.id}
								id={activityItem.id}
								tasks={tasks}
								projects={projects}
							/>
						))}
					</div>
				</form>
			</FormProvider>
		</div>
	);
};
