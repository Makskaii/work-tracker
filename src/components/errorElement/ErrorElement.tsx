// ErrorElement.tsx
import { isRouteErrorResponse, useNavigate, useRouteError } from "react-router";
import styles from "./ErrorElement.module.scss";

export default function ErrorElement() {
	const error = useRouteError();
	const navigate = useNavigate();

	let title = "Oops!";
	let message = "Что-то пошло не так";
	let status = "500";

	if (isRouteErrorResponse(error)) {
		status = error.status.toString();

		switch (error.status) {
			case 404:
				title = "404";
				message = "Страница не найдена";
				break;
			case 401:
				title = "401";
				message = "Не авторизован";
				break;
			case 403:
				title = "403";
				message = "Доступ запрещен";
				break;
			case 400:
				title = "400";
				message = "Неверный запрос";
				break;
			default:
				title = error.status.toString();
				message = error.statusText || "Что-то пошло не так";
		}
	} else if (error instanceof Error) {
		message = error.message;
	}

	const handleGoBack = (): void => {
		navigate(-1);
	};

	const handleGoHome = (): void => {
		navigate("/");
	};

	return (
		<div className={styles.container}>
			<div className={styles.card}>
				<div className={styles.content}>
					<h1 className={styles.status}>{status}</h1>
					<h2 className={styles.title}>{title}</h2>
					<p className={styles.message}>{message}</p>

					<div className={styles.buttons}>
						<button onClick={handleGoBack} className={styles.backButton}>
							Назад
						</button>
						<button onClick={handleGoHome} className={styles.homeButton}>
							На главную
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
