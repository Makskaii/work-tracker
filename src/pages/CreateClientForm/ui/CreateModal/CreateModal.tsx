import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import Modal from "@/components/modal/Modal";
import { $backendApi } from "@/shared/config/axios/axios.config";
import { notify } from "@/shared/ui/NotificationPopup/notify";
import type { CompanyOption } from "../CreateClientForm";

type ClientFormProps = {
	name: string;
	crmId: string;
	password: string;
	email: string;
};

const inputStyle = {
	border: "1px solid var(--color-border)",
	borderRadius: "0.5rem",
	height: "2rem",
	minWidth: "20rem",
	padding: "0.5rem",
	width: "stretch",
};

const labelTitleStyle = {
	textAlign: "left" as const,
	margin: 0,
};

export const CreateModal = ({
	clientForm,
	setClientForm,
	searchCompanies,
	onClientCreated,
}: {
	clientForm: boolean;
	setClientForm: (isOpen: boolean) => void;
	searchCompanies: (query: string) => Promise<CompanyOption[]>;
	onClientCreated?: () => Promise<void> | void;
}) => {
	const [companySearch, setCompanySearch] = useState("");
	const [companies, setCompanies] = useState<CompanyOption[]>([]);
	const [isCompanySearchLoading, setIsCompanySearchLoading] = useState(false);
	const [isManualCrmIdInput, setIsManualCrmIdInput] = useState(false);
	const {
		handleSubmit,
		register,
		setValue,
		formState: { errors },
	} = useForm<ClientFormProps>({
		mode: "onChange",
		reValidateMode: "onChange",
		defaultValues: {
			crmId: "",
		},
	});

	useEffect(() => {
		if (isManualCrmIdInput) {
			setCompanies([]);
			setIsCompanySearchLoading(false);
			return;
		}

		const search = companySearch.trim();

		if (search.length < 2) {
			setCompanies([]);
			setIsCompanySearchLoading(false);
			return;
		}

		let isActual = true;
		setIsCompanySearchLoading(true);

		const timeoutId = window.setTimeout(() => {
			searchCompanies(search)
				.then((items) => {
					if (isActual) {
						setCompanies(items);
					}
				})
				.catch((error) => {
					console.error("Failed to search Bitrix companies", error);

					if (isActual) {
						setCompanies([]);
					}
				})
				.finally(() => {
					if (isActual) {
						setIsCompanySearchLoading(false);
					}
				});
		}, 350);

		return () => {
			isActual = false;
			window.clearTimeout(timeoutId);
		};
	}, [companySearch, isManualCrmIdInput, searchCompanies]);

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

			notify({
				message: err.message ?? "Ошибка при создании клиента",
				type: "error",
			});
		} finally {
			setClientForm(false);
		}
	});

	return (
		<Modal
			isOpen={clientForm}
			onClose={() => setClientForm(false)}
			closeOnBackdropClick={false}
		>
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
							<h5 style={labelTitleStyle}>Название компании</h5>
							<input
								{...register("name", {
									required: "Обязательное поле",
								})}
								style={inputStyle}
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
								<p style={labelTitleStyle}>Эл. почта</p>
								{errors.email && (
									<span style={{ color: "var(--color-danger)" }}>
										{errors.email.message}
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

										return true;
									},
								})}
								style={inputStyle}
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
								<p style={labelTitleStyle}>Пароль</p>
								{errors.password && (
									<span style={{ color: "var(--color-danger)" }}>
										{errors.password.message}
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
								style={inputStyle}
								type="text"
								placeholder="Введите пароль"
								autoComplete="off"
							/>
						</div>

						<div>
							<h5 style={labelTitleStyle}>Выберите клиента для привязки</h5>
							<input
								value={companySearch}
								onChange={(event) => {
									setCompanySearch(event.target.value);

									if (!isManualCrmIdInput) {
										setValue("crmId", "", {
											shouldDirty: true,
											shouldValidate: true,
										});
									}
								}}
								style={{
									...inputStyle,
									marginBottom: "0.5rem",
								}}
								type="text"
								placeholder="Начните вводить название компании"
								autoComplete="off"
							/>
							<button
								type="button"
								style={{
									background: "transparent",
									border: 0,
									color: "var(--color-accent)",
									cursor: "pointer",
									marginBottom: "0.5rem",
									padding: 0,
								}}
								onClick={() => {
									setIsManualCrmIdInput((current) => !current);
									setValue("crmId", "", {
										shouldDirty: true,
										shouldValidate: true,
									});
								}}
							>
								{isManualCrmIdInput
									? "Вернуться к выбору из Bitrix"
									: "Ввести ID вручную для теста"}
							</button>

							{isManualCrmIdInput ? (
								<input
									{...register("crmId", {
										required: "Обязательное поле",
										validate: (value) => {
											const parsedValue = Number(value);

											if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
												return "Введите положительный числовой ID";
											}

											return true;
										},
									})}
									style={inputStyle}
									type="text"
									inputMode="numeric"
									placeholder="Bitrix ID компании"
									autoComplete="off"
								/>
							) : (
								<>
									{isCompanySearchLoading && (
										<div style={{ marginBottom: "0.5rem" }}>Поиск...</div>
									)}
									{companySearch.trim().length === 1 && (
										<div style={{ marginBottom: "0.5rem" }}>
											Введите минимум 2 символа
										</div>
									)}
									{companySearch.trim().length >= 2 &&
										!isCompanySearchLoading &&
										companies.length === 0 && (
											<div style={{ marginBottom: "0.5rem" }}>
												Компании не найдены
											</div>
										)}
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
										<option value="">Выберите компанию</option>
										{companies.map((item) => (
											<option value={item.id} key={item.id}>
												{item.name}
											</option>
										))}
									</select>
								</>
							)}

							{errors.crmId && (
								<span style={{ color: "var(--color-danger)" }}>
									{errors.crmId.message}
								</span>
							)}
						</div>

						<button
							type="submit"
							form="client-form"
							style={{
								maxWidth: "200px",
								alignSelf: "self-end",
								background: "#063d43",
								color: "var(--color-accent)",
								border: "1px solid var(--color-border)",
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
