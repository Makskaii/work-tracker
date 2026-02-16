import { useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useOutletContext } from "react-router";
import { AsyncSelect } from "../../components/form/SelectField";
import { Statistics } from "../../components/statistics/StaticticComponents";
import type { ContextType } from "../ReportsPage";
import styles from "./ProjectsReports.module.scss";

const ProjectsReports = () => {
	const Context = useOutletContext<ContextType>();
	const methods = useForm<{
		project: string;
		title: string;
	}>({
		mode: "onChange",
		reValidateMode: "onChange",
	});

	const { handleSubmit, register } = methods;

	const handleChange = handleSubmit((data) => {
		Context?.setCurrProject(data.project);
		Context?.setTitle(data.title);
	});

	useEffect(() => {
		return () => {
			Context?.setCurrProject("");
			Context.setTitle("");
		};
	}, [Context.setCurrProject, Context.setTitle]);

	return (
		<>
			<div className={styles.header}>
				<FormProvider {...methods}>
					<form onChange={handleChange}>
						<div>
							<div>
								<div>
									Сортировать:
									<AsyncSelect
										name={"project"}
										options={Context?.projects ?? []}
										placeholder="Выберите проект"
									/>
								</div>
								<div
									style={{
										width: "50%",
									}}
								>
									<input
										autoComplete="off"
										type="text"
										{...register("title")}
										placeholder="Поиск по названию"
									/>
								</div>
							</div>
							<div>Статистика по проекту</div>
						</div>
					</form>
				</FormProvider>
			</div>
			<div className={styles.contentContainer}>
				<div className={styles.tasksContainer}>
					<div className={styles.taskHeader}>
						<div>Задачи:</div>
						<div>Исполнитель:</div>
					</div>
					{Context?.tasks.length === 0 && <div>Нет задач</div>}

					{Context?.tasks.map((task) => (
						<div key={task.id} className={styles.taskItem}>
							<div>
								<div className={styles.taskTitle}> {task.title}</div>
							</div>
							<div>
								<div>
									{
										Context.users.filter(
											(user) => user.id === String(task.assignedById),
										)[0]?.title
									}
								</div>
							</div>
						</div>
					))}
				</div>
				<div className={styles.statisticsContainer}>
					{Context?.tasks.length !== 0 && Context.currProject !== "" ? (
						<div>
							<Statistics />
						</div>
					) : (
						<div className={styles.noTasksMessage}>Выберите проект</div>
					)}
				</div>
			</div>
		</>
	);
};

export default ProjectsReports;
