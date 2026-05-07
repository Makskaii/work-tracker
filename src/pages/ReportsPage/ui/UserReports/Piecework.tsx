import {
	type ChangeEvent,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useOutletContext } from "react-router";
import { AsyncSelect } from "@/components/form/SelectField";
import { $backendApi } from "@/shared/config/axios/axios.config";
import { DEPARTMENT_IDS, Endpoints } from "@/shared/constants/const";
import type { ReportsContext } from "@/shared/types/types";
import { notify } from "@/shared/ui/NotificationPopup/notify";
import { convertToDate } from "@/shared/utils";
import cls from "./Piecework.module.scss";

type PieceworkFormValues = {
	employeeId: string;
	activityId: string;
	clientId: string;
	projectId: string;
	comment: string;
	hours: string;
};

type ListItemsDto = {
	id: number;
	employeeId: string;
	activityId: string;
	activityName: string;
	clientId: string;
	clientName: string;
	projectId: string;
	projectName: string;
	comment: string | null;
	hours: string;
	createdAt: string;
	updatedAt: string;
};

const isRequestCanceled = (error: unknown) => {
	if (typeof error !== "object" || error === null) {
		return false;
	}

	const requestError = error as { code?: string; name?: string };

	return (
		requestError.code === "ERR_CANCELED" ||
		requestError.name === "CanceledError" ||
		requestError.name === "AbortError"
	);
};

