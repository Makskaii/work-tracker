import { FormProvider, useForm } from "react-hook-form";
import { useOutletContext } from "react-router";
import { AsyncSelect } from "../components/form/SelectField";
import type { ContextType } from "./ReportsPage";

export const ProjectsReports = () => {
	const Context = useOutletContext<ContextType>();

	const toalCompleted = Context?.tasks.filter(
		(task) => task.status === "5",
	).length;
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
					}}
				>
					{Context?.tasks.length !== 0 && (
						<div>
							{/* задачи факт план */}
							<div>
								<h3>Задачи</h3>
							</div>
							<div>Всего задач по проекту {Context?.tasks.length}</div>
							<div>Выполнено {toalCompleted}</div>
							<div>
								% завершённости{" "}
								{Context?.tasks.length &&
									Math.round(
										(toalCompleted ?? 0 / Context?.tasks.length) * 100,
									)}{" "}
							</div>

							<div>
								Задач в работе{" "}
								{Context?.tasks.filter((task) => task.status === "3").length}
							</div>
							<div>
								Задач без оценки{" "}
								{
									Context?.tasks.filter((task) => task.timeEstimate === "0")
										.length
								}
							</div>

							{/* оценка факт план */}
							<div>
								<h3>Часы</h3>
							</div>
							<div>
								План{" "}
								{Context?.tasks.reduce(
									(acc, task) => acc + Number(task.timeEstimate),
									0,
								) ?? 0 / 3600}{" "}
							</div>
							<div>
								В работе{" "}
								{Context?.tasks
									.filter((task) => task.status === "3")
									.reduce((acc, task) => acc + Number(task.timeEstimate), 0) ??
									0 / 3600}{" "}
							</div>

							{/* часы факт план */}
							<div>
								<h3>Факт</h3>
							</div>

							<div>
								Факт{" "}
								{Math.ceil(
									Context?.tasks.reduce(
										(acc, task) => acc + Number(task.timeSpentInLogs),
										0,
									) ?? 0 / 3600,
								)}{" "}
								ч
							</div>
							<div>
								В работе:
								{Math.ceil(
									Context?.tasks
										.filter((task) => task.status === "3")
										.reduce(
											(acc, task) => acc + Number(task.timeSpentInLogs),
											0,
										) ?? 0 / 3600,
								)}{" "}
							</div>
						</div>
					)}{" "}
				</div>
			</div>
		</>
	);
};
