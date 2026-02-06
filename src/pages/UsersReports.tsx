import { useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useOutletContext } from "react-router";
import { AsyncSelect } from "../components/form/SelectField";
import type { ContextType } from "./ReportsPage";

export const UsersReports = () => {
	const Context = useOutletContext<ContextType>();

	const methods = useForm<{
		userId: string;
	}>({
		mode: "onChange",
		reValidateMode: "onChange",
	});

	const { handleSubmit } = methods;

	const handleChange = handleSubmit((data) => {
		Context?.setUser(data.userId);
	});

	const tasksInProgress = Context?.tasks.filter((task) => task.status === "3");
	const taskWithNoEstimeTime = Context?.tasks.filter(
		(task) => task.timeEstimate === "0",
	);

	useEffect(() => {
		return () => {
			Context?.setUser("");
		};
	}, [Context?.setUser]);

	return (
		<div
			style={{
				display: "flex",
				height: "100%",
			}}
		>
			<div
				style={{
					flex: 1,
				}}
			>
				<FormProvider {...methods}>
					<form onChange={handleChange}>
						<AsyncSelect
							name="userId"
							options={Context?.users ?? []}
							placeholder="Сотрудники"
						/>
					</form>
				</FormProvider>
			</div>
			<div
				style={{
					flex: 4,
				}}
			>
				{Context?.user ? (
					<>
						<h2>Задачи</h2>
						<div>Всего задач на сотруднике: {Context?.tasks?.length}</div>
						<div>В работе {tasksInProgress?.length}</div>
						<div>
							Задач без оценки трудозатрат: {taskWithNoEstimeTime?.length}
						</div>
					</>
				) : (
					"Выберите сотрудника"
				)}
			</div>
		</div>
	);
};
