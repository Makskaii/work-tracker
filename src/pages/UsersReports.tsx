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

	const dataArray = [
		{
			title: "Всего задач на сотруднике",
			value: Context.tasks.length,
		},
		{
			title: "В работе",
			value: tasksInProgress.length,
		},
		{
			title: "Задач без оценки времени",
			value: taskWithNoEstimeTime.length,
		},
	];

	return (
		<div
			style={{
				display: "flex",
				height: "100%",
				padding: "2rem",
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
					<div>
						<div
							style={{
								display: "flex",
								borderBottom: "1px solid #ccc",
							}}
						>
							<h3>Задачи</h3>
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
				) : (
					"Выберите сотрудника"
				)}
			</div>
		</div>
	);
};
