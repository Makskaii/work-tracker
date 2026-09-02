import { useEffect, useState } from "react";
import Modal from "@/components/modal/Modal";
import type { ClientPackage, PackagePurchase } from "./clientHoursPackages.types";
import styles from "./ClientHoursPackagesPage.module.scss";

export type HoursPackageModalMode = "purchase" | "new-package" | "edit";

type FormValues = {
	clientId: string;
	date: string;
	hours: string;
};

const getInitialValues = (
	clientId: number | null,
	purchase: PackagePurchase | null,
): FormValues => ({
	clientId: String(clientId ?? ""),
	date: purchase?.date ?? new Date().toISOString().slice(0, 10),
	hours: purchase ? String(purchase.hours) : "",
});

export const ClientHoursPackageModal = ({
	clients,
	clientId,
	isOpen,
	mode,
	onClose,
	onSubmit,
	purchase,
}: {
	clients: ClientPackage[];
	clientId: number | null;
	isOpen: boolean;
	mode: HoursPackageModalMode;
	onClose: () => void;
	onSubmit: (values: { clientId: number; date: string; hours: number }) => void;
	purchase: PackagePurchase | null;
}) => {
	const [values, setValues] = useState<FormValues>(
		getInitialValues(clientId, purchase),
	);

	useEffect(() => {
		if (isOpen) {
			setValues(getInitialValues(clientId, purchase));
		}
	}, [clientId, isOpen, mode, purchase]);

	const title =
		mode === "edit"
			? "Изменить пакет"
			: mode === "new-package"
				? "Новый пакет"
				: "Добавить покупку часов";

	const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const hours = Number(values.hours.replace(",", "."));

		if (!values.clientId || !values.date || !Number.isFinite(hours) || hours <= 0) {
			return;
		}

		onSubmit({ clientId: Number(values.clientId), date: values.date, hours });
	};

	return (
		<Modal isOpen={isOpen} onClose={onClose} size="small">
			<form className={styles.packageForm} onSubmit={handleSubmit}>
				<header><h2>{title}</h2><p>Укажите данные пакета часов.</p></header>
				<label>Клиент<select value={values.clientId} disabled={mode !== "purchase"} onChange={(event) => setValues((current) => ({ ...current, clientId: event.target.value }))}><option value="">Выберите клиента</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.client}</option>)}</select></label>
				<label>Дата покупки<input type="date" value={values.date} onChange={(event) => setValues((current) => ({ ...current, date: event.target.value }))} /></label>
				<label>Количество часов<input type="number" min="0.5" step="0.5" value={values.hours} onChange={(event) => setValues((current) => ({ ...current, hours: event.target.value }))} placeholder="Например, 20" /></label>
				<footer><button type="button" onClick={onClose}>Отмена</button><button type="submit">Сохранить</button></footer>
			</form>
		</Modal>
	);
};
