import { useEffect, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useOutletContext } from "react-router";
import { AsyncSelect } from "../components/form/SelectField";
import { $api } from "../shared/config";
import { Endpoints } from "../shared/constants/const";
import type { AnyObject } from "../shared/types/types";
import type { ContextType } from "./ReportsPage";

export const UsersReports = () => {
	const [users, setUsers] = useState([]);
	const Context = useOutletContext<ContextType>();

	const methods = useForm<{
		userId: string;
	}>({
		mode: "onChange",
		reValidateMode: "onChange",
	});

	const { handleSubmit } = methods;

	useEffect(() => {
		const getUsers = async () => {
			try {
				const response = await $api.get(Endpoints.users);

				setUsers(
					response.data.result.map((task: AnyObject) => ({
						id: task.ID,
						value: task.NAME + task.LAST_NAME,
						title: task.NAME + " " + task.LAST_NAME,
					})),
				);
			} catch {
				console.log("Ошибка при получении списка сотрудников");
			}
		};

		getUsers();
	}, []);

	const handleChange = handleSubmit((data) => {
		Context?.setUser(data.userId);
	});

	const tasksInProgress = Context?.tasks.filter((task) => task.status === "3");
	const taskWithNoEstimeTime = Context?.tasks.filter(
		(task) => task.timeEstimate === "0",
	);

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
							options={users}
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
