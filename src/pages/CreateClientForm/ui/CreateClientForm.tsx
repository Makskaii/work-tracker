import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import Modal from "@/components/modal/Modal";
import { CheckPermission } from "@/components/protectedRoute/CheckPermission";
import { getClientsFromList } from "@/shared/api/getCrmFields";

type ClientFormProps = {
	name: string;
	crmId: string;
	password: string;
	email: string;
};

export const ClientForm = () => {
	const {
		handleSubmit,
		register,
		formState: { errors },
	} = useForm<ClientFormProps>({
		mode: "onChange",
		reValidateMode: "onChange",
	});

	const [projects, setProjects] = useState<
		{
			id: string;
			name: string;
		}[]
	>([]);

	const [clientForm, setClientForm] = useState<boolean>(false);

	useEffect(() => {
		const fetchProjects = async () => {
			const response = await getClientsFromList();

			setProjects(
				response.map((proj) => {
					return {
						id: proj.ID,
						name: proj.NAME,
					};
				}),
			);
		};

		fetchProjects();
	}, []);

	const onSubmit = handleSubmit(async (data) => {
		try {
			await fetch(
				"https://crm.evolution-soft.ru/devapps/work-tracker/api/clients",
				{
					method: "POST",
					body: JSON.stringify(data),
					headers: {
						"Content-Type": "application/json",
					},
				},
			);
		} catch (error) {
			console.log(error);
		} finally {
			setClientForm(false);
		}
	});
	console.log({ errors });
	return (
		<CheckPermission permission="create-client" subject="client">
			<div
				style={{
					display: "flex",
					minHeight: "90vh",
					gap: "1rem",
				}}
			>
				<div
					style={{
						flex: 1,
						minWidth: 0,
						display: "flex",
						alignItems: "start",
						gap: "2rem",
					}}
				>
					<button onClick={() => setClientForm(true)}>Добавить клиента</button>
					{clientForm && (
						<Modal isOpen={clientForm} onClose={() => setClientForm(false)}>
							<div
								style={{
									display: "flex",
									flexDirection: "column",
									gap: "1rem",
								}}
							>
								<form id="client-form" onSubmit={onSubmit}>
									<div
										style={{
											display: "flex",
											gap: "1rem",
											alignItems: "self-end",
											justifyContent: "space-between",
										}}
									>
										<div>
											<div>
												<h5
													style={{
														textAlign: "left",
														margin: 0,
													}}
												>
													Имя клиента
												</h5>
												<input
													{...register("name", {
														required: "Обязательное поле",
													})}
													style={{
														border: "none",
														borderRadius: "0.5rem",
														minWidth: "20rem",
														padding: "0.5rem",
														height: "2rem",
													}}
													type="text"
													placeholder="Клиент"
													autoComplete="off"
												/>
											</div>
											<div>
												<div
													style={{
														display: "flex",
														justifyContent: "space-between",
													}}
												>
													<p
														style={{
															textAlign: "left",
															margin: 0,
														}}
													>
														Эл. почта
													</p>
													{errors.email && errors.email.type === "validate" && (
														<span
															style={{
																color: "red",
															}}
														>
															{errors.email?.message}
														</span>
													)}
												</div>

												<input
													{...register("email", {
														required: "Обязательное поле",
														validate: (value) => {
															const regExp = /^\S+@\S+\.\S+$/;

															if (!regExp.test(value)) {
																return "Неверный формат email";
															}
														},
													})}
													style={{
														border: "none",
														borderRadius: "0.5rem",
														minWidth: "20rem",
														padding: "0.5rem",
														height: "2rem",
													}}
													type="text"
													placeholder="Почта клиента"
													autoComplete="off"
												/>
											</div>

											<div>
												<h5
													style={{
														textAlign: "left",
														margin: 0,
													}}
												>
													Пароль
												</h5>
												<input
													{...register("password", {
														required: "Обязательное поле",
													})}
													style={{
														border: "none",
														borderRadius: "0.5rem",
														minWidth: "20rem",
														padding: "0.5rem",
														height: "2rem",
													}}
													type="text"
													placeholder="Введите пароль"
													autoComplete="off"
												/>
											</div>

											<div>
												<h5
													style={{
														textAlign: "left",
														margin: 0,
													}}
												>
													Выбрите клиента для привязки
												</h5>
												<select
													{...register("crmId", {
														required: "Обязательное поле",
													})}
													style={{
														width: "100%",
														padding: "1rem",
														borderRadius: "10px",
													}}
												>
													{projects.map((item) => (
														<option value={item.id ?? item.id} key={item.id}>
															{item.name}
														</option>
													))}
												</select>
											</div>
										</div>

										<button
											type="submit"
											form="client-form"
											style={{
												maxWidth: "200px",
											}}
										>
											Сохранить
										</button>
									</div>
								</form>
							</div>
						</Modal>
					)}
				</div>
			</div>
		</CheckPermission>
	);
};
