import { useForm } from "react-hook-form";
import { useNavigate } from "react-router";
import { $backendApi } from "@/shared/config/axios/axios.config";
import brandLogo from "/evolution/logo.jpg";
import styles from "./ClientLogin.module.scss";

type ClientLoginProps = {
	email: string;
	password: string;
};

export const ClientLoginPage = () => {
	const {
		handleSubmit,
		register,
		formState: { errors, isValid, isSubmitting },
	} = useForm<ClientLoginProps>({
		mode: "onChange",
		reValidateMode: "onChange",
		defaultValues: {
			email: "",
			password: "",
		},
	});

	const navigate = useNavigate();

	const onSubmit = async (data: ClientLoginProps) => {
		console.log("login data", data);

		const res = await $backendApi.post("auth/client", data);

		const clientId = res.data.client.crmClientId;

		navigate(`/client/profile/${clientId}`);
	};

	return (
		<div className={styles.page}>
			<div className={styles.shell}>
				<div className={styles.brandSide}>
					<div className={styles.brandContent}>
						<div className={styles.brandBadge}>Безопасный доступ</div>

						<h1 className={styles.brandTitle}>
							Управление проектами в одном окне
						</h1>

						<p className={styles.brandDescription}>
							Просматривайте свои проекты, отслеживайте активность команды,
							получайте обновления и подключайтесь к рабочим встречам через
							единый клиентский портал.
						</p>

						<div className={styles.brandFeatures}>
							<div className={styles.featureItem}>
								<span className={styles.featureDot} />
								<span>Список ваших проектов</span>
							</div>
							<div className={styles.featureItem}>
								<span className={styles.featureDot} />
								<span>Последняя активность по задачам</span>
							</div>
							<div className={styles.featureItem}>
								<span className={styles.featureDot} />
								<span>Связь с менеджером и командой</span>
							</div>
							<div className={styles.featureItem}>
								<span className={styles.featureDot} />
								<span>Ближайшие встречи и демо</span>
							</div>
						</div>
					</div>
				</div>

				<div className={styles.formSide}>
					<div className={styles.formCard}>
						<div className={styles.formHeader}>
							<div className={styles.formLogoRow}>
								<img
									src={brandLogo}
									alt="Логотип"
									className={styles.formLogo}
								/>
								<div>
									<div className={styles.formLogoTitle}>Client Portal</div>
									<div className={styles.formLogoSubtitle}>Вход в систему</div>
								</div>
							</div>

							<div className={styles.formIntro}>
								<h2 className={styles.formTitle}>Добро пожаловать</h2>
								<p className={styles.formText}>
									Введите учётные данные клиента для входа в портал
								</p>
							</div>
						</div>

						<form
							onSubmit={handleSubmit(onSubmit)}
							className={styles.form}
							autoComplete="off"
						>
							<div className={styles.field}>
								<label htmlFor="email" className={styles.label}>
									Логин
								</label>
								<input
									id="email"
									type="text"
									placeholder="Введите логин"
									autoComplete="off"
									className={`${styles.input} ${
										errors.email ? styles.inputError : ""
									}`}
									{...register("email", {
										required: "Введите email",
									})}
								/>
								{errors.email && (
									<span className={styles.errorText}>
										{errors.email.message}
									</span>
								)}
							</div>

							<div className={styles.field}>
								<label htmlFor="password" className={styles.label}>
									Пароль
								</label>
								<input
									id="password"
									autoComplete="off"
									type="password"
									placeholder="Введите пароль"
									className={`${styles.input} ${
										errors.password ? styles.inputError : ""
									}`}
									{...register("password", {
										required: "Введите пароль",
										minLength: {
											value: 6,
											message: "Пароль должен содержать минимум 6 символов",
										},
									})}
								/>
								{errors.password && (
									<span className={styles.errorText}>
										{errors.password.message}
									</span>
								)}
							</div>

							<div className={styles.formActions}>
								<button
									type="submit"
									className={styles.submitButton}
									disabled={!isValid || isSubmitting}
								>
									{isSubmitting ? "Выполняется вход..." : "Войти в портал"}
								</button>
							</div>
						</form>

						<div className={styles.footerNote}>
							Если у вас нет доступа или возникли проблемы со входом —
							обратитесь к менеджеру проекта.
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};
