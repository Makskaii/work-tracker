import { useEffect, useRef, useState } from "react";
import Modal from "@/components/modal/Modal";
import { useB24 } from "@/shared/config/bitrixProvider/bitrixContext";
import { acquireAppUpdateBlocker } from "@/shared/lib/appUpdates";
import type { SupportProjectTask } from "./clientHoursPackages.api";
import styles from "./ClientHoursPackagesPage.module.scss";
import {
	fetchSupportReportOptions,
	getSupportReportForEdit,
	prepareSupportReportFields,
	supportErrorMessage,
} from "./supportAnalyst.api";

type Props = {
	projectId: number;
	projectTitle: string;
	tasks: SupportProjectTask[];
	initialTaskId?: string;
	reportId?: string;
	onClose: () => void;
	onSaved: () => Promise<void>;
};
const today = () =>
	new Intl.DateTimeFormat("en-CA", {
		timeZone: "Europe/Moscow",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(new Date());
export const SupportReportModal = ({
	projectId,
	projectTitle,
	tasks,
	initialTaskId,
	reportId,
	onClose,
	onSaved,
}: Props) => {
	const { b24, status: sdkStatus, mode } = useB24();
	const isStandalonePreview = mode !== "employee" && (sdkStatus === "standalone" || window.self === window.top);
	const [values, setValues] = useState({
		taskId: initialTaskId ?? "",
		description: "",
		hours: "",
		reportDate: today(),
		includeInPackage: true,
		activityId: "",
		reportTypeId: "",
	});
	const [activities, setActivities] = useState<
		Array<{ id: number; title: string }>
	>([]);
	const [reportTypes, setReportTypes] = useState<Array<{ id: number; title: string }>>([]);
	const [loading, setLoading] = useState(true);
	const [loaded, setLoaded] = useState(false);
	const [uncertainCreate, setUncertainCreate] = useState(false);
	const [error, setError] = useState("");
	const [pending, setPending] = useState(false);
	const pendingRef = useRef(false);
	const savedRef = useRef(false);
	const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
	useEffect(() => {
		let active = true;
		const controller = new AbortController();
		Promise.all([
			fetchSupportReportOptions(controller.signal),
			reportId
				? getSupportReportForEdit(reportId, projectId)
				: Promise.resolve(null),
		])
			.then(([options, report]) => {
				if (!active) return;
				setActivities(options.activities);
				setReportTypes(options.reportTypes ?? []);
				setLoaded(true);
				if (report)
					setValues({
						...report,
						taskId: report.taskId ? String(report.taskId) : "",
						hours: String(report.hours),
						activityId: report.activityId ? String(report.activityId) : "",
						reportTypeId: report.reportTypeId ? String(report.reportTypeId) : "",
					});
			})
			.catch((cause) => {
				if (active)
					setError(
						supportErrorMessage(
							cause,
							"Не удалось загрузить данные отчёта. Закройте форму и попробуйте снова.",
						),
					);
			})
			.finally(() => {
				if (active) setLoading(false);
			});
		return () => {
			active = false;
			controller.abort();
		};
	}, [reportId, projectId]);
	const update = <K extends keyof typeof values>(
		key: K,
		value: (typeof values)[K],
	) => {
		setValues((current) => ({ ...current, [key]: value }));
		setFieldErrors((current) => ({ ...current, [key]: "" }));
	};
	const submit = async (event: React.FormEvent) => {
		event.preventDefault();
		if (
			pendingRef.current ||
			savedRef.current ||
			!b24 ||
			loading ||
			!loaded ||
			uncertainCreate
		)
			return;
		const errors: Record<string, string> = {};
		const hours = Number(values.hours.replace(",", "."));
		if (!values.description.trim())
			errors.description = "Опишите выполненную работу";
		if (
			!Number.isFinite(hours) ||
			hours <= 0 ||
			Math.abs(hours * 100 - Math.round(hours * 100)) > 0.00001
		)
			errors.hours =
				"Укажите положительное число часов, не более двух знаков после запятой";
		if (!values.reportDate) errors.reportDate = "Укажите дату работы";
		if (!values.activityId) errors.activityId = "Выберите вид работы";
		if (!values.reportTypeId || !reportTypes.some((item) => item.id === Number(values.reportTypeId))) errors.reportTypeId = "Выберите тип активности";
		setFieldErrors(errors);
		if (Object.keys(errors).length) return;
		const releaseUpdateBlocker = acquireAppUpdateBlocker();
		pendingRef.current = true;
		setPending(true);
		setError("");
		let writeStarted = false;
		try {
			const prepared = await prepareSupportReportFields(projectId, {
				taskId: values.taskId ? Number(values.taskId) : null,
				description: values.description.trim(),
				hours,
				reportDate: values.reportDate,
				includeInPackage: values.includeInPackage,
				activityId: Number(values.activityId),
				reportTypeId: Number(values.reportTypeId),
				...(reportId ? { reportId: Number(reportId) } : {}),
			});
			const fields = { ...prepared.fields };
			if (!reportId) {
				const user = await b24.actions.v2.call.make({ method: "user.current" });
				const responsibleId = Number(user.getData()?.result?.ID);
				if (!Number.isSafeInteger(responsibleId) || responsibleId <= 0)
					throw new Error("Не удалось определить автора");
				fields.assignedById = responsibleId;
			}
			writeStarted = true;
			const result = await b24.actions.v2.call.make({
				method: reportId ? "crm.item.update" : "crm.item.add",
				params: {
					entityTypeId: prepared.entityTypeId,
					fields,
					...(reportId ? { id: Number(reportId) } : {}),
				},
			});
			if (!result.isSuccess) {
				writeStarted = false;
				throw new Error("Битрикс24 не сохранил отчёт");
			}
			savedRef.current = true;
			await onSaved();
			onClose();
		} catch (cause) {
			if (writeStarted && !reportId && !savedRef.current)
				setUncertainCreate(true);
			setError(
				supportErrorMessage(
					cause,
					savedRef.current
						? "Отчёт сохранён, но остатки не удалось обновить. Закройте форму и нажмите «Обновить данные». Повторно создавать отчёт не нужно."
						: writeStarted
							? "Не удалось подтвердить сохранение отчёта. Проверьте отчёты в Битрикс24 перед повторной попыткой, чтобы не создать дубль."
							: "Не удалось сохранить отчёт. Проверьте данные и свои права в Битрикс24.",
				),
			);
		} finally {
			pendingRef.current = false;
			setPending(false);
			releaseUpdateBlocker();
		}
	};
	return (
		<Modal
			isOpen
			onClose={() => {
				if (!pendingRef.current) onClose();
			}}
			size="small"
			innerScroll
			closeOnBackdropClick={!pending}
		>
			<form
				className={styles.packageForm}
				onSubmit={submit}
				noValidate
				aria-busy={pending || loading}
			>
				<header>
					<h2>{reportId ? "Изменить отчёт" : "Добавить отчёт"}</h2>
					<p>{projectTitle}</p>
				</header>
				{!b24 && (
					<div className={styles.formError} role={sdkStatus === "loading" ? "status" : "alert"}>
						{sdkStatus === "loading" ? "Подключаемся к вашей сессии Битрикс24…" : isStandalonePreview ?
							"Для сохранения откройте Work Tracker внутри Битрикс24. Отчёт будет создан от вашего имени." :
							"Не удалось подключиться к текущей сессии Битрикс24. Обновите приложение, чтобы повторить подключение с вашими правами."}
						{!isStandalonePreview && sdkStatus !== "loading" && <button type="button" onClick={() => window.location.reload()}>Подключиться заново</button>}
					</div>
				)}
				{loading ? (
					<p role="status">Загружаем данные…</p>
				) : (
					<>
						<label>
							Задача
							<select
								disabled={pending}
								value={values.taskId}
								onChange={(event) => update("taskId", event.target.value)}
							>
								<option value="">Отдельный отчёт по проекту</option>
								{values.taskId &&
									!tasks.some((task) => task.id === values.taskId) && (
										<option value={values.taskId}>
											Задача #{values.taskId}
										</option>
									)}
								{tasks.map((task) => (
									<option key={task.id} value={task.id}>
										{task.title}
									</option>
								))}
							</select>
						</label>
						<label>
							Выполненная работа
							<textarea
								value={values.description}
								disabled={pending}
								onChange={(event) => update("description", event.target.value)}
								aria-invalid={!!fieldErrors.description}
							/>
							{fieldErrors.description && (
								<span className={styles.formError}>
									{fieldErrors.description}
								</span>
							)}
						</label>
						<div className={styles.formColumns}>
							<label>
								Часы
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
								Дата работы
								<input
									type="date"
									value={values.reportDate}
									disabled={pending}
									onChange={(event) => update("reportDate", event.target.value)}
									aria-invalid={!!fieldErrors.reportDate}
								/>
								{fieldErrors.reportDate && (
									<span className={styles.formError}>
										{fieldErrors.reportDate}
									</span>
								)}
							</label>
						</div>
						<label>
							Вид работы
							<select
								value={values.activityId}
								disabled={pending}
								onChange={(event) => update("activityId", event.target.value)}
								aria-invalid={!!fieldErrors.activityId}
							>
								<option value="">Выберите вид работы</option>
								{activities.map((activity) => (
									<option key={activity.id} value={activity.id}>
										{activity.title}
									</option>
								))}
							</select>
							{fieldErrors.activityId && (
								<span className={styles.formError}>
									{fieldErrors.activityId}
								</span>
							)}
						</label>
						<label>
							Тип активности
							<select value={values.reportTypeId} disabled={pending} onChange={(event) => update("reportTypeId", event.target.value)} aria-invalid={!!fieldErrors.reportTypeId}>
								<option value="">Выберите тип активности</option>
								{reportTypes.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
							</select>
							{fieldErrors.reportTypeId && <span className={styles.formError}>{fieldErrors.reportTypeId}</span>}
						</label>
						<label className={styles.packageCheckbox}>
							<input
								type="checkbox"
								checked={values.includeInPackage}
								disabled={pending}
								onChange={(event) =>
									update("includeInPackage", event.target.checked)
								}
							/>
							<span>
								Учитывать в пакете
								<small>
									Работа попадёт в клиентский отчёт, часы будут списаны
								</small>
							</span>
						</label>
						<p>
							Пакет определяется автоматически. Дата нужна для внутреннего учёта
							и не попадёт в клиентский PDF.
						</p>
					</>
				)}
				{error && (
					<p className={styles.formError} role="alert">
						{error}
					</p>
				)}
				<footer>
					<button type="button" disabled={pending} onClick={onClose}>
						Закрыть
					</button>
					<button
						type="submit"
						disabled={
							pending ||
							loading ||
							!loaded ||
							!b24 ||
							savedRef.current ||
							uncertainCreate
						}
					>
						{pending ? "Сохраняем…" : "Сохранить отчёт"}
					</button>
				</footer>
			</form>
		</Modal>
	);
};
