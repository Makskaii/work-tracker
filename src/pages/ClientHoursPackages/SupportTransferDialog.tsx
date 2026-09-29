import { useEffect, useRef, useState } from "react";
import Modal from "@/components/modal/Modal";
import styles from "./ClientHoursPackagesPage.module.scss";
import type {
	SupportTransferCallbacks,
	SupportTransferDraft,
	SupportTransferPreview,
} from "./supportTransfer.model";

const hours = (value: number) =>
	`${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(value)} ч`;
const destination = (id: number | null) =>
	id === null ? "Нераспределённое" : `Пакет №${id}`;

type Props = SupportTransferCallbacks & {
	draft: SupportTransferDraft;
	title: string;
	onClose: () => void;
};
export const SupportTransferDialog = ({
	draft,
	title,
	onClose,
	onPreviewTransfer,
	onTransfer,
}: Props) => {
	const [preview, setPreview] = useState<SupportTransferPreview | null>(null);
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [attempt, setAttempt] = useState(0);
	const savingRef = useRef(false);
	// biome-ignore lint/correctness/useExhaustiveDependencies: attempt explicitly retries the read-only preview after an error.
	useEffect(() => {
		if (!onPreviewTransfer) return;
		let active = true;
		setLoading(true);
		setPreview(null);
		setError(null);
		void onPreviewTransfer(draft)
			.then((result) => {
				if (active) setPreview(result);
			})
			.catch((reason: unknown) => {
				if (active)
					setError(
						reason instanceof Error
							? reason.message
							: "Не удалось рассчитать перенос. Обновите данные и повторите проверку.",
					);
			})
			.finally(() => {
				if (active) setLoading(false);
			});
		return () => {
			active = false;
		};
	}, [draft, onPreviewTransfer, attempt]);
	const close = () => {
		if (!savingRef.current) onClose();
	};
	const save = async () => {
		if (!preview || !onTransfer || savingRef.current) return;
		savingRef.current = true;
		setSaving(true);
		setError(null);
		try {
			await onTransfer(draft, preview.fingerprint);
			onClose();
		} catch (reason) {
			setError(
				reason instanceof Error
					? reason.message
					: "Не удалось подтвердить перенос. Проверьте актуальное распределение перед повторной попыткой.",
			);
		} finally {
			savingRef.current = false;
			setSaving(false);
		}
	};
	return (
		<Modal
			isOpen
			size="small"
			innerScroll
			onClose={close}
			closeOnBackdropClick={!saving}
		>
			<section className={styles.transferDialog}>
				<h2>Перенести работы</h2>
				<p className={styles.transferDialogTitle}>{title}</p>
				<p className={styles.transferRoute}>
					{destination(draft.fromPurchaseId)} <span aria-hidden="true">→</span>{" "}
					{destination(draft.toPurchaseId)}
				</p>
				{loading && (
					<p role="status" className={styles.worklistScope}>
						Проверяем доступные часы и остатки пакетов…
					</p>
				)}
				{error && (
					<p role="alert" className={styles.formError}>
						{error}
					</p>
				)}
				{!onPreviewTransfer && (
					<p className={styles.worklistScope}>
						Предварительный расчёт переноса пока недоступен. Данные не изменены.
					</p>
				)}
				{preview && (
					<>
						<dl className={styles.transferSummary}>
							<div>
								<dt>
									{draft.toPurchaseId === null
										? "Возвращается без пакета"
										: "Будет перенесено в пакет"}
								</dt>
								<dd>{hours(preview.movedHours)}</dd>
							</div>
							{draft.toPurchaseId !== null && preview.unallocatedHours > 0 && (
								<div>
									<dt>Останется без пакета</dt>
									<dd>{hours(preview.unallocatedHours)}</dd>
								</div>
							)}
						</dl>
						{preview.unallocatedHours > 0 && draft.toPurchaseId !== null && (
							<p className={styles.transferCapacityNotice}>
								В пакете не хватает места на все часы. Остаток будет в
								«Нераспределённом».
							</p>
						)}
						{preview.packages.length > 0 && (
							<div className={styles.transferBalancePreview}>
								<strong>Остатки пакетов</strong>
								{preview.packages.map((pkg) => (
									<div key={pkg.id}>
										<span>Пакет №{pkg.id}</span>
										<span>
											{hours(pkg.before.remainingHours)} →{" "}
											<b>{hours(pkg.after.remainingHours)}</b>
										</span>
									</div>
								))}
							</div>
						)}
						{draft.taskId && (
							<p className={styles.worklistScope}>
								{draft.toPurchaseId === null
									? "Привязка задачи к пакету будет снята. Её следующие отчёты появятся в нераспределённом."
									: `Задача будет привязана к пакету №${draft.toPurchaseId}. Новые отчёты по ней будут направляться в этот пакет с учётом его остатка.`}
							</p>
						)}
						<p className={styles.worklistScope}>
							Учёт часов обновится после подтверждения.
						</p>
					</>
				)}
				<div className={styles.transferDialogActions}>
					<button
						type="button"
						className={styles.inlineAction}
						disabled={saving}
						onClick={close}
					>
						Отмена
					</button>
					{error && onPreviewTransfer && (
						<button
							type="button"
							className={styles.packageReportButton}
							disabled={loading || saving}
							onClick={() => setAttempt((value) => value + 1)}
						>
							Проверить заново
						</button>
					)}
					<button
						type="button"
						className={styles.packageReportButton}
						disabled={!preview || loading || saving || !onTransfer}
						onClick={() => void save()}
					>
						{saving ? "Переносим…" : "Подтвердить перенос"}
					</button>
				</div>
			</section>
		</Modal>
	);
};
