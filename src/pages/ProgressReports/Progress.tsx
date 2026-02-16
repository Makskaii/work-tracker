import dayjs from "dayjs";
import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useOutletContext } from "react-router";

import {
	months,
	dtoFieldsCodesUserReports as UserCodes,
} from "../../components/calendar/constants/const";
import { AsyncSelect } from "../../components/form/SelectField";
import { StatucBadge } from "../../components/statusBadge/StatucBadge";
import { convertNumberFormat } from "../../shared/utils";
import type { ContextType } from "../ReportsPage";
import { getTasks } from "./api/getTasks";
import { getTasksByWeek } from "./api/getTasksByWeek";
import { groupTasksByProject, groupTasksByWeek } from "./helpers/groupTasks";
import {
	type TasksWithProject,
	type TGroupedTasks,
	type WeeklyTasks,
} from "./types";

const monthCapacity = 160;

const Progress = () => {
	const [groupedTasks, setGroupedTasks] = useState<TGroupedTasks>({});
	const [weeks, setWeekTasks] = useState<WeeklyTasks[]>([]);
	const [tasksToShow, setTasksToShow] = useState<TasksWithProject>();
	const { users, projects } = useOutletContext<ContextType>();

	const methods = useForm<{
		userId: string;
	}>({
		mode: "onChange",
		reValidateMode: "onChange",
	});
	const { handleSubmit } = methods;

	const handleChange = handleSubmit(async (data) => {
		try {
			const res = await getTasksByWeek(data.userId);
			const tasks = await getTasks(data.userId);

			setGroupedTasks(groupTasksByProject(tasks));

			const grouped = groupTasksByWeek(res);

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
			<div
				style={{
					flex: 4,
					display: "flex",
					flexDirection: "column",
					gap: "1rem",
				}}
			>
				{Object.entries(groupedTasks).map(([projectId, tasks]) => (
					<div
						style={{
							textAlign: "left",
							display: "flex",
							flexDirection: "column",
							gap: "1rem",
							border: "1px solid #ccc",
							borderRadius: "10px",
							padding: "10px",
						}}
						key={projectId}
					>
						<div
							style={{
								display: "flex",
								gap: "10px",
								flexDirection: "column",
								borderBottom: "1px solid #ccc",
							}}
						>
							<h3>
								{projects.find((project) => project.ID === projectId)?.VALUE}
							</h3>
							<div
								style={{
									display: "flex",
									flexDirection: "column",
									gap: "10px",
								}}
							>
								<div>
									Запланировано:{" "}
									{Number(
										tasks?.reduce(
											(acc, task) =>
												acc +
												+convertNumberFormat(task[UserCodes.estimateTime]),
											0,
										),
									)}
									ч. из {monthCapacity}ч. за {months[dayjs().month()]}
								</div>
								<div> Всего задач: {tasks?.length}</div>
							</div>
						</div>

						<div
							style={{
								display: "flex",
								gap: "10px",
							}}
						>
							Результаты:{" "}
							{weeks.map((week) => {
								{
									const weekTasksInProject =
										week.tasks?.filter(
											(task) => task[UserCodes.project] === Number(projectId),
										) || [];

									if (weekTasksInProject.length > 0) {
										const totalHours = weekTasksInProject.reduce(
											(acc, task) =>
												acc + convertNumberFormat(task[UserCodes.estimateTime]),
											0,
										);
										return (
											<div
												style={{
													cursor: "pointer",
												}}
												key={week.week}
												onClick={(e) => {
													e.stopPropagation();
													setTasksToShow({
														tasks: weekTasksInProject ?? [],
														projId: projectId,
													});
												}}
											>
												<strong>Неделя {week.week}:</strong>
												<div>задач: {weekTasksInProject.length}</div>
												<div>часов: {totalHours} ч.</div>
											</div>
										);
									} else {
										return (
											<div
												style={{
													cursor: "pointer",
												}}
												key={week.week}
												onClick={(e) => {
													e.stopPropagation();
													setTasksToShow({
														tasks: [],
														projId: "",
													});
												}}
											>
												<strong>Неделя {week.week}:</strong>
												<div>задач: 0</div>
												<div>часов: 0 ч.</div>
											</div>
										);
									}
								}
							})}
							<button
								style={{
									height: "50%",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
								}}
								onClick={(e) => {
									e.stopPropagation();
									setTasksToShow({
										tasks: tasks ?? [],
										projId: projectId,
									});
								}}
							>
								Все задачи
							</button>
						</div>
						{tasksToShow?.projId === projectId && (
							<ul
								style={{
									border: "1px solid #ccc",
									borderRadius: "10px",
								}}
							>
								{tasksToShow.tasks?.map((task) => (
									<li key={task.id}>
										<StatucBadge status={task.stageId} /> {task.title}
									</li>
								))}
							</ul>
						)}

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
						<div
							style={{
								borderBottom: "1px solid #ccc",
							}}
						>
							{" "}
							Итог сотрудника за месяц:{" "}
						</div>
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
										(acc, task) =>
											acc + convertNumberFormat(task[UserCodes.estimateTime]),
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

export default Progress;
