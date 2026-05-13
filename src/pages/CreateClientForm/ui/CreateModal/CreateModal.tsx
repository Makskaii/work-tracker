import { useForm } from "react-hook-form";
import Modal from "@/components/modal/Modal";
import { $backendApi } from "@/shared/config/axios/axios.config";
import { notify } from "@/shared/ui/NotificationPopup/notify";

type ClientFormProps = {
	name: string;
	crmId: string;
	password: string;
	email: string;
};

export const CreateModal = ({
	clientForm,
	setClientForm,
	projects,
	onClientCreated,
}: {
	clientForm: boolean;
	setClientForm: (isOpen: boolean) => void;
	projects: { id: string; name: string }[];
	onClientCreated?: () => Promise<void> | void;
}) => {
	const {
		handleSubmit,
		register,
		formState: { errors },
	} = useForm<ClientFormProps>({
		mode: "onChange",
		reValidateMode: "onChange",
	});

	const onSubmit = handleSubmit(async (data) => {
		try {
			await $backendApi.post("clients", data);
			await onClientCreated?.();

			notify({
				message: "Клиент успешно добавлен",
				type: "success",
			});
		} catch (error) {
			const err = error as Error;
			const message = err.message;

			notify({
				message: message ?? "Ошибка при создании клиента",
				type: "error",
			});
		} finally {
			setClientForm(false);
		}
	});

	return (
		<Modal isOpen={clientForm} onClose={() => setClientForm(false)}>
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					gap: "1rem",
				}}
			>
				<div style={{ textAlign: "center" }}>
					<h2>Создание аккаунта</h2>
				</div>

				<form id="client-form" onSubmit={onSubmit}>
					<div
						style={{
							display: "flex",
							gap: "1rem",
							flexDirection: "column",
						}}
					>
						<div>
							<h5
								style={{
									textAlign: "left",
									margin: 0,
								}}
							>
								Название компании
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
									width: "stretch",
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
									width: "stretch",
								}}
								type="text"
								placeholder="Почта клиента"
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
									Пароль
								</p>
								{errors.password && errors.password.type === "minLength" && (
									<span
										style={{
											color: "red",
										}}
									>
										{errors.password?.message}
									</span>
								)}
							</div>

							<input
								{...register("password", {
									required: "Обязательное поле",
									minLength: {
										message: "Минимум 8 символов",
										value: 8,
									},
								})}
								style={{
									border: "none",
									borderRadius: "0.5rem",
									minWidth: "20rem",
									padding: "0.5rem",
									height: "2rem",
									width: "stretch",
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
								<option key={"default"}>Проект</option>
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
								alignSelf: "self-end",
								background: "blue",
								color: "white",
								border: "none",
							}}
						>
							Сохранить
						</button>
					</div>
				</form>
			</div>
		</Modal>
	);
};
