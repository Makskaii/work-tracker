import {
	type CSSProperties,
	type MouseEvent,
	useEffect,
	useState,
} from "react";
import { useForm } from "react-hook-form";
import Modal from "@/components/modal/Modal";
import { UniversalTable } from "@/components/Table/universalTable/UniversalTable";
import { $backendApi } from "@/shared/config/axios/axios.config";
import type { Header } from "@/shared/types/table";
import { notify } from "@/shared/ui/NotificationPopup/notify";
import { convertToDate } from "@/shared/utils";
import { ClientHoursPaymentsModal } from "./ClientHoursPaymentsModal";

export type ClientsTable = {
	id: string;
	name: string;
	email: string;
	crmClientId?: null | number | string;
	status: string;
	createdAt: string;
	purchasedHours: null | number;
	lastLogin: string;
};

type ClientAction = "delete";

type UpdateClientFormValues = {
	name: string;
	email: string;
	crmId: string;
	status: string;
	purchasedHours: string;
};

type UpdateClientPayload = {
	name: string;
	email: string;
	crmId?: number;
	status: string;
	purchasedHours: number | null;
};

type ClientsTableAdditionalData = {
	row?: ClientsTable;
	onEditClient?: (client: ClientsTable) => void;
	onDeleteClient?: () => Promise<void> | void;
	onOpenPayments?: (client: ClientsTable) => void;
};

type ClientRowActionsProps = {
	client: ClientsTable;
	onEditClient?: (client: ClientsTable) => void;
	onDeleteClient?: () => Promise<void> | void;
	onOpenPayments?: (client: ClientsTable) => void;
};

const actionsStyle: CSSProperties = {
	display: "flex",
	gap: "0.5rem",
	flexWrap: "wrap",
	justifyContent: "center",
	alignItems: "center",
};

const baseButtonStyle: CSSProperties = {
	border: "1px solid var(--color-border)",
	borderRadius: "8px",
	padding: "0.4rem 0.7rem",
	fontSize: "0.82rem",
	fontWeight: 600,
	cursor: "pointer",
	whiteSpace: "nowrap",
	transition: "transform 0.15s ease, opacity 0.15s ease",
};

const editButtonStyle: CSSProperties = {
	...baseButtonStyle,
	background: "#063d43",
	color: "var(--color-accent)",
	border: "1px solid var(--color-accent)",
};

const deleteButtonStyle: CSSProperties = {
	...baseButtonStyle,
	background: "rgba(239, 68, 68, 0.12)",
	color: "#b91c1c",
	border: "1px solid rgba(239, 68, 68, 0.26)",
};

const formStyle: CSSProperties = {
	display: "flex",
	flexDirection: "column",
	gap: "0.85rem",
};

const fieldStyle: CSSProperties = {
	display: "flex",
	flexDirection: "column",
	gap: "0.35rem",
};

const labelStyle: CSSProperties = {
	fontSize: "0.85rem",
	fontWeight: 700,
	color: "var(--color-text)",
};

const inputStyle: CSSProperties = {
	border: "1px solid var(--color-border)",
	borderRadius: "8px",
	padding: "0.65rem 0.75rem",
	fontSize: "0.95rem",
	color: "var(--color-text)",
	background: "var(--color-surface-soft)",
};

const errorTextStyle: CSSProperties = {
	margin: 0,
	color: "#dc2626",
	fontSize: "0.78rem",
};

const modalActionsStyle: CSSProperties = {
	display: "flex",
	justifyContent: "flex-end",
	gap: "0.75rem",
	marginTop: "0.5rem",
};

const cancelButtonStyle: CSSProperties = {
	...baseButtonStyle,
	background: "#102036",
	color: "var(--color-text)",
	border: "1px solid var(--color-border)",
};

