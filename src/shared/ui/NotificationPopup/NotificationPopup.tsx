import styles from "./NotificationPopup.module.scss";

export type NotificationType = "error" | "info" | "success" | "warning";

type NotificationPopupProps = {
	message: string;
	type: NotificationType;
	onClose: () => void;
};

const titles: Record<NotificationType, string> = {
	error: "Ошибка",
	info: "Инфо",
	success: "Успех",
	warning: "Предупреждение",
};

export const NotificationPopup = ({
	message,
	type,
	onClose,
}: NotificationPopupProps) => {
	return (
		<div className={`${styles.popup} ${styles[type]}`}>
			<div className={styles.content}>
				<div className={styles.header}>{titles[type]}</div>
				<div className={styles.message}>{message}</div>
			</div>

			<button
				type="button"
				className={styles.closeButton}
				onClick={onClose}
				aria-label="Закрыть уведомление"
			>
				×
			</button>
		</div>
	);
};
