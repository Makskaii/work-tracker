import { useEffect, useRef, useState } from "react";
import Modal from "@/components/modal/Modal";
import type {
	PackagePurchase,
	SupportProjectOption,
} from "./clientHoursPackages.types";
import styles from "./ClientHoursPackagesPage.module.scss";
import { PackageImpactPreview } from "./PackageImpactPreview";
import {
	type PackageImpact,
	previewPackageImpact,
	supportErrorMessage,
} from "./supportAnalyst.api";

export type HoursPackageModalMode = "purchase" | "new-package" | "edit";
export type PurchaseFormValues = {
	projectId: number;
	date: string;
	hours: number;
	comment: string | null;
};
type FormValues = {
	projectId: string;
	date: string;
	hours: string;
	comment: string;
};
const today = () =>
	new Intl.DateTimeFormat("en-CA", {
		timeZone: "Europe/Moscow",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(new Date());
const getInitialValues = (
	projectId: number | null,
	purchase: PackagePurchase | null,
): FormValues => ({
	projectId: String(projectId ?? ""),
	date: purchase?.date ?? today(),
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
	onDelete?: (fingerprint: string) => Promise<void>;
	onSubmit: (values: PurchaseFormValues, fingerprint?: string) => Promise<void>;
	purchase: PackagePurchase | null;
}) => {
	const [values, setValues] = useState<FormValues>(
		getInitialValues(projectId, purchase),
	);
	const [pending, setPending] = useState(false);
	const pendingRef = useRef(false);
	const [uncertainCreate, setUncertainCreate] = useState(false);
	const [error, setError] = useState("");
	const [fieldErrors, setFieldErrors] = useState<
		Partial<Record<keyof FormValues, string>>
	>({});
	const [confirmation, setConfirmation] = useState<{
		impact: PackageImpact;
		values?: PurchaseFormValues;
	} | null>(null);
	useEffect(() => {
		if (isOpen) {
			setValues(getInitialValues(projectId, purchase));
			setUncertainCreate(false);
			setConfirmation(null);
			setError("");
			setFieldErrors({});
		}
	}, [projectId, isOpen, purchase]);
	const update = (field: keyof FormValues, value: string) => {
		setValues((current) => ({ ...current, [field]: value }));
		setConfirmation(null);
		setError("");
		setFieldErrors((current) => ({ ...current, [field]: undefined }));
	};
	const run = async (operation: () => Promise<void>) => {
		if (pendingRef.current) return;
		pendingRef.current = true;
		setPending(true);
		setError("");
		try {
			await operation();
		} catch (cause) {
			setConfirmation(null);
			const status =
				cause && typeof cause === "object" && "response" in cause
					? (cause.response as { status?: number } | undefined)?.status
					: undefined;
			const uncertain = mode !== "edit" && (status == null || status >= 500);
			if (uncertain) setUncertainCreate(true);
			setError(
				uncertain
					? "Не удалось подтвердить создание пакета. Закройте форму и обновите данные: пакет мог сохраниться. Проверьте список перед новой попыткой."
					: supportErrorMessage(
							cause,
							"Не удалось сохранить изменения. Повторите попытку.",
						),
			);
		} finally {
			pendingRef.current = false;
			setPending(false);
		}
	};
	const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (uncertainCreate) return;
		const hours = Number(values.hours.replace(",", "."));
		const errors: Partial<Record<keyof FormValues, string>> = {};
		if (!values.projectId) errors.projectId = "Выберите проект";
		if (!/^\d{4}-\d{2}-\d{2}$/.test(values.date))
			errors.date = "Укажите дату покупки";
		if (
			!values.hours.trim() ||
			!Number.isFinite(hours) ||
			hours <= 0 ||
			Math.abs(hours * 100 - Math.round(hours * 100)) > 0.00001
		)
			errors.hours =
				"Укажите положительное число часов, не более двух знаков после запятой";
		if (values.comment.length > 1000) errors.comment = "Не более 1000 символов";
		setFieldErrors(errors);
		if (Object.keys(errors).length) return;
		const submitted = {
			projectId: Number(values.projectId),
			date: values.date,
			hours,
			comment: values.comment.trim() || null,
		};
		void run(async () => {
			if (mode === "edit" && purchase) {
				const impact = await previewPackageImpact(purchase.id, "update", {
					purchasedHours: hours,
					purchaseDate: values.date,
					comment: submitted.comment,
				});
				if (impact.requiresConfirmation) {
					setConfirmation({ impact, values: submitted });
					return;
				}
				await onSubmit(submitted, impact.fingerprint);
			} else await onSubmit(submitted);
		});
	};
	const confirm = () =>
		void run(async () => {
			if (!confirmation) return;
			if (confirmation.impact.operation === "delete")
				await onDelete?.(confirmation.impact.fingerprint);
			else if (confirmation.values)
				await onSubmit(confirmation.values, confirmation.impact.fingerprint);
		});
	return (
		<Modal
			isOpen={isOpen}
			onClose={() => {
				if (!pendingRef.current) onClose();
			}}
			size="small"
			innerScroll
			closeOnBackdropClick={!pending}
		>
			<form
				className={styles.packageForm}
				onSubmit={handleSubmit}
				noValidate
				aria-busy={pending}
			>
				<header>
					<h2>
						{mode === "edit"
							? "Изменить пакет"
							: mode === "new-package"
								? "Новый пакет"
								: "Добавить покупку часов"}
					</h2>
					<p>Списания распределяются по пакетам автоматически.</p>
				</header>
				<label>
					Проект
					<select
						value={values.projectId}
						disabled={pending || mode !== "purchase"}
						onChange={(event) => update("projectId", event.target.value)}
						aria-invalid={!!fieldErrors.projectId}
					>
						<option value="">Выберите техпод-проект</option>
						{projects.map((project) => (
							<option key={project.id} value={project.id}>
								{project.title}
							</option>
						))}
					</select>
					{fieldErrors.projectId && (
						<span className={styles.formError}>{fieldErrors.projectId}</span>
					)}
				</label>
				<label>
					Дата покупки
					<input
						type="date"
						value={values.date}
						disabled={pending}
						onChange={(event) => update("date", event.target.value)}
						aria-invalid={!!fieldErrors.date}
					/>
					{fieldErrors.date && (
						<span className={styles.formError}>{fieldErrors.date}</span>
					)}
				</label>
				<label>
					Количество часов
					<input
						type="text"
						inputMode="decimal"
						value={values.hours}
						disabled={pending}
						onChange={(event) => update("hours", event.target.value)}
						aria-invalid={!!fieldErrors.hours}
					/>
					{fieldErrors.hours && (
						<span className={styles.formError}>{fieldErrors.hours}</span>
					)}
				</label>
				<label>
					Комментарий
					<textarea
						value={values.comment}
						disabled={pending}
						maxLength={1000}
						onChange={(event) => update("comment", event.target.value)}
						aria-invalid={!!fieldErrors.comment}
					/>
					{fieldErrors.comment && (
						<span className={styles.formError}>{fieldErrors.comment}</span>
					)}
				</label>
				{error && (
					<p className={styles.formError} role="alert">
						{error}
					</p>
				)}
				{confirmation ? (
					<section
						className={styles.deletePackageConfirmation}
						role="alertdialog"
						aria-label="Подтверждение изменения пакета"
					>
						<strong>
							{confirmation.impact.operation === "delete"
								? "Удалить пакет часов?"
								: "Сохранить изменения пакета?"}
						</strong>
						<PackageImpactPreview impact={confirmation.impact} />
						<div>
							<button
								type="button"
								disabled={pending}
								onClick={() => setConfirmation(null)}
							>
								Назад
							</button>
							<button type="button" disabled={pending} onClick={confirm}>
								{pending
									? "Сохраняем…"
									: confirmation.impact.operation === "delete"
										? "Удалить пакет"
										: "Сохранить изменения"}
							</button>
						</div>
					</section>
				) : (
					<footer>
						{mode === "edit" && onDelete && purchase && (
							<button
								className={styles.deletePackageButton}
								type="button"
								disabled={pending}
								onClick={() =>
									void run(async () =>
										setConfirmation({
											impact: await previewPackageImpact(purchase.id, "delete"),
										}),
									)
								}
							>
								Удалить
							</button>
						)}
						<button type="button" disabled={pending} onClick={onClose}>
							Отмена
						</button>
						<button type="submit" disabled={pending || uncertainCreate}>
							{pending ? "Проверяем…" : "Сохранить"}
						</button>
					</footer>
				)}
			</form>
		</Modal>
	);
};
