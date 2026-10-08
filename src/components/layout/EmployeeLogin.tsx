import { employeeLoginUrl } from "@/shared/config/auth/employeeAuth.api";
import styles from "./EmployeeLogin.module.scss";

export const EmployeeLogin = ({ error, returnTo, onRetry }: { error?: string | null; returnTo: string; onRetry: () => void }) => (
	<div className={styles.page}>
		<div className={styles.card}>
			<div className={styles.brand}>WORK TRACKER</div>
			<h1>Все рабочие инструменты<br />в одном месте</h1>
			<p>Войдите с вашей учётной записью Битрикс24. Проекты, задачи и отчёты откроются с вашими обычными правами.</p>
			{error && <div className={styles.error} role="alert">{error}</div>}
			<a className={styles.login} href={employeeLoginUrl(returnTo)}>Войти через Битрикс24 <span aria-hidden="true">↗</span></a>
			{error && <button className={styles.retry} type="button" onClick={onRetry}>Повторить подключение</button>}
			<div className={styles.note}>Пароль вводится только на странице Битрикс24.</div>
		</div>
	</div>
);
