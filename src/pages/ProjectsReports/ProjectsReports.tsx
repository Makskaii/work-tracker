import dayjs from "dayjs";
import { useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useOutletContext } from "react-router";
import { months } from "../../components/calendar/constants/const";
import { AsyncSelect } from "../../components/form/SelectField";
import { Statistics } from "../../components/statistics/StaticticComponents";
import type { ContextType } from "../ReportsPage";
import styles from "./ProjectsReports.module.scss";

const ProjectsReports = () => {
	const {
		setCurrProject,
		setTitle,
		projects,
		tasks,
		users,
		currProject,
		setMonth,
		month,
		year,
		setYear,
	} = useOutletContext<ContextType>();

	const methods = useForm<{
		project: string;
		title: string;
	}>({
		mode: "onChange",
		reValidateMode: "onChange",
	});

	const { handleSubmit, register } = methods;

	const handleChange = handleSubmit((data) => {
		setCurrProject(data.project);
		setTitle(data.title);
	});
	const currMonth = month && month - 1;
	useEffect(() => {
		return () => {
			setCurrProject("");
			setTitle("");
		};
	}, [setCurrProject, setTitle]);

	const handlePrev = () => {
		if (month === 1) {
			setMonth(12);
			setYear((prev) => prev - 1);
			return;
		}

		setMonth((prev) => prev - 1);
	};

	const handleNext = () => {
		if (month === 12) {
			setMonth(1);
			setYear((prev) => prev + 1);
			return;
		}

		setMonth((prev) => prev + 1);
	};

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
										options={projects ?? []}
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
							<div
								style={{
									display: "flex",
									alignItems: "center",
								}}
							>
								<div>Статистика по проекту</div>{" "}
								<div
									style={{
										background: "#ccc",
										padding: "10px",
										borderRadius: "10px",
										minWidth: "100px",
										textAlign: "center",
										placeContent: "center",
									}}
								>
									{months[currMonth ?? dayjs().month()]} {year}
								</div>
								<button
									onClick={(e) => {
										e.preventDefault();
										handlePrev();
									}}
									style={{
										background: "transparent",
										color: "#ccc",
									}}
								>
									пред. месяц
								</button>
								<button
									onClick={(e) => {
										e.preventDefault();
										handleNext();
									}}
									style={{
										background: "transparent",
										color: "#ccc",
									}}
								>
									след. месяц
								</button>
							</div>
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
					{tasks.length === 0 && <div>Нет задач</div>}

					{tasks.map((task) => (
						<div key={task.id} className={styles.taskItem}>
							<div>
								<div className={styles.taskTitle}> {task.title}</div>
							</div>
							<div>
								<div>
									{
										users.filter(
											(user) => user.id === String(task.assignedById),
										)[0]?.title
									}
								</div>
							</div>
						</div>
					))}
				</div>
				<div className={styles.statisticsContainer}>
					{tasks.length !== 0 && currProject !== "" ? (
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