const saveButtonStyle: CSSProperties = {
	...baseButtonStyle,
	background: "#063d43",
	color: "var(--color-accent)",
	border: "1px solid var(--color-accent)",
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

const getClientCrmId = (client: ClientsTable) => {
	return client.crmClientId == null ? "" : String(client.crmClientId);
};

const ClientRowActions = ({
	client,
	onEditClient,
	onDeleteClient,
	onOpenPayments,
}: ClientRowActionsProps) => {
	const [pendingAction, setPendingAction] = useState<ClientAction | null>(null);
	const isPending = pendingAction !== null;

	const handleEdit = (event: MouseEvent<HTMLButtonElement>) => {
		event.stopPropagation();

		if (isPending) return;

		onEditClient?.(client);
	};

	const handleOpenPayments = (event: MouseEvent<HTMLButtonElement>) => {
		event.stopPropagation();

		if (isPending) return;

		onOpenPayments?.(client);
	};

	const handleDelete = async (event: MouseEvent<HTMLButtonElement>) => {
		event.stopPropagation();

		if (isPending) return;

		const confirmed = window.confirm("Удалить клиента?");
		if (!confirmed) return;

		setPendingAction("delete");

		try {
			await $backendApi.delete(`clients/${client.id}`);
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
					...editButtonStyle,
					...(isPending ? disabledButtonStyle : {}),
				}}
				onClick={handleOpenPayments}
				disabled={isPending}
			>
				Оплаты
			</button>

			<button
				type="button"
				style={{
					...editButtonStyle,
					...(isPending ? disabledButtonStyle : {}),
				}}
				onClick={handleEdit}
				disabled={isPending}
			>
				Редактировать
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

const EditClientModal = ({
	client,
	onClose,
	onClientUpdated,
}: {
	client: ClientsTable | null;
	onClose: () => void;
	onClientUpdated?: () => Promise<void> | void;
}) => {
	const [isSaving, setIsSaving] = useState(false);
	const {
		handleSubmit,
		register,
		reset,
		formState: { errors },
	} = useForm<UpdateClientFormValues>({
		mode: "onChange",
		reValidateMode: "onChange",
	});

	useEffect(() => {
		if (!client) return;

		reset({
			name: client.name ?? "",
			email: client.email ?? "",
			crmId: getClientCrmId(client),
			status: client.status ?? "active",
			purchasedHours:
				client.purchasedHours === null ? "" : String(client.purchasedHours),
		});
	}, [client, reset]);

	const onSubmit = handleSubmit(async (data) => {
		if (!client) return;

		const crmId = data.crmId.trim();
		const purchasedHours = data.purchasedHours.trim().replace(",", ".");
		const payload: UpdateClientPayload = {
			name: data.name.trim(),
			email: data.email.trim(),
			status: data.status,
			purchasedHours: purchasedHours === "" ? null : Number(purchasedHours),
		};

		if (crmId) {
			payload.crmId = Number(crmId);
		}

		setIsSaving(true);

		try {
			await $backendApi.patch(`clients/${client.id}`, payload);
			await onClientUpdated?.();

			notify({
				message: "Клиент обновлён",
				type: "success",
			});
			onClose();
		} catch (error) {
			notify({
				message: getErrorMessage(error, "Ошибка при обновлении клиента"),
				type: "error",
			});
		} finally {
			setIsSaving(false);
		}
	});

	return (
		<Modal
			isOpen={Boolean(client)}
			onClose={onClose}
			closeOnBackdropClick={false}
		>
			<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
				<h2 style={{ margin: 0, paddingRight: "2rem" }}>
					Редактирование клиента
				</h2>

				<form id="edit-client-form" onSubmit={onSubmit} style={formStyle}>
					<label style={fieldStyle}>
						<span style={labelStyle}>Название компании</span>
						<input
							{...register("name", {
								required: "Обязательное поле",
								validate: (value) =>
									value.trim().length > 0 || "Название не может быть пустым",
							})}
							style={inputStyle}
							type="text"
							autoComplete="off"
						/>
						{errors.name && <p style={errorTextStyle}>{errors.name.message}</p>}
					</label>

					<label style={fieldStyle}>
						<span style={labelStyle}>Эл. почта</span>
						<input
							{...register("email", {
								required: "Обязательное поле",
								pattern: {
									value: /^\S+@\S+\.\S+$/,
									message: "Неверный формат email",
								},
							})}
							style={inputStyle}
							type="email"
							autoComplete="off"
						/>
						{errors.email && (
							<p style={errorTextStyle}>{errors.email.message}</p>
						)}
					</label>

					<label style={fieldStyle}>
						<span style={labelStyle}>Статус</span>
						<select {...register("status")} style={inputStyle}>
							<option value="active">active</option>
							<option value="inactive">inactive</option>
						</select>
					</label>

					<label style={fieldStyle}>
						<span style={labelStyle}>Купленные часы</span>
						<input
							{...register("purchasedHours", {
								validate: (value) => {
									const preparedValue = value.trim().replace(",", ".");

									if (preparedValue === "") return true;

									const decimalPart = preparedValue.split(".")[1];
									const hours = Number(preparedValue);

									if (Number.isNaN(hours) || hours < 0) {
										return "Введите число от 0";
									}

									if ((decimalPart?.length ?? 0) > 2) {
										return "Максимум 2 знака после запятой";
									}

									return true;
								},
							})}
							style={inputStyle}
							type="text"
							inputMode="decimal"
							placeholder="Без часов"
							autoComplete="off"
						/>
						{errors.purchasedHours && (
							<p style={errorTextStyle}>{errors.purchasedHours.message}</p>
						)}
					</label>

					<div style={modalActionsStyle}>
						<button
							type="button"
							style={cancelButtonStyle}
							onClick={onClose}
							disabled={isSaving}
						>
							Отмена
						</button>

						<button
							type="submit"
							style={{
								...saveButtonStyle,
								...(isSaving ? disabledButtonStyle : {}),
							}}
							disabled={isSaving}
						>
							{isSaving ? "Сохранение..." : "Сохранить"}
						</button>
					</div>
				</form>
			</div>
		</Modal>
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
		render: (_value, additionalData) => {
			const tableAdditionalData = additionalData as
				| ClientsTableAdditionalData
				| undefined;
			const row = tableAdditionalData?.row;

			if (!row) return null;

			return (
				<ClientRowActions
					client={row}
					onEditClient={tableAdditionalData?.onEditClient}
					onDeleteClient={tableAdditionalData?.onDeleteClient}
					onOpenPayments={tableAdditionalData?.onOpenPayments}
				/>
			);
		},
	},
];

export const ClientsTable = ({
	activeItems,
	onDeleteClient,
	onClientUpdated,
}: {
	activeItems: ClientsTable[];
	onDeleteClient?: () => Promise<void> | void;
	onClientUpdated?: () => Promise<void> | void;
}) => {
	const [editingClient, setEditingClient] = useState<ClientsTable | null>(null);
	const [paymentsClient, setPaymentsClient] = useState<ClientsTable | null>(null);

	return (
		<div>
			<UniversalTable<ClientsTable>
				activeItems={activeItems}
				additionalData={{
					onEditClient: setEditingClient,
					onDeleteClient,
					onOpenPayments: setPaymentsClient,
				}}
				headers={headers}
			/>

			<EditClientModal
				client={editingClient}
				onClose={() => setEditingClient(null)}
				onClientUpdated={onClientUpdated}
			/>

			<ClientHoursPaymentsModal
				client={paymentsClient}
				onClose={() => setPaymentsClient(null)}
				onClientUpdated={onClientUpdated}
			/>
		</div>
	);
};
