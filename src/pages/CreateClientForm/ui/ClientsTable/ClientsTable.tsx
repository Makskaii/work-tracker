import { type CSSProperties, type MouseEvent, useState } from "react";
import { UniversalTable } from "@/components/Table/universalTable/UniversalTable";
import { $backendApi } from "@/shared/config/axios/axios.config";
import type { Header } from "@/shared/types/table";
import { notify } from "@/shared/ui/NotificationPopup/notify";
import { convertToDate } from "@/shared/utils";

export type ClientsTable = {
	id: string;
	name: string;
	email: string;
	status: string;
	createdAt: string;
	purchasedHours: null | number;
	lastLogin: string;
};

type ClientAction = "toggleStatus" | "delete" | "addHours" | "removeHours";

type ClientsTableAdditionalData = {
	row?: ClientsTable;
	onDeleteClient?: () => Promise<void> | void;
	onToggleClientStatus?: () => Promise<void> | void;
	onPurchasedHoursChanged?: () => Promise<void> | void;
};

type ClientRowActionsProps = {
	clientId: string;
	isInactive?: boolean;
	purchasedHours?: null | number;
	onDeleteClient?: () => Promise<void> | void;
	onToggleClientStatus?: () => Promise<void> | void;
	onPurchasedHoursChanged?: () => Promise<void> | void;
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

const addHoursButtonStyle: CSSProperties = {
	...baseButtonStyle,
	background: "rgba(37, 99, 235, 0.12)",
	color: "#1d4ed8",
	border: "1px solid rgba(37, 99, 235, 0.26)",
};

const removeHoursButtonStyle: CSSProperties = {
	...baseButtonStyle,
	background: "rgba(124, 58, 237, 0.12)",
	color: "#6d28d9",
	border: "1px solid rgba(124, 58, 237, 0.26)",
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

const preparePurchasedHoursPayload = (
	actionText: string,
	currentPurchasedHours?: null | number,
) => {
	const hoursInput = window.prompt(`Сколько часов ${actionText}?`);
	if (hoursInput === null) return null;

	const normalizedHoursInput = hoursInput.trim().replace(",", ".");
	const hours = Number(normalizedHoursInput);
	const decimalPart = normalizedHoursInput.split(".")[1];

	if (
		!normalizedHoursInput ||
		Number.isNaN(hours) ||
		hours < 0.01 ||
		(decimalPart?.length ?? 0) > 2
	) {
		notify({
			message: "Введите число от 0.01, максимум с двумя знаками после запятой",
			type: "error",
		});
		return null;
	}

	if (
		currentPurchasedHours !== undefined &&
		hours > (currentPurchasedHours ?? 0)
	) {
		notify({
			message: "Нельзя удалить больше часов, чем сейчас куплено",
			type: "error",
		});
		return null;
	}

	const comment = window.prompt(
		"Комментарий к изменению часов (необязательно)",
	);

	return {
		hours,
		...(comment?.trim() ? { comment: comment.trim() } : {}),
	};
};

const ClientRowActions = ({
	clientId,
	isInactive,
	purchasedHours,
	onDeleteClient,
	onToggleClientStatus,
	onPurchasedHoursChanged,
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

	const handleAddPurchasedHours = async (
		event: MouseEvent<HTMLButtonElement>,
	) => {
		event.stopPropagation();

		if (isPending) return;

		const payload = preparePurchasedHoursPayload("добавить");
		if (!payload) return;

		setPendingAction("addHours");

		try {
			await $backendApi.post(`clients/${clientId}/purchased-hours`, payload);
			await onPurchasedHoursChanged?.();

			notify({
				message: "Часы добавлены",
				type: "success",
			});
		} catch (error) {
			notify({
				message: getErrorMessage(error, "Ошибка при добавлении часов"),
				type: "error",
			});
		} finally {
			setPendingAction(null);
		}
	};

	const handleRemovePurchasedHours = async (
		event: MouseEvent<HTMLButtonElement>,
	) => {
		event.stopPropagation();

		if (isPending) return;

		const payload = preparePurchasedHoursPayload("удалить", purchasedHours);
		if (!payload) return;

		setPendingAction("removeHours");

		try {
			await $backendApi.delete(`clients/${clientId}/purchased-hours`, {
				data: payload,
			});
			await onPurchasedHoursChanged?.();

			notify({
				message: "Часы удалены",
				type: "success",
			});
		} catch (error) {
			notify({
				message: getErrorMessage(error, "Ошибка при удалении часов"),
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
					...addHoursButtonStyle,
					...(isPending ? disabledButtonStyle : {}),
				}}
				onClick={handleAddPurchasedHours}
				disabled={isPending}
			>
				{pendingAction === "addHours" ? "..." : "+ часы"}
			</button>

			<button
				type="button"
				style={{
					...removeHoursButtonStyle,
					...(isPending ? disabledButtonStyle : {}),
				}}
				onClick={handleRemovePurchasedHours}
				disabled={isPending}
			>
				{pendingAction === "removeHours" ? "..." : "- часы"}
			</button>

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
	{
		key: "purchasedHours",
		title: "Часы",
		convertFn: (value) => {
			if (value === null) return "-";

			return value;
		},
	},
	{
		key: "lastLogin",
		title: "Последний логин",
		convertFn: (value) => {
			return convertToDate(value);
		},
	},
	{
		key: "createdAt",
		title: "Дата создания",
		convertFn: (value) => {
			return convertToDate(value);
		},
	},
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
					purchasedHours={row?.purchasedHours}
					onDeleteClient={tableAdditionalData?.onDeleteClient}
					onToggleClientStatus={tableAdditionalData?.onToggleClientStatus}
					onPurchasedHoursChanged={tableAdditionalData?.onPurchasedHoursChanged}
				/>
			);
		},
	},
];

export const ClientsTable = ({
	activeItems,
	onDeleteClient,
	onToggleClientStatus,
	onPurchasedHoursChanged,
}: {
	activeItems: ClientsTable[];
	onDeleteClient?: () => Promise<void> | void;
	onToggleClientStatus?: () => Promise<void> | void;
	onPurchasedHoursChanged?: () => Promise<void> | void;
}) => {
	return (
		<div>
			<UniversalTable<ClientsTable>
				activeItems={activeItems}
				additionalData={{
					onDeleteClient,
					onToggleClientStatus,
					onPurchasedHoursChanged,
				}}
				headers={headers}
			/>
		</div>
	);
};
