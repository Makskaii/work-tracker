import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import Modal from "@/components/modal/Modal";
import { CheckPermission } from "@/components/protectedRoute/CheckPermission";
import { getProjectsFromList } from "@/shared/api/getCrmFields";

export const ClientForm = () => {
	const { handleSubmit, register } = useForm<{
		name: string;
		crmId: string;
	}>({
		mode: "onChange",
		reValidateMode: "onChange",
	});

	const [projects, setProjects] = useState<
		{
			id: string;
			name: string;
		}[]
	>([]);
	const [clients, setClients] = useState<
		{ id: string; name: string; crmClientId: string }[]
	>([]);
	const [clientForm, setClientForm] = useState<boolean>(false);

	useEffect(() => {
		const fetchProjects = async () => {
			const response = await getProjectsFromList();

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

	useEffect(() => {
		const fetchProjects = async () => {
			try {
				const clients = await fetch(
					"https://crm.evolution-soft.ru/devapps/work-tracker/api/clients",
				);

				const data = await clients.json();

				setClients(data ?? []);
			} catch {
				setClients([]);
			}
		};

		fetchProjects();
	}, []);

	const onSubmit = handleSubmit(async (data) => {
		try {
			const response = await fetch(
				"https://crm.evolution-soft.ru/devapps/work-tracker/api/clients",
				{
					method: "POST",
					body: JSON.stringify(data),
					headers: {
						"Content-Type": "application/json",
					},
				},
			);

			const res = await response.json();

			console.log(res);
		} catch (error) {
			console.log(error);
		} finally {
			setClientForm(false);
		}
	});

	console.log(clients);

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
									<h3
										style={{
											textAlign: "left",
											margin: 0,
										}}
									>
										Имя клиента
									</h3>

									<div
										style={{
											display: "flex",
											gap: "1rem",
											alignItems: "self-end",
											justifyContent: "space-between",
										}}
									>
										<div>
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
												name="name"
											/>

											<h3
												style={{
													textAlign: "left",
													margin: 0,
												}}
											>
												Выбрите клиента для привязки
											</h3>
											<select
												{...register("crmId", {
													required: "Обязательное поле",
												})}
												style={{
													width: "100%",
													padding: "1rem",
													borderRadius: "10px",
												}}
												name="crmId"
											>
												{projects.map((item) => (
													<option value={item.id ?? item.id} key={item.id}>
														{item.name}
													</option>
												))}
											</select>
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
				<div
					style={{
						flex: 1,
						minWidth: 0,
					}}
				>
					<h3>Список клиентов:</h3>

					{clients.length !== 0
						? clients.map((client) => (
								<div
									style={{
										textAlign: "left",
									}}
									key={client.id}
								>
									{client.name}
								</div>
							))
						: "Нет данных"}
				</div>
			</div>
		</CheckPermission>
	);
};