export const Piecework = () => {
	const [formOpen, setFormOpen] = useState(false);

	const [data, setData] = useState<ListItemsDto[]>([]);
	const isMountedRef = useRef(false);
	const fetchRequestIdRef = useRef(0);
	const fetchAbortControllerRef = useRef<AbortController | null>(null);

	const { projects, clientsList, activities } =
		useOutletContext<ReportsContext>();

	const methods = useForm<PieceworkFormValues>({
		defaultValues: {
			employeeId: "",
			activityId: "",
			clientId: "",
			projectId: "",
			comment: "",
			hours: "",
		},
	});

	const {
		formState: { isSubmitting },
		handleSubmit,
		register,
		reset,
		setValue,
	} = methods;

	const hoursField = register("hours", {
		required: true,
		max: 99.99,
	});

	const handleHoursChange = (event: ChangeEvent<HTMLInputElement>) => {
		const normalizedValue = event.target.value
			.replace(",", ".")
			.replace(/[^\d.]/g, "");
		const [integerPart = "", decimalPart = ""] = normalizedValue.split(".");
		const limitedIntegerPart = integerPart.slice(0, 2);
		const hasDecimalSeparator = normalizedValue.includes(".");
		const limitedValue = hasDecimalSeparator
			? `${limitedIntegerPart || "0"}.${decimalPart.slice(0, 2)}`
			: limitedIntegerPart;

		setValue("hours", limitedValue, {
			shouldDirty: true,
			shouldValidate: true,
		});
	};

	const fetchData = useCallback(async () => {
		fetchAbortControllerRef.current?.abort();

		const requestId = fetchRequestIdRef.current + 1;
		fetchRequestIdRef.current = requestId;

		const abortController = new AbortController();
		fetchAbortControllerRef.current = abortController;

		try {
			const res = await $backendApi.get<ListItemsDto[]>("employee", {
				signal: abortController.signal,
			});

			if (isMountedRef.current && fetchRequestIdRef.current === requestId) {
				setData(res.data);
			}
		} catch (error) {
			if (isRequestCanceled(error)) {
				return;
			}

			if (
				isMountedRef.current &&
				fetchRequestIdRef.current === requestId &&
				error instanceof Error
			) {
				notify({
					message: error.message,
					type: "error",
				});
			}
		} finally {
			if (fetchRequestIdRef.current === requestId) {
				fetchAbortControllerRef.current = null;
			}
		}
	}, []);

	const handleFormSubmit = handleSubmit(async (data) => {
		const dataToSend = {
			...data,
			clientName: clientsList.find((item) => item.ID === data.clientId)?.NAME,
			activityName: activities.find((item) => item.ID === data.activityId)
				?.NAME,
			projectName: projects.find((item) => item.id === data.projectId)?.name,
		};

		try {
			await $backendApi.post("employee", dataToSend);
			await fetchData();

			if (!isMountedRef.current) {
				return;
			}

			reset();
			setFormOpen(false);

			notify({
				message: "Запись успешно создана",
				type: "success",
			});
		} catch (error) {
			if (isMountedRef.current && error instanceof Error) {
				notify({
					message: error.message,
					type: "error",
				});
			}
		}
	});

	useEffect(() => {
		isMountedRef.current = true;
		fetchData();

		return () => {
			isMountedRef.current = false;
			fetchRequestIdRef.current += 1;
			fetchAbortControllerRef.current?.abort();
		};
	}, [fetchData]);

	useEffect(() => {
		const fetchD = async () => {
			const res = await $backendApi.get("employee/10");
			console.log(res);
		};

		fetchD();
	}, []);

	return (
		<section className={cls.container}>
			<div className={cls.toolbar}>
				<div>
					<h2 className={cls.title}>Сдельная оплата</h2>
					<div className={cls.subtitle}>Добавление часов сотрудникам</div>
				</div>
				<button
					type="button"
					className={cls.primaryButton}
					onClick={() => setFormOpen((prev) => !prev)}
				>
					{formOpen ? "Скрыть форму" : "Добавить часы"}
				</button>
			</div>

			<div className={cls.content}>
				{formOpen && (
					<FormProvider {...methods}>
						<form className={cls.form} onSubmit={handleFormSubmit}>
							<div className={cls.formHeader}>
								<div className={cls.formTitle}>Новая запись</div>
								<button
									type="button"
									className={cls.secondaryButton}
									onClick={() => {
										reset();
										setFormOpen(false);
									}}
								>
									Отмена
								</button>
							</div>

							<div className={cls.fieldsGrid}>
								<label className={cls.field}>
									<span>Сотрудник</span>
									<AsyncSelect
										name="employeeId"
										placeholder="Сотрудники"
										endpoint={Endpoints.users}
										styles={{
											width: "100%",
										}}
										params={{
											params: {
												filter: {
													"@UF_DEPARTMENT": [DEPARTMENT_IDS.DEV],
												},
												select: [
													"NAME",
													"ID",
													"LAST_NAME",
													"UF_DEPARTMENT",
													"WORK_POSITION",
													"PERSONAL_PHOTO",
												],
											},
										}}
									/>
								</label>

								<label className={cls.field}>
									<span>Активити</span>
									<select {...register("activityId", { required: true })}>
										<option value="">Выберите активити</option>
										{activities.map((activity) => (
											<option key={activity.ID} value={activity.ID}>
												{activity.NAME}
											</option>
										))}
									</select>
								</label>

								<label className={cls.field}>
									<span>Клиент</span>
									<select {...register("clientId", { required: true })}>
										<option value="">Выберите клиента</option>
										{clientsList.map((client) => (
											<option key={client.ID} value={client.ID}>
												{client.NAME}
											</option>
										))}
									</select>
								</label>

								<label className={cls.field}>
									<span>Проект</span>
									<select {...register("projectId", { required: true })}>
										<option value="">Выберите проект</option>
										{projects.map((project) => (
											<option key={project.id} value={project.id}>
												{project.name}
											</option>
										))}
									</select>
								</label>

								<label className={cls.field}>
									<span>Часы</span>
									<input
										type="text"
										inputMode="decimal"
										maxLength={5}
										placeholder="0"
										{...hoursField}
										onChange={handleHoursChange}
									/>
								</label>

								<label className={`${cls.field} ${cls.commentField}`}>
									<span>Комментарий</span>
									<textarea
										rows={4}
										placeholder="Что было сделано"
										{...register("comment", { required: true })}
									/>
								</label>
							</div>

							<div className={cls.formActions}>
								<button
									type="submit"
									className={cls.primaryButton}
									disabled={isSubmitting}
								>
									Сохранить запись
								</button>
							</div>
						</form>
					</FormProvider>
				)}

				<div className={cls.recordsSection}>
					<div className={cls.recordsHeader}>
						<div className={cls.sectionTitle}>Добавленные записи</div>
						<div className={cls.recordsCounter}>{data.length}</div>
					</div>

					{data.length ? (
						<div className={cls.recordsList}>
							{data.map((record) => (
								<div key={record.id} className={cls.recordCard}>
									<div className={cls.recordTopline}>
										<div>
											<div className={cls.recordEmployee}>ds</div>
											<div className={cls.recordMeta}>sd</div>
										</div>
										<div className={cls.hoursBadge}>{record.hours} ч</div>
									</div>

									<div className={cls.recordDetails}>
										<span>ds</span>
										<span>{convertToDate(record.createdAt)}</span>
									</div>

									<div className={cls.recordComment}>{record.comment}</div>
								</div>
							))}
						</div>
					) : (
						<div className={cls.emptyState}>Пока нет добавленных записей</div>
					)}
				</div>
			</div>
		</section>
	);
};
