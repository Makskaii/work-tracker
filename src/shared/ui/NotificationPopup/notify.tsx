import { createRoot } from "react-dom/client";
import { NotificationPopup, type NotificationType } from "./NotificationPopup";

type NotifyParams = {
	message: string;
	type?: NotificationType;
	duration?: number;
};

export const notify = ({
	message,
	type = "info",
	duration = 3000,
}: NotifyParams) => {
	const container = document.createElement("div");
	document.body.appendChild(container);

	const root = createRoot(container);

	const cleanup = () => {
		root.unmount();
		container.remove();
	};

	const timerId = window.setTimeout(() => {
		cleanup();
	}, duration);

	root.render(
		<NotificationPopup
			message={message}
			type={type}
			onClose={() => {
				window.clearTimeout(timerId);
				cleanup();
			}}
		/>,
	);
};
