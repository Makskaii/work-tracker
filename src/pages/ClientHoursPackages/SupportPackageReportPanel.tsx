import { useEffect, useRef, useState } from "react";
import { FiDownload, FiExternalLink } from "react-icons/fi";
import { useBitrixSlider } from "@/shared/hooks/useBitrixSlider";
import { notify } from "@/shared/ui/NotificationPopup/notify";
import { fetchSupportHoursPackageReport } from "./clientHoursPackages.api";
import styles from "./ClientHoursPackagesPage.module.scss";
import {
	downloadSupportPdf,
	fetchPackageChecks,
	type PackageChecks,
	supportErrorMessage,
} from "./supportAnalyst.api";

type Props = {
	packageId: number | null;
	hasPackages: boolean;
	refreshKey?: number;
	onCardClosed?: () => Promise<void>;
};
export const SupportPackageReportPanel = ({
	packageId,
	hasPackages,
	refreshKey,
	onCardClosed,
}: Props) => {
	const { openTask } = useBitrixSlider();
	const [checks, setChecks] = useState<PackageChecks | null>(null);
	const [pending, setPending] = useState(false);
	const pendingRef = useRef(false);
	const [confirmation, setConfirmation] = useState(false);
	const generationRef = useRef(0);
	// biome-ignore lint/correctness/useExhaustiveDependencies: changing the package or refreshing its data invalidates previous checks.
	useEffect(() => {
		generationRef.current += 1;
		setChecks(null);
		setConfirmation(false);
		return () => {
			generationRef.current += 1;
		};
	}, [refreshKey, packageId]);
	const downloadReport = async (confirmed = false) => {
		if (!packageId || pendingRef.current) return;
		pendingRef.current = true;
		setPending(true);
		const generation = generationRef.current;
		try {
			const checked = await fetchPackageChecks(packageId);
			if (generation !== generationRef.current) return;
			setChecks(checked);
			if (checked.blocking || (checked.issues.length > 0 && !confirmed)) {
				setConfirmation(true);
				return;
			}
			setConfirmation(false);
			downloadSupportPdf(
				await fetchSupportHoursPackageReport(packageId),
				`support-package-${packageId}.pdf`,
			);
		} catch (cause) {
			notify({
				message: supportErrorMessage(
					cause,
					"Не удалось сформировать отчёт по пакету. Повторите попытку.",
				),
				type: "error",
			});
		} finally {
			pendingRef.current = false;
			setPending(false);
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
						disabled={!packageId || pending}
						aria-busy={pending}
						onClick={() => void downloadReport()}
					>
						<FiDownload aria-hidden="true" />
						{pending ? "Готовим отчёт…" : "Отчёт по пакету"}
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
												setConfirmation(false);
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
							disabled={pending}
							onClick={() => void downloadReport(true)}
						>
							Скачать с этими данными
						</button>
					)}
				</div>
			)}
		</section>
	);
};
