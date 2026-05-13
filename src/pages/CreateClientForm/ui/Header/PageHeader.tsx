import { FiPlus } from "react-icons/fi";
import styles from "../CreateClientForm.module.scss";

export const PageHeader = ({
	setClientForm,
}: {
	setClientForm: (isOpen: boolean) => void;
}) => {
	return (
		<header className={styles.pageHeader}>
			<div className={styles.titleGroup}>
				<h1 className={styles.title}>Клиентские аккаунты</h1>
				<p className={styles.subtitle}>
					Создание, просмотр и управление клиентами
				</p>
			</div>
			<button
				className={styles.createButton}
				onClick={() => setClientForm(true)}
				type="button"
			>
				<FiPlus className={styles.buttonIcon} aria-hidden="true" />
				Создать клиента
			</button>
		</header>
	);
};
