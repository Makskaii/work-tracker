import { useEffect, useId, useRef, useState } from "react";
import { FiCalendar, FiDownload } from "react-icons/fi";
import { notify } from "@/shared/ui/NotificationPopup/notify";
import styles from "./ClientHoursPackagesPage.module.scss";
import {
	fetchSupportHoursPackageReport,
	type SupportPackageReportPeriod,
} from "./clientHoursPackages.api";
import {
	downloadSupportPdf,
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
	generation: number;
	period?: SupportPackageReportPeriod;
};
export const SupportPackageReportPanel = ({
	packageId,
	purchaseDate,
	hasPackages,
	refreshKey,
}: Props) => {
	const periodId = useId();
	const [pending, setPending] = useState<ReportMode | null>(null);
	const pendingRef = useRef(false);
	const [periodOpen, setPeriodOpen] = useState(false);
	const [period, setPeriod] = useState(() =>
		initialReportPeriod(purchaseDate, moscowToday()),
	);
	const [periodError, setPeriodError] = useState<string | null>(null);
	const generationRef = useRef(0);
	// biome-ignore lint/correctness/useExhaustiveDependencies: each package starts with its own purchase date and invalidates previous requests.
	useEffect(() => {
		generationRef.current += 1;
		setPeriodError(null);
		setPeriod(initialReportPeriod(purchaseDate, moscowToday()));
		setPeriodOpen(false);
		return () => {
			generationRef.current += 1;
		};
	}, [packageId, purchaseDate]);
	// biome-ignore lint/correctness/useExhaustiveDependencies: a refreshed snapshot invalidates pending reports while preserving the chosen date range.
	useEffect(() => {
		generationRef.current += 1;
		return () => {
			generationRef.current += 1;
		};
	}, [refreshKey]);
	const invalidate = () => {
		generationRef.current += 1;
		setPeriodError(null);
	};
	const updatePeriod = (
		field: keyof SupportPackageReportPeriod,
		value: string,
	) => {
		invalidate();
		setPeriod((current) => ({ ...current, [field]: value }));
	};
	const downloadReport = async (mode: ReportMode) => {
		if (!packageId || pendingRef.current) return;
		if (mode === "period") {
			const error = validateReportPeriod(period, moscowToday());
			setPeriodError(error);
			if (error) return;
		}
		const request: ReportRequest = {
			packageId,
			generation: generationRef.current,
			...(mode === "period" ? { period: { ...period } } : {}),
		};
		pendingRef.current = true;
		setPending(mode);
		try {
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
						: "Не удалось сформировать отчёт для клиента. Повторите попытку.",
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
			aria-label="Отчёт для клиента"
		>
			<div className={styles.reportPanelHeading}>
				<div>
					<h2>Отчёт для клиента</h2>
					<p>
						{packageId
							? "Задачи и часы по данным кабинета клиента"
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
						{pending === "package" ? "Готовим отчёт…" : "Скачать отчёт"}
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
						периода. Обе даты включены.
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
		</section>
	);
};
