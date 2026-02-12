import { useEffect, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useOutletContext } from "react-router";
import { dtoFieldsCodesUserReports as UserCodes } from "../components/calendar/constants/const";
import { AsyncSelect } from "../components/form/SelectField";
import { $api } from "../shared/config";
import { Endpoints } from "../shared/constants/const";
import type { ContextType } from "./ReportsPage";

interface KanbanTask {
	assignedById: number;
	createdTime: string;
	id: number;
	lastActivityTime: string;
	stageId: string;
	title: string;
	[UserCodes.description]: string;
	[UserCodes.estimateTime]: string;
	[UserCodes.project]: number;
	[UserCodes.stage]: string;
}

export const Progress = () => {
	const getWeekNumber = (date: string): number => {
		const d = new Date(date);
		d.setHours(0, 0, 0, 0);
		d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
		const week1 = new Date(d.getFullYear(), 0, 4);
		return (
			1 +
			Math.round(
				((d.getTime() - week1.getTime()) / 86400000 -
					3 +
					((week1.getDay() + 6) % 7)) /
					7,
			)
		);
	};

	const groupByWeek = (tasks: KanbanTask[]) => {
		return tasks.reduce(
			(acc, task) => {
				const week = getWeekNumber(task.createdTime);
				if (!acc[week]) {
					acc[week] = [];
				}
				acc[week].push(task);
				return acc;
			},
			{} as Record<number, KanbanTask[]>,
		);
	};
	const [data, setData] = useState<KanbanTask[]>([]);
	const [projects, setProjects] = useState<
		{
			ID: string;
			VALUE: string;
		}[]
	>([]);
	const { users } = useOutletContext<ContextType>();
	const methods = useForm<{
		userId: string;
	}>({
		mode: "onChange",
		reValidateMode: "onChange",
	});
	const { handleSubmit } = methods;

	useEffect(() => {
		const getProjects = async () => {
			try {
				const response = await $api.post("crm.item.fields", {
					entityTypeId: 1072,
				});

				setProjects(response.data.result.fields["ufCrm14_1770801014487"].items);
			} catch {
				console.log("Ошибка при получении списка задач");
			}
		};

		getProjects();
	}, []);

	const tasksByWeek = groupByWeek(data);
	console.log(tasksByWeek);
	const groupedByProjectsTasks = Object.groupBy(data, (task) => {
		return task[UserCodes.project] ?? "unknown";
	});

	const handleChange = handleSubmit(async (data) => {
		try {
			const response = await $api.get(Endpoints.reports, {
				params: {
					entityTypeId: 1072,

					select: [
						"id",
						"title",
						"assignedById",
						"createdTime",
						"lastActivityTime",
						"stageId",
						UserCodes.project,
						UserCodes.estimateTime,
						UserCodes.description,
						UserCodes.stage,
					],
					filter: {
						assignedById: data.userId,
					},
				},
			});

			setData(response.data.result.items);
		} catch {
			console.log("Ошибка при получении списка сотрудников");
		}
	});

	return (
		<div
			style={{
				display: "flex",
			}}
		>
			<div style={{ flex: 2 }}>
				<FormProvider {...methods}>
					<form onChange={handleChange}>
						<div
							style={{
								display: "flex",
								gap: "10px",
								alignItems: "center",
							}}
						>
							Сотрудник:
							<AsyncSelect
								name={"userId"}
								options={users}
								placeholder="Выберите сотрудника"
							/>
						</div>
					</form>
				</FormProvider>
			</div>
			<div style={{ flex: 4 }}>
				{Object.entries(groupedByProjectsTasks).map(([projectId, tasks]) => (
					<div style={{ textAlign: "left" }} key={projectId}>
						<h3>
							{projects.find((project) => project.ID === projectId)?.VALUE}
						</h3>
						<ul>
							{tasks?.map((task) => (
								<li key={task.id}>{task.title}</li>
							))}
						</ul>
						<div> Задач в спринте: {tasks?.length}</div>
						<div>
							Задач в работе:{" "}
							{
								tasks?.filter(
									(task) => task[UserCodes.stage] === "Общая\/In Work",
								).length
							}
						</div>
						<div>
							Задач выполнено:{" "}
							{
								tasks?.filter((task) => task[UserCodes.stage] === "Общая\/Done")
									.length
							}
						</div>
						<div> Итог сотрудника за месяц: </div>
						<ul>
							<li>
								Задач выполнено:{" "}
								{
									tasks?.filter(
										(task) => task[UserCodes.stage] === "Общая\/Done",
									).length
								}{" "}
							</li>
							<li>
								Часы:{" "}
								{tasks
									?.filter((task) => task[UserCodes.stage] === "Общая\/Done")
									.reduce(
										(acc, task) => acc + Number(task[UserCodes.estimateTime]),
										0,
									)}{" "}
								ч.
							</li>
						</ul>
					</div>
				))}
			</div>
		</div>
	);
};
