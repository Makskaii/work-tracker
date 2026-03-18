import { useState } from "react";
import { useForm } from "react-hook-form";
import Modal from "@/components/modal/Modal";
import { CheckPermission } from "@/components/protectedRoute/CheckPermission";

export const ClientForm = () => {
	const { handleSubmit, register } = useForm<{
		clientName: string;
	}>({
		mode: "onChange",
		reValidateMode: "onChange",
	});

	const [clientForm, setClientForm] = useState<boolean>(false);

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
								<form
									id="client-form"
									onChange={handleSubmit((data) => {
										console.log(data);
									})}
								>
									<h3
										style={{
											textAlign: "left",
										}}
									>
										Имя клиента
									</h3>
									<div
										style={{
											display: "flex",
											gap: "1rem",
											alignItems: "center",
											justifyContent: "space-between",
										}}
									>
										<input
											{...register("clientName")}
											style={{
												border: "none",
												borderRadius: "0.5rem",
												minWidth: "20rem",
												padding: "0.5rem",
												height: "2rem",
											}}
											type="text"
											placeholder="Клиент"
											name="clientName"
										/>
										<button
											type="submit"
											disabled
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
					список клиентов tbd
				</div>
			</div>
		</CheckPermission>
	);
};
