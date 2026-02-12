import { useEffect, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useOutletContext } from "react-router";
import { Calendar } from "../components/calendar/Calendar";
import { AsyncSelect } from "../components/form/SelectField";
import type { ContextType } from "./ReportsPage";

export const UsersReports = () => {
	const Context = useOutletContext<ContextType>();
	const [view, setView] = useState<"month" | "week">("month");

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
				padding: "1rem",
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
				{Context?.user ? (
					<div>
						<div
							style={{
								display: "flex",
								borderBottom: "1px solid #ccc",
								padding: "0 1rem",
							}}
						>
							<h3>Задачи</h3>
						</div>
						<ul
							style={{
								padding: "0 1rem",
							}}
						>
							{dataArray.map((item) => (
								<li
									style={{
										display: "flex",
										justifyContent: "space-between",
									}}
									key={item.title}
								>
									<div>{item.title}</div>
									<div>{item.value}</div>
								</li>
							))}
						</ul>
					</div>
				) : (
					"Выберите сотрудника, чтобы просмотреть его активность по дням"
				)}
			</div>
			<div
				style={{
					flex: 4,
					overflow: "hidden",
					borderLeft: "1px solid #ccc",
				}}
			>
				<div
					style={{
						display: "flex",
						gap: "1rem",
						borderBottom: "1px solid #ccc",
						padding: "0.5rem 2rem",
						justifyContent: "space-between",
					}}
				>
					<div
						style={{
							display: "flex",
							gap: "1rem",
						}}
					>
						<button onClick={() => setView("month")}>Месяц</button>
						<button onClick={() => setView("week")}>Неделя</button>
					</div>
				</div>

				<Calendar view={view} />
			</div>
		</div>
	);
};
