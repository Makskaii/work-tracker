import { useEffect, useState } from "react";
import Modal from "@/components/modal/Modal";
import type { PackagePurchase, SupportProjectOption } from "./clientHoursPackages.types";
import styles from "./ClientHoursPackagesPage.module.scss";

export type HoursPackageModalMode = "purchase" | "new-package" | "edit";

type FormValues = {
	projectId: string;
	date: string;
	hours: string;
	comment: string;
};

const getInitialValues = (
	projectId: number | null,
	purchase: PackagePurchase | null,
): FormValues => ({
	projectId: String(projectId ?? ""),
	date: purchase?.date ?? new Date().toISOString().slice(0, 10),
	hours: purchase ? String(purchase.hours) : "",
	comment: purchase?.comment ?? "",
});

export const ClientHoursPackageModal = ({
	projects,
	projectId,
	isOpen,
	mode,
	onClose,
	onDelete,
	onSubmit,
	purchase,
}: {
	projects: SupportProjectOption[];
	projectId: number | null;
	isOpen: boolean;
	mode: HoursPackageModalMode;
	onClose: () => void;
	onDelete?: () => void;
	onSubmit: (values: { projectId: number; date: string; hours: number; comment?: string }) => void;
	purchase: PackagePurchase | null;
}) => {
	const [values, setValues] = useState<FormValues>(
		getInitialValues(projectId, purchase),
	);

	useEffect(() => {
		if (isOpen) {
			setValues(getInitialValues(projectId, purchase));
		}
	}, [projectId, isOpen, purchase]);

	const title =
		mode === "edit"
			? "Изменить пакет"
			: mode === "new-package"
				? "Новый пакет"
				: "Добавить покупку часов";

	const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const hours = Number(values.hours.replace(",", "."));

		if (!values.projectId || !values.date || !Number.isFinite(hours) || hours <= 0) {
			return;
		}

		onSubmit({ projectId: Number(values.projectId), date: values.date, hours, comment: values.comment.trim() || undefined });
	};

	return (
		<Modal isOpen={isOpen} onClose={onClose} size="small">
			<form className={styles.packageForm} onSubmit={handleSubmit}>
				<header><h2>{title}</h2><p>Укажите данные пакета часов.</p></header>
				<label>Проект<select value={values.projectId} disabled={mode !== "purchase"} onChange={(event) => setValues((current) => ({ ...current, projectId: event.target.value }))}><option value="">Выберите техпод-проект</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label>
				<label>Дата покупки<input type="date" value={values.date} onChange={(event) => setValues((current) => ({ ...current, date: event.target.value }))} /></label>
				<label>Количество часов<input type="number" min="0.5" step="0.5" value={values.hours} onChange={(event) => setValues((current) => ({ ...current, hours: event.target.value }))}/></label>
				<label>Комментарий<textarea value={values.comment} onChange={(event) => setValues((current) => ({ ...current, comment: event.target.value }))} /></label>
				<footer>{mode === "edit" && onDelete ? <button type="button" onClick={onDelete}>Удалить</button> : null}<button type="button" onClick={onClose}>Отмена</button><button type="submit">Сохранить</button></footer>
			</form>
		</Modal>
	);
};
