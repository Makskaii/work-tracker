import { type CSSProperties, type MouseEvent, useState } from "react";
import { UniversalTable } from "@/components/Table/universalTable/UniversalTable";
import { $backendApi } from "@/shared/config/axios/axios.config";
import type { Header } from "@/shared/types/table";
import { notify } from "@/shared/ui/NotificationPopup/notify";

export type ClientsTable = {
	id: string;
	name: string;
	email: string;
	status: string;
	createdAt: string;
};

type ClientAction = "toggleStatus" | "delete";

type ClientsTableAdditionalData = {
	row?: ClientsTable;
	onDeleteClient?: () => Promise<void> | void;
	onToggleClientStatus?: () => Promise<void> | void;
};

type ClientRowActionsProps = {
	clientId: string;
	isInactive?: boolean;
	onDeleteClient?: () => Promise<void> | void;
	onToggleClientStatus?: () => Promise<void> | void;
};

const actionsStyle: CSSProperties = {
	display: "flex",
	gap: "0.5rem",
	flexWrap: "wrap",
	justifyContent: "center",
	alignItems: "center",
};

const baseButtonStyle: CSSProperties = {
	border: "none",
	borderRadius: "8px",
	padding: "0.4rem 0.7rem",
	fontSize: "0.82rem",
	fontWeight: 600,
	cursor: "pointer",
	whiteSpace: "nowrap",
	transition: "transform 0.15s ease, opacity 0.15s ease",
};

const deactivateButtonStyle: CSSProperties = {
	...baseButtonStyle,
	background: "rgba(245, 158, 11, 0.12)",
	color: "#b45309",
	border: "1px solid rgba(245, 158, 11, 0.28)",
};

const activateButtonStyle: CSSProperties = {
	...baseButtonStyle,
	background: "rgba(22, 163, 74, 0.12)",
	color: "#15803d",
	border: "1px solid rgba(22, 163, 74, 0.26)",
};

const deleteButtonStyle: CSSProperties = {
	...baseButtonStyle,
	background: "rgba(239, 68, 68, 0.12)",
	color: "#b91c1c",
	border: "1px solid rgba(239, 68, 68, 0.26)",
};

const disabledButtonStyle: CSSProperties = {
	cursor: "not-allowed",
	opacity: 0.55,
};

const getErrorMessage = (error: unknown, fallbackMessage: string) => {
	if (error instanceof Error) {
		return error.message;
	}

	return fallbackMessage;
};

const ClientRowActions = ({
	clientId,
	isInactive,
	onDeleteClient,
	onToggleClientStatus,
}: ClientRowActionsProps) => {
	const [pendingAction, setPendingAction] = useState<ClientAction | null>(null);
	const isPending = pendingAction !== null;
	const statusActionText = isInactive ? "Активировать" : "Деактивировать";

	const handleToggleStatus = async (event: MouseEvent<HTMLButtonElement>) => {
		event.stopPropagation();

		if (isPending) return;

		const confirmed = window.confirm(`${statusActionText} клиента?`);
		if (!confirmed) return;

		setPendingAction("toggleStatus");

		try {
			await $backendApi.patch(`clients/${clientId}/status/toggle`);
			await onToggleClientStatus?.();

			notify({
				message: isInactive ? "Клиент активирован" : "Клиент деактивирован",
				type: "success",
			});
		} catch (error) {
			notify({
				message: getErrorMessage(error, "Ошибка при изменении статуса клиента"),
				type: "error",
			});
		} finally {
			setPendingAction(null);
		}
	};

	const handleDelete = async (event: MouseEvent<HTMLButtonElement>) => {
		event.stopPropagation();

		if (isPending) return;

		const confirmed = window.confirm("Удалить клиента?");
		if (!confirmed) return;

		setPendingAction("delete");

		try {
			await $backendApi.delete(`clients/${clientId}`);
			await onDeleteClient?.();

			notify({
				message: "Клиент удалён",
				type: "success",
			});
		} catch (error) {
			notify({
				message: getErrorMessage(error, "Ошибка при удалении клиента"),
				type: "error",
			});
		} finally {
			setPendingAction(null);
		}
	};

	return (
		<div style={actionsStyle}>
			<button
				type="button"
				style={{
					...(isInactive ? activateButtonStyle : deactivateButtonStyle),
					...(isPending ? disabledButtonStyle : {}),
				}}
				onClick={handleToggleStatus}
				disabled={isPending}
			>
				{pendingAction === "toggleStatus" ? "..." : statusActionText}
			</button>

			<button
				type="button"
				style={{
					...deleteButtonStyle,
					...(isPending ? disabledButtonStyle : {}),
				}}
				onClick={handleDelete}
				disabled={isPending}
			>
				{pendingAction === "delete" ? "..." : "Удалить"}
			</button>
		</div>
	);
};

const headers: Header<ClientsTable>[] = [
	{ key: "name", title: "Название компании" },
	{ key: "email", title: "Почта клиента" },
	{ key: "status", title: "Статус" },
	{ key: "createdAt", title: "Дата создания" },
	{
		title: "Действия",
		key: "id",
		render: (value, additionalData) => {
			const tableAdditionalData = additionalData as
				| ClientsTableAdditionalData
				| undefined;
			const row = tableAdditionalData?.row;

			return (
				<ClientRowActions
					clientId={String(value)}
					isInactive={row?.status === "inactive"}
					onDeleteClient={tableAdditionalData?.onDeleteClient}
					onToggleClientStatus={tableAdditionalData?.onToggleClientStatus}
				/>
			);
		},
	},
];

export const ClientsTable = ({
	activeItems,
	onDeleteClient,
	onToggleClientStatus,
}: {
	activeItems: ClientsTable[];
	onDeleteClient?: () => Promise<void> | void;
	onToggleClientStatus?: () => Promise<void> | void;
}) => {
	return (
		<div>
			<UniversalTable<ClientsTable>
				activeItems={activeItems}
				additionalData={{
					onDeleteClient,
					onToggleClientStatus,
				}}
				headers={headers}
			/>
		</div>
	);
};
