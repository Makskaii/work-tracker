import { type CSSProperties, useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import Modal from "@/components/modal/Modal";
import { $backendApi } from "@/shared/config/axios/axios.config";
import { notify } from "@/shared/ui/NotificationPopup/notify";
import { convertToDate } from "@/shared/utils";
import type { ClientsTable as ClientRow } from "./ClientsTable";

type ClientHoursPayment = {
	id: number;
	clientId: number;
	type: "added" | "removed";
	hours: number;
	amount: number | null;
	balanceAfter: number;
	date: string | null;
	comment: string | null;
	createdAt: string;
};

type PurchaseHoursFormValues = {
	date: string;
	hours: string;
	amount: string;
	comment: string;
};

const baseButtonStyle: CSSProperties = {
	border: "1px solid var(--color-border)",
	borderRadius: "8px",
	padding: "0.45rem 0.8rem",
	fontSize: "0.84rem",
	fontWeight: 700,
	cursor: "pointer",
	whiteSpace: "nowrap",
};

const primaryButtonStyle: CSSProperties = {
	...baseButtonStyle,
	background: "#063d43",
	color: "var(--color-accent)",
	border: "1px solid var(--color-accent)",
};

const dangerButtonStyle: CSSProperties = {
	...baseButtonStyle,
	background: "rgba(239, 68, 68, 0.12)",
	color: "#ef4444",
	border: "1px solid rgba(239, 68, 68, 0.26)",
};

const inputStyle: CSSProperties = {
	border: "1px solid var(--color-border)",
	borderRadius: "8px",
	padding: "0.65rem 0.75rem",
	fontSize: "0.95rem",
	color: "var(--color-text)",
	background: "var(--color-surface-soft)",
};

const getErrorMessage = (error: unknown, fallbackMessage: string) => {
	const responseData =
		typeof error === "object" && error && "response" in error
			? (error as { response?: { data?: { message?: unknown } } }).response?.data
			: null;
	const message = responseData?.message;

	if (Array.isArray(message)) {
		return message.filter(Boolean).join("\n") || fallbackMessage;
	}

	if (typeof message === "string" && message.trim()) {
		return message;
	}

	if (error instanceof Error && error.message) {
		return error.message;
	}

	return fallbackMessage;
};

const formatNumber = (value: number | null | undefined) => {
	if (value === null || value === undefined) return "-";

	return new Intl.NumberFormat("ru-RU", {
		maximumFractionDigits: 2,
		minimumFractionDigits: 0,
	}).format(value);
};

const formatMoney = (value: number | null | undefined) => {
	if (value === null || value === undefined) return "-";

	return `${formatNumber(value)} ₽`;
};

const normalizeDecimal = (value: string) => value.trim().replace(",", ".");

export const ClientHoursPaymentsModal = ({
	client,
	onClose,
	onClientUpdated,
}: {
	client: ClientRow | null;
	onClose: () => void;
	onClientUpdated?: () => Promise<void> | void;
}) => {
	const [payments, setPayments] = useState<ClientHoursPayment[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
	const [pendingPaymentId, setPendingPaymentId] = useState<number | null>(null);
	const {
		formState: { errors, isSubmitting },
		handleSubmit,
		register,
		reset,
	} = useForm<PurchaseHoursFormValues>({
		mode: "onChange",
		reValidateMode: "onChange",
		defaultValues: {
			amount: "",
			comment: "",
			date: new Date().toISOString().slice(0, 10),
			hours: "",
		},
	});
	const purchasePayments = payments.filter((payment) => payment.type === "added");

	const fetchPayments = useCallback(async () => {
		if (!client) return;

		setIsLoading(true);

		try {
			const response = await $backendApi.get<ClientHoursPayment[]>(
				`clients/${client.id}/purchased-hours/events`,
			);
			setPayments(response.data);
		} catch (error) {
			notify({
				message: getErrorMessage(error, "Не удалось загрузить оплаты часов"),
				type: "error",
			});
		} finally {
			setIsLoading(false);
		}
	}, [client]);

	useEffect(() => {
		if (!client) {
			setPayments([]);
			return;
		}

		void fetchPayments();
	}, [client, fetchPayments]);

	const handleCreatePayment = handleSubmit(async (data) => {
		if (!client) return;

		try {
			await $backendApi.post(`clients/${client.id}/purchased-hours`, {
				amount: Number(normalizeDecimal(data.amount)),
				comment: data.comment.trim() || undefined,
				date: data.date,
				hours: Number(normalizeDecimal(data.hours)),
			});
			reset({
				amount: "",
				comment: "",
				date: new Date().toISOString().slice(0, 10),
				hours: "",
			});
			setIsPurchaseModalOpen(false);
			await fetchPayments();
			await onClientUpdated?.();
			notify({
				message: "Оплата часов добавлена",
				type: "success",
			});
		} catch (error) {
			notify({
				message: getErrorMessage(error, "Не удалось добавить оплату часов"),
				type: "error",
			});
		}
	});

	const handleDeletePayment = async (payment: ClientHoursPayment) => {
		if (!client || pendingPaymentId) return;

		const confirmed = window.confirm("Удалить оплату часов?");
		if (!confirmed) return;

		setPendingPaymentId(payment.id);

		try {
			await $backendApi.delete(
				`clients/${client.id}/purchased-hours/events/${payment.id}`,
			);
			await fetchPayments();
			await onClientUpdated?.();
			notify({
				message: "Оплата часов удалена",
				type: "success",
			});
		} catch (error) {
			notify({
				message: getErrorMessage(error, "Не удалось удалить оплату часов"),
				type: "error",
			});
		} finally {
			setPendingPaymentId(null);
		}
	};

	return (
		<>
			<Modal
				isOpen={Boolean(client)}
				onClose={onClose}
				closeOnBackdropClick={false}
				size="covered"
			>
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: "1rem",
						height: "100%",
						minWidth: "min(86vw, 1100px)",
					}}
				>
					<div
						style={{
							alignItems: "center",
							display: "flex",
							gap: "1rem",
							justifyContent: "space-between",
							paddingRight: "2.5rem",
						}}
					>
						<div>
							<h2 style={{ margin: 0 }}>Оплаты часов</h2>
							<p style={{ color: "var(--color-muted)", margin: "0.35rem 0 0" }}>
								{client?.name}
							</p>
						</div>

						<button
							type="button"
							style={primaryButtonStyle}
							onClick={() => setIsPurchaseModalOpen(true)}
						>
							Купить часы
						</button>
					</div>

					<div style={{ flex: 1, overflow: "auto" }}>
						<table
							style={{
								borderCollapse: "collapse",
								minWidth: "720px",
								width: "100%",
							}}
						>
							<thead>
								<tr>
									{["Дата", "Часы", "Сумма", "Баланс", "Комментарий", ""].map(
										(title) => (
											<th
												key={title}
												style={{
													background: "#102036",
													borderBottom: "1px solid var(--color-border)",
													color: "var(--color-text)",
													padding: "0.75rem",
													textAlign: "left",
												}}
											>
												{title}
											</th>
										),
									)}
								</tr>
							</thead>
							<tbody>
								{purchasePayments.map((payment) => (
									<tr key={payment.id}>
										<td style={{ borderBottom: "1px solid var(--color-border)", padding: "0.75rem" }}>
											{payment.date ? convertToDate(payment.date) : convertToDate(payment.createdAt)}
										</td>
										<td style={{ borderBottom: "1px solid var(--color-border)", padding: "0.75rem" }}>
											{formatNumber(payment.hours)}
										</td>
										<td style={{ borderBottom: "1px solid var(--color-border)", padding: "0.75rem" }}>
											{formatMoney(payment.amount)}
										</td>
										<td style={{ borderBottom: "1px solid var(--color-border)", padding: "0.75rem" }}>
											{formatNumber(payment.balanceAfter)}
										</td>
										<td style={{ borderBottom: "1px solid var(--color-border)", padding: "0.75rem" }}>
											{payment.comment || "-"}
										</td>
										<td style={{ borderBottom: "1px solid var(--color-border)", padding: "0.75rem", textAlign: "right" }}>
											<button
												type="button"
												style={dangerButtonStyle}
												onClick={() => handleDeletePayment(payment)}
												disabled={pendingPaymentId === payment.id}
											>
												{pendingPaymentId === payment.id ? "..." : "Удалить"}
											</button>
										</td>
									</tr>
								))}
								{!purchasePayments.length && (
									<tr>
										<td
											colSpan={6}
											style={{
												color: "var(--color-muted)",
												padding: "1.25rem",
												textAlign: "center",
											}}
										>
											{isLoading ? "Загрузка..." : "Оплат пока нет"}
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>
				</div>
			</Modal>

			<Modal
				isOpen={isPurchaseModalOpen}
				onClose={() => setIsPurchaseModalOpen(false)}
				closeOnBackdropClick={false}
			>
				<form
					onSubmit={handleCreatePayment}
					style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}
				>
					<h2 style={{ margin: 0, paddingRight: "2rem" }}>Купить часы</h2>

					<label style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
						<span>Дата</span>
						<input
							{...register("date", { required: "Укажите дату" })}
							style={inputStyle}
							type="date"
						/>
						{errors.date && <span style={{ color: "#ef4444" }}>{errors.date.message}</span>}
					</label>

					<label style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
						<span>Часы</span>
						<input
							{...register("hours", {
								required: "Укажите часы",
								validate: (value) => {
									const hours = Number(normalizeDecimal(value));
									return hours > 0 || "Введите число больше 0";
								},
							})}
							style={inputStyle}
							type="text"
							inputMode="decimal"
							autoComplete="off"
						/>
						{errors.hours && <span style={{ color: "#ef4444" }}>{errors.hours.message}</span>}
					</label>

					<label style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
						<span>Сумма</span>
						<input
							{...register("amount", {
								required: "Укажите сумму",
								validate: (value) => {
									const amount = Number(normalizeDecimal(value));
									return amount >= 0 || "Введите число от 0";
								},
							})}
							style={inputStyle}
							type="text"
							inputMode="decimal"
							autoComplete="off"
						/>
						{errors.amount && <span style={{ color: "#ef4444" }}>{errors.amount.message}</span>}
					</label>

					<label style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
						<span>Комментарий</span>
						<textarea
							{...register("comment")}
							style={{
								...inputStyle,
								minHeight: "150px",
								resize: "vertical",
							}}
						/>
					</label>

					<div
						style={{
							display: "flex",
							gap: "0.75rem",
							justifyContent: "flex-end",
							marginTop: "0.35rem",
						}}
					>
						<button
							type="button"
							style={baseButtonStyle}
							onClick={() => setIsPurchaseModalOpen(false)}
							disabled={isSubmitting}
						>
							Отмена
						</button>
						<button type="submit" style={primaryButtonStyle} disabled={isSubmitting}>
							{isSubmitting ? "Сохранение..." : "Сохранить"}
						</button>
					</div>
				</form>
			</Modal>
		</>
	);
};
