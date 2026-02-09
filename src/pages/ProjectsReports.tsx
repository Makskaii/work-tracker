import { useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useOutletContext } from "react-router";
import { AsyncSelect } from "../components/form/SelectField";
import { Statistics } from "../components/statistics/StaticticComponents";
import type { ContextType } from "./ReportsPage";

export const ProjectsReports = () => {
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
			<div className="header">
				<FormProvider {...methods}>
					<form onChange={handleChange}>
						<div
							style={{
								display: "flex",
								gap: "2rem",
							}}
						>
							<div
								style={{
									display: "flex",
									justifyContent: "space-between",
									flex: 1,
								}}
							>
								<div
									style={{
										display: "flex",
										gap: "10px",
										alignItems: "center",
									}}
								>
									Сортировать:
									<AsyncSelect
										name={"project"}
										options={Context?.projects ?? []}
										placeholder="Все задачи"
									/>
								</div>
								<div
									style={{
										width: "50%",
									}}
								>
									<input
										style={{
											width: "100%",
											backgroundColor: "white",
											color: "black",
											height: "100%",
											boxSizing: "border-box",
											borderColor: "#c1c1c1",
											borderRadius: "10px",
										}}
										autoComplete="off"
										type="text"
										{...register("title")}
										placeholder="Поиск по названию"
									/>
								</div>
							</div>
							<div style={{ flex: "1" }}>Статистика по проекту</div>
						</div>
					</form>
				</FormProvider>
			</div>
			<div
				style={{
					display: "flex",
					padding: "1rem",
					gap: "10px",
				}}
			>
				<div
					style={{
						flex: 1,
						height: "calc(100vh * 0.7)",
						borderRadius: "12px",
						overflowY: "auto",
						scrollbarColor: "#c1c1c1 #f5f5f5",
						display: "flex",
						flexDirection: "column",
						gap: "10px",
					}}
				>
					<div
						style={{
							position: "sticky",
							top: 0,
							textAlign: "start",
							borderBottom: "1px solid #a9a8a8",
							backgroundColor: "white",
							display: "flex",
							justifyContent: "space-between",
							padding: "0 1rem",
						}}
					>
						<div>Задачи:</div>
						<div>Исполнитель:</div>
					</div>
					{Context?.tasks.length === 0 && <div>Нет задач</div>}

					{Context?.tasks.map((task) => (
						<div
							key={task.id}
							style={{
								display: "flex",
								justifyContent: "space-between",
								padding: "0.3rem 1rem",
								cursor: "pointer",
								textAlign: "start",
								borderBottom: "1px solid #f5f5f5",
							}}
						>
							<div>
								<div
									style={{
										maxWidth: "400px",
									}}
								>
									{" "}
									{task.title}
								</div>
							</div>
							<div>
								<div>{task.responsible}</div>
							</div>
						</div>
					))}
				</div>
				<div
					style={{
						flex: 1,
						border: "1px solid #ccc",
						borderRadius: "10px",
						padding: "1rem",
					}}
				>
					{Context?.tasks.length !== 0 && (
						<div>
							<Statistics type="tasks" />

							<Statistics type="time" />

							<Statistics type="date" />
						</div>
					)}{" "}
				</div>
			</div>
		</>
	);
};
