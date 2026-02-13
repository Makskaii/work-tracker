import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useOutletContext } from "react-router";
import {
	months,
	dtoFieldsCodesUserReports as UserCodes,
} from "../components/calendar/constants/const";
import { AsyncSelect } from "../components/form/SelectField";
import { $api } from "../shared/config";
import { Endpoints } from "../shared/constants/const";
import { getWorkWeeks } from "../shared/utils";
import type { ContextType } from "./ReportsPage";

const monthCapacity = 160;

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

const getTasksByWeek = async (userId: string) => {
	const currMonthWeeks = getWorkWeeks(
		new Date().getMonth(),
		new Date().getFullYear(),
	);

	const result = await Promise.all(
		currMonthWeeks.map((week) =>
			$api.get(Endpoints.reports, {
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
						assignedById: userId,
						stageId: "DT1072_18:UC_6JNSDG",
						"<=lastActivityTime": dayjs(week.endOfTheWeek).toISOString(),
						">=lastActivityTime": dayjs(week.startOfTheWeek).toISOString(),
					},
				},
			}),
		),
	);
	return result;
};

export const Progress = () => {
	const [data, setData] = useState<KanbanTask[]>([]);
	const [weeks, setWeekTasks] = useState<
		{ week: number; title: string; tasks?: KanbanTask[] }[]
	>([]);
	console.log(weeks);
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

	const groupedByProjectsTasks = Object.groupBy(data, (task) => {
		return task[UserCodes.project] ?? "unknown";
	});

	console.log(groupedByProjectsTasks);

	const handleChange = handleSubmit(async (data) => {
		try {
			const res = await getTasksByWeek(data.userId);
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

			const grouped = res.map((res, i) => {
				if (res.data.result.items.length === 0)
					return {
						week: i + 1,
						title: "Нет задач",
					};

				return {
					week: i + 1,
					title: `${res.data.result.items.length} задач`,
					tasks: res.data.result.items,
				};
			});

			setWeekTasks(grouped);
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
				{/* {weeks.map((week) => (
					<>
						<div>Итоги недели: {week.week}</div>
						<div>Задач: {week.tasks.length ?? 0}</div>
						{week.tasks && (
							<div>
								Часов:{" "}
								{week.tasks?.reduce(
									(acc, task) => acc + +task[UserCodes.estimateTime],
									0,
								)}
							</div>
						)}
					</>
				))} */}
				{Object.entries(groupedByProjectsTasks).map(([projectId, tasks]) => (
					<div style={{ textAlign: "left" }} key={projectId}>
						<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
							<h3>
								{projects.find((project) => project.ID === projectId)?.VALUE}
							</h3>
							<div>
								{tasks?.reduce(
									(acc, task) => acc + +task[UserCodes.estimateTime],
									0,
								)}
								ч. из {monthCapacity}ч. за {months[dayjs().month()]}
							</div>
						</div>

						<div
							style={{
								display: "flex",
								gap: "10px",
							}}
						>
							{weeks.map((week) => {
								{
									const weekTasksInProject =
										week.tasks?.filter(
											(task) => task[UserCodes.project] === Number(projectId),
										) || [];

									if (weekTasksInProject.length > 0) {
										const totalHours = weekTasksInProject.reduce(
											(acc, task) => acc + Number(task[UserCodes.estimateTime]),
											0,
										);
										return (
											<div key={week.week}>
												<strong>Неделя {week.week}:</strong>
												<div>задач: {weekTasksInProject.length}</div>
												<div>часов: {totalHours} ч.</div>
											</div>
										);
									} else {
										return (
											<div key={week.week}>
												<strong>Неделя {week.week}:</strong>
												<div>задач: 0</div>
												<div>часов: 0 ч.</div>
											</div>
										);
									}
								}
							})}
						</div>

						<ul>
							{tasks?.map((task) => (
								<li key={task.id}>{task.title}</li>
							))}
						</ul>
						<div>
							{" "}
							Задач в спринте: {tasks?.length}
							{` (${tasks?.reduce(
								(acc, task) => acc + Number(task[UserCodes.estimateTime]),
								0,
							)}  ч.)`}
						</div>
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
								tasks?.filter((task) => task.stageId === "DT1072_18:UC_6JNSDG")
									.length
							}
						</div>
						<div> Итог сотрудника за месяц: </div>
						<ul>
							<li>
								Задач выполнено:{" "}
								{
									tasks?.filter(
										(task) => task.stageId === "DT1072_18:UC_6JNSDG",
									).length
								}{" "}
							</li>
							<li>
								Часы:{" "}
								{tasks
									?.filter((task) => task.stageId === "DT1072_18:UC_6JNSDG")
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
