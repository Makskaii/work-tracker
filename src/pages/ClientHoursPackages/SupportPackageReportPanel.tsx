import { useEffect, useId, useRef, useState } from "react";
import { FiCalendar, FiDownload, FiExternalLink } from "react-icons/fi";
import { useBitrixSlider } from "@/shared/hooks/useBitrixSlider";
import { notify } from "@/shared/ui/NotificationPopup/notify";
import styles from "./ClientHoursPackagesPage.module.scss";
import {
	fetchSupportHoursPackageReport,
	type SupportPackageReportPeriod,
} from "./clientHoursPackages.api";
import {
	downloadSupportPdf,
	fetchPackageChecks,
	type PackageChecks,
	supportErrorMessage,
} from "./supportAnalyst.api";
import {
	initialReportPeriod,
	moscowToday,
	validateReportPeriod,
} from "./supportReportPeriod";

type Props = {
	packageId: number | null;
	purchaseDate?: string | null;
	hasPackages: boolean;
	refreshKey?: number;
	onCardClosed?: () => Promise<void>;
};
type ReportMode = "package" | "period";
type ReportRequest = {
	packageId: number;
	mode: ReportMode;
	generation: number;
	period?: SupportPackageReportPeriod;
};
export const SupportPackageReportPanel = ({
	packageId,
	purchaseDate,
	hasPackages,
	refreshKey,
	onCardClosed,
}: Props) => {
	const { openTask } = useBitrixSlider();
	const periodId = useId();
	const [checks, setChecks] = useState<PackageChecks | null>(null);
	const [pending, setPending] = useState<ReportMode | null>(null);
	const pendingRef = useRef(false);
	const [confirmation, setConfirmation] = useState<ReportRequest | null>(null);
	const [periodOpen, setPeriodOpen] = useState(false);
	const [period, setPeriod] = useState(() =>
		initialReportPeriod(purchaseDate, moscowToday()),
	);
	const [periodError, setPeriodError] = useState<string | null>(null);
	const generationRef = useRef(0);
	// biome-ignore lint/correctness/useExhaustiveDependencies: each package starts with its own purchase date and invalidates previous requests.
	useEffect(() => {
		generationRef.current += 1;
		setChecks(null);
		setConfirmation(null);
		setPeriodError(null);
		setPeriod(initialReportPeriod(purchaseDate, moscowToday()));
		setPeriodOpen(false);
		return () => {
			generationRef.current += 1;
		};
	}, [packageId, purchaseDate]);
	// biome-ignore lint/correctness/useExhaustiveDependencies: a refreshed snapshot invalidates checks while preserving the chosen date range.
	useEffect(() => {
		generationRef.current += 1;
		setChecks(null);
		setConfirmation(null);
		return () => {
			generationRef.current += 1;
		};
	}, [refreshKey]);
	const invalidate = () => {
		generationRef.current += 1;
		setChecks(null);
		setConfirmation(null);
		setPeriodError(null);
	};
	const updatePeriod = (
		field: keyof SupportPackageReportPeriod,
		value: string,
	) => {
		invalidate();
		setPeriod((current) => ({ ...current, [field]: value }));
	};
	const downloadReport = async (
		mode: ReportMode,
		confirmedRequest?: ReportRequest,
	) => {
		if (!packageId || pendingRef.current) return;
		if (mode === "period") {
			const error = validateReportPeriod(period, moscowToday());
			setPeriodError(error);
			if (error) return;
		}
		const request = confirmedRequest ?? {
			packageId,
			mode,
			generation: generationRef.current,
			...(mode === "period" ? { period: { ...period } } : {}),
		};
		if (
			request.packageId !== packageId ||
			request.generation !== generationRef.current
		)
			return;
		pendingRef.current = true;
		setPending(mode);
		try {
			const checked = await fetchPackageChecks(request.packageId);
			if (request.generation !== generationRef.current) return;
			setChecks(checked);
			if (
				checked.blocking ||
				(checked.issues.length > 0 && !confirmedRequest)
			) {
				setConfirmation(request);
				return;
			}
			setConfirmation(null);
			const pdf = request.period
				? await fetchSupportHoursPackageReport(
						request.packageId,
						request.period,
					)
				: await fetchSupportHoursPackageReport(request.packageId);
			if (request.generation !== generationRef.current) return;
			downloadSupportPdf(
				pdf,
				request.period
					? `support-package-${request.packageId}-${request.period.dateFrom}-${request.period.dateTo}.pdf`
					: `support-package-${request.packageId}.pdf`,
			);
		} catch (cause) {
			if (request.generation !== generationRef.current) return;
			notify({
				message: supportErrorMessage(
					cause,
					mode === "period"
						? "Не удалось сформировать отчёт за период. Повторите попытку."
						: "Не удалось сформировать отчёт по пакету. Повторите попытку.",
				),
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
						aria-busy={pending === "package"}
						onClick={() => void downloadReport("package")}
					>
						<FiDownload aria-hidden="true" />
						{pending === "package" ? "Готовим отчёт…" : "Отчёт по пакету"}
					</button>
					<button
						className={styles.packageReportButton}
						type="button"
						disabled={!packageId || pending !== null}
						aria-expanded={periodOpen}
						aria-controls={periodId}
						onClick={() => {
							invalidate();
							setPeriodOpen((current) => !current);
						}}
					>
						<FiCalendar aria-hidden="true" />
						За период
					</button>
				</div>
			</div>
			{periodOpen && (
				<form
					id={periodId}
					className={styles.reportPeriodForm}
					aria-label="Отчёт за период"
					noValidate
					onSubmit={(event) => {
						event.preventDefault();
						void downloadReport("period");
					}}
				>
					<label>
						С даты
						<input
							type="date"
							value={period.dateFrom}
							max={moscowToday()}
							aria-invalid={!!periodError}
							aria-describedby={periodError ? `${periodId}-error` : undefined}
							onChange={(event) => updatePeriod("dateFrom", event.target.value)}
						/>
					</label>
					<label>
						По дату
						<input
							type="date"
							value={period.dateTo}
							max={moscowToday()}
							aria-invalid={!!periodError}
							aria-describedby={periodError ? `${periodId}-error` : undefined}
							onChange={(event) => updatePeriod("dateTo", event.target.value)}
						/>
					</label>
					<button
						className={styles.packageReportButton}
						type="submit"
						disabled={!packageId || pending !== null}
						aria-busy={pending === "period"}
					>
						<FiDownload aria-hidden="true" />
						{pending === "period" ? "Готовим отчёт…" : "Скачать за период"}
					</button>
					<p className={styles.reportPeriodHint}>
						Задачи с работами за эти даты показываем целиком, включая работы вне
						периода. Отдельные работы — только за период. Обе даты включены.
					</p>
					{periodError && (
						<p
							id={`${periodId}-error`}
							className={styles.reportPeriodError}
							role="alert"
						>
							{periodError}
						</p>
					)}
				</form>
			)}
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
												invalidate();
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
							onClick={() =>
								void downloadReport(confirmation.mode, confirmation)
							}
						>
							{confirmation.mode === "period"
								? "Скачать за период с этими данными"
								: "Скачать с этими данными"}
						</button>
					)}
				</div>
			)}
		</section>
	);
};
