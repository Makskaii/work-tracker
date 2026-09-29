import { useCallback, useEffect, useRef, useState } from "react";
import { FiDownload, FiExternalLink, FiSave } from "react-icons/fi";
import { useBitrixSlider } from "@/shared/hooks/useBitrixSlider";
import { notify } from "@/shared/ui/NotificationPopup/notify";
import { fetchSupportHoursPackageReport } from "./clientHoursPackages.api";
import styles from "./ClientHoursPackagesPage.module.scss";
import {
	downloadSupportPdf,
	downloadSupportReportVersion,
	fetchPackageChecks,
	fetchSupportReportVersions,
	type PackageChecks,
	saveSupportReportVersion,
	type SupportReportVersion,
	supportErrorMessage,
} from "./supportAnalyst.api";

type Props = {
	projectId: number;
	packageId: number | null;
	hasPackages: boolean;
	refreshKey?: number;
	onCardClosed?: () => Promise<void>;
};
export const SupportPackageReportPanel = ({
	projectId,
	packageId,
	hasPackages,
	refreshKey,
	onCardClosed,
}: Props) => {
	const { openTask } = useBitrixSlider();
	const [versions, setVersions] = useState<SupportReportVersion[]>([]);
	const [versionError, setVersionError] = useState("");
	const [versionsLoading, setVersionsLoading] = useState(false);
	const [checks, setChecks] = useState<PackageChecks | null>(null);
	const [pending, setPending] = useState<"download" | "save" | number | null>(
		null,
	);
	const pendingRef = useRef(false);
	const [confirmation, setConfirmation] = useState<"download" | "save" | null>(
		null,
	);
	const requestIds = useRef(new Map<number, string>());
	const generationRef = useRef(0);
	const versionRequestRef = useRef(0);
	const loadVersions = useCallback(
		async (signal?: AbortSignal) => {
			const generation = generationRef.current;
			const request = ++versionRequestRef.current;
			const current = () =>
				!signal?.aborted &&
				generation === generationRef.current &&
				request === versionRequestRef.current;
			setVersionsLoading(true);
			try {
				const data = await fetchSupportReportVersions(
					projectId,
					packageId ?? undefined,
					signal,
				);
				if (current()) {
					setVersions(data);
					setVersionError("");
				}
			} catch {
				if (current())
					setVersionError("Не удалось загрузить сохранённые версии.");
			} finally {
				if (current()) setVersionsLoading(false);
			}
		},
		[projectId, packageId],
	);
	// biome-ignore lint/correctness/useExhaustiveDependencies: refreshing source data invalidates checks and reloads saved versions.
	useEffect(() => {
		const controller = new AbortController();
		generationRef.current += 1;
		setChecks(null);
		setConfirmation(null);
		setVersions([]);
		void loadVersions(controller.signal);
		return () => {
			controller.abort();
			generationRef.current += 1;
		};
	}, [loadVersions, refreshKey]);
	const action = async (kind: "download" | "save", confirmed = false) => {
		if (!packageId || pendingRef.current) return;
		pendingRef.current = true;
		setPending(kind);
		const generation = generationRef.current;
		try {
			const checked = await fetchPackageChecks(packageId);
			if (generation !== generationRef.current) return;
			setChecks(checked);
			if (checked.blocking || (checked.issues.length > 0 && !confirmed)) {
				setConfirmation(kind);
				return;
			}
			setConfirmation(null);
			if (kind === "download")
				downloadSupportPdf(
					await fetchSupportHoursPackageReport(packageId),
					`support-package-${packageId}.pdf`,
				);
			else {
				const storageKey = `support-hours:pending-version:${projectId}:${packageId}`;
				let requestId =
					requestIds.current.get(packageId) ??
					window.sessionStorage.getItem(storageKey);
				if (!requestId) requestId = crypto.randomUUID();
				requestIds.current.set(packageId, requestId);
				window.sessionStorage.setItem(storageKey, requestId);
				const version = await saveSupportReportVersion(packageId, requestId);
				requestIds.current.delete(packageId);
				window.sessionStorage.removeItem(storageKey);
				if (generation === generationRef.current) {
					await loadVersions();
					notify({
						message: `Версия №${version.versionNumber} сохранена. Её PDF больше не изменится.`,
						type: "success",
					});
				}
			}
		} catch (cause) {
			notify({
				message: supportErrorMessage(
					cause,
					kind === "save"
						? "Не удалось подтвердить сохранение версии. Повторная попытка проверит то же сохранение без создания дубля."
						: "Не удалось сформировать отчёт по пакету. Повторите попытку.",
				),
				type: "error",
			});
		} finally {
			pendingRef.current = false;
			setPending(null);
		}
	};
	const downloadVersion = async (version: SupportReportVersion) => {
		if (pendingRef.current) return;
		pendingRef.current = true;
		setPending(version.id);
		try {
			downloadSupportPdf(
				await downloadSupportReportVersion(version.id),
				version.filename,
			);
		} catch {
			notify({
				message: "Не удалось скачать сохранённую версию.",
				type: "error",
			});
		} finally {
			pendingRef.current = false;
			setPending(null);
		}
	};
	return (
		<section
			className={styles.packageReportPanel}
			aria-label="Клиентский отчёт по пакету"
		>
			<div className={styles.reportPanelHeading}>
				<div>
					<h2>Отчёт для клиента</h2>
					<p>
						{packageId
							? "За весь пакет по сегодняшний день"
							: hasPackages
								? "Выберите пакет для отчёта"
								: "Добавьте пакет для отчёта"}
					</p>
				</div>
				<div className={styles.detailsActions}>
					<button
						className={styles.packageReportButton}
						type="button"
						disabled={!packageId || pending !== null}
						aria-busy={pending === "download"}
						onClick={() => void action("download")}
					>
						<FiDownload aria-hidden="true" />
						{pending === "download" ? "Готовим отчёт…" : "Отчёт по пакету"}
					</button>
					<button
						className={styles.packageReportButton}
						type="button"
						disabled={!packageId || pending !== null}
						onClick={() => void action("save")}
					>
						<FiSave aria-hidden="true" />
						{pending === "save" ? "Сохраняем версию…" : "Зафиксировать версию"}
					</button>
				</div>
			</div>
			{checks && (
				<div
					className={
						checks.issues.length ? styles.reportChecks : styles.checksSuccess
					}
				>
					<strong>
						{checks.issues.length
							? `Нужно проверить: ${checks.issues.length}`
							: "Проверка пройдена"}
					</strong>
					{checks.issues.length > 0 && (
						<>
							<p>
								{checks.blocking
									? "Исправьте ошибки связей перед формированием отчёта."
									: "Проверьте замечания. При необходимости можно продолжить с текущими данными."}
							</p>
							<ul>
								{checks.issues.map((issue, index) => (
									<li key={`${issue.code}-${issue.itemId}-${index}`}>
										<span>{issue.message}</span>
										<button
											type="button"
											className={styles.inlineAction}
											onClick={async () => {
												await openTask(issue.itemId, issue.entityTypeId);
												setChecks(null);
												setConfirmation(null);
												await onCardClosed?.();
											}}
										>
											<FiExternalLink aria-hidden="true" />
											Открыть карточку
										</button>
									</li>
								))}
							</ul>
						</>
					)}
					{confirmation && !checks.blocking && (
						<button
							className={styles.packageReportButton}
							type="button"
							disabled={pending !== null}
							onClick={() => void action(confirmation, true)}
						>
							{confirmation === "save"
								? "Сохранить версию с этими данными"
								: "Скачать с этими данными"}
						</button>
					)}
				</div>
			)}
			<details className={styles.versionHistory}>
				<summary>
					Сохранённые версии <span>{versions.length}</span>
				</summary>
				<p>
					Сохранённый PDF не меняется при последующих правках. Новую редакцию
					фиксируйте отдельной версией. Даты ниже видны только сотрудникам.
				</p>
				{versionsLoading && <p>Загружаем версии…</p>}
				{versionError && (
					<p role="alert">
						{versionError}{" "}
						<button
							className={styles.inlineAction}
							type="button"
							onClick={() => void loadVersions()}
						>
							Повторить
						</button>
					</p>
				)}
				{!versionsLoading && !versionError && !versions.length && (
					<p>Сохранённых версий пока нет.</p>
				)}
				{versions.map((version) => (
					<div className={styles.versionRow} key={version.id}>
						<div>
							<strong>
								Пакет №{version.packageId} · Версия {version.versionNumber}
							</strong>
							<small>
								{new Date(version.createdAt).toLocaleString("ru-RU", {
									timeZone: "Europe/Moscow",
								})}{" "}
								· Списано {version.spentHours} ч · Остаток{" "}
								{version.remainingHours} ч
							</small>
						</div>
						<button
							type="button"
							className={styles.inlineAction}
							disabled={pending !== null}
							onClick={() => void downloadVersion(version)}
						>
							<FiDownload aria-hidden="true" />
							{pending === version.id ? "Скачиваем…" : "Скачать PDF"}
						</button>
					</div>
				))}
			</details>
		</section>
	);
};
