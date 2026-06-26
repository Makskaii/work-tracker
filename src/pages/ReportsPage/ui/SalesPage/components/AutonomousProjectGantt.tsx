import { useCallback, useEffect, useMemo, useState } from "react";
import { FaMoneyBillWave } from "react-icons/fa";
import Modal from "@/components/modal/Modal";
import {
	buildAutonomousProjectGantt,
	formatAutonomousEventTooltip,
	formatAutonomousPaymentTooltip,
	getAutonomousEventStyle,
} from "../model/autonomousProjectGantt";
import {
	createProjectGanttEvent,
	createProjectGanttStage,
	deleteProjectGanttEvent,
	deleteProjectGanttStage,
	fetchProjectGanttEvents,
	fetchProjectGanttStages,
	updateProjectGanttEvent,
	updateProjectGanttStage,
} from "../model/projectGantt.api";
import {
	createAutonomousProjectPayment,
	deleteAutonomousProjectPayment,
	fetchAutonomousProjectPayments,
	updateAutonomousProjectPayment,
} from "../model/projectPayments.api";
import type { GanttMonthTick, GanttWeekTick } from "../model/ganttTypes";
import {
	formatDateShort,
	getMilestoneStyle,
	getMonthTicks,
	getWeekTicks,
	parseGanttDate,
} from "../model/ganttUtils";
import { formatMoney } from "../model/profitabilityUtils";
import type {
	AutonomousGanttEventKind,
	AutonomousPaymentStatus,
	AutonomousProjectPayment,
	ProjectGanttEvent,
	ProjectGanttStage,
	ProjectGanttStageType,
	ReportProject,
} from "../model/types";
import styles from "../SalesProfitabilityReport.module.scss";

type StageFormState = {
	eventId: number | null;
	factEndDate: string;
	factStartDate: string;
	id: number | null;
	planEndDate: string;
	planStartDate: string;
	stageType: ProjectGanttStageType;
	title: string;
};

type EventFormState = {
	eventKind: AutonomousGanttEventKind;
	factEndDate: string;
	factStartDate: string;
	id: number | null;
	planEndDate: string;
	planStartDate: string;
	stageId: number | null;
	title: string;
};

export type PaymentFormState = {
	amount: string;
	id: number | null;
	paymentDate: string;
	percent: string;
	stageId: number | null;
	status: AutonomousPaymentStatus;
	waitingDays: string;
};

const DEFAULT_STAGE_FORM: StageFormState = {
	eventId: null,
	factEndDate: "",
	factStartDate: "",
	id: null,
	planEndDate: "",
	planStartDate: "",
	stageType: "tz_writing",
	title: "",
};

const DEFAULT_EVENT_FORM: EventFormState = {
	eventKind: "one_time",
	factEndDate: "",
	factStartDate: "",
	id: null,
	planEndDate: "",
	planStartDate: "",
	stageId: null,
	title: "",
};

const STAGE_TYPE_OPTIONS: Array<{
	label: string;
	value: ProjectGanttStageType;
}> = [
	{ label: "Написание ТЗ", value: "tz_writing" },
	{ label: "Подписание ТЗ", value: "tz_signing" },
	{ label: "Разработка", value: "development" },
	{ label: "Обучение", value: "education" },
	{ label: "Сдача", value: "delivery" },
	{ label: "Закрытие проекта", value: "closing" },
];

const DURATION_STAGE_TYPES = new Set<ProjectGanttStageType>([
	"tz_writing",
	"development",
	"education",
]);

export const DEFAULT_PAYMENT_FORM: PaymentFormState = {
	amount: "",
	id: null,
	paymentDate: "",
	percent: "",
	stageId: null,
	status: "todo",
	waitingDays: "",
};

const getScaleWeekStep = (weekTicksCount: number) => {
	if (weekTicksCount > 36) return 4;
	if (weekTicksCount > 24) return 3;
	if (weekTicksCount > 14) return 2;

	return 1;
};

const toNumberOrNull = (value: string) => {
	const normalizedValue = value.trim().replace(",", ".");

	if (!normalizedValue) {
		return null;
	}

	const parsedValue = Number(normalizedValue);

	return Number.isFinite(parsedValue) ? parsedValue : null;
};

const formatPaymentNumber = (value: number) => {
	const roundedValue = Math.round(value * 100) / 100;

	return Number.isInteger(roundedValue)
		? String(roundedValue)
		: String(roundedValue).replace(".", ",");
};

const getStageTypeLabel = (stageType: ProjectGanttStageType) =>
	STAGE_TYPE_OPTIONS.find((option) => option.value === stageType)?.label ??
	stageType;

const getStageEventKind = (
	stageType: ProjectGanttStageType,
): AutonomousGanttEventKind =>
	DURATION_STAGE_TYPES.has(stageType) ? "duration" : "one_time";

const getStageTypeFromStage = (
	stage: ProjectGanttStage,
): ProjectGanttStageType =>
	stage.stageType && stage.stageType !== "payments"
		? stage.stageType
		: "tz_writing";

export const calculatePaymentFields = ({
	amount,
	percent,
	projectAmount,
	source,
}: {
	amount: string;
	percent: string;
	projectAmount: number | null | undefined;
	source: "amount" | "percent";
}): Pick<PaymentFormState, "amount" | "percent"> => {
	const normalizedProjectAmount = projectAmount ?? 0;

	if (normalizedProjectAmount <= 0) {
		return { amount, percent };
	}

	if (source === "percent") {
		const percentValue = toNumberOrNull(percent);

		return {
			amount:
				percentValue === null
					? ""
					: formatPaymentNumber((normalizedProjectAmount * percentValue) / 100),
			percent,
		};
	}

	const amountValue = toNumberOrNull(amount);

	return {
		amount,
		percent:
			amountValue === null
				? ""
				: formatPaymentNumber((amountValue / normalizedProjectAmount) * 100),
	};
};

export const AutonomousProjectGantt = ({
	onPaymentsChanged,
	project,
	paymentsRefreshKey = 0,
}: {
	onPaymentsChanged?: () => void;
	project: ReportProject | null;
	paymentsRefreshKey?: number;
}) => {
	const [stages, setStages] = useState<ProjectGanttStage[]>([]);
	const [events, setEvents] = useState<ProjectGanttEvent[]>([]);
	const [payments, setPayments] = useState<AutonomousProjectPayment[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [stageForm, setStageForm] = useState<StageFormState>(DEFAULT_STAGE_FORM);
	const [eventForm, setEventForm] = useState<EventFormState>(DEFAULT_EVENT_FORM);
	const [paymentForm, setPaymentForm] =
		useState<PaymentFormState>(DEFAULT_PAYMENT_FORM);
	const [isStageModalOpen, setIsStageModalOpen] = useState(false);
	const [isEventModalOpen, setIsEventModalOpen] = useState(false);
	const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
	const [deletingStageId, setDeletingStageId] = useState<number | null>(null);
	const [deletingEventId, setDeletingEventId] = useState<number | null>(null);
	const [deletingPaymentId, setDeletingPaymentId] = useState<number | null>(null);
	const today = useMemo(() => {
		const currentDate = new Date();

		return new Date(
			currentDate.getFullYear(),
			currentDate.getMonth(),
			currentDate.getDate(),
		);
	}, []);
	const gantt = useMemo(
		() => buildAutonomousProjectGantt({ events, payments, stages, today }),
		[events, payments, stages, today],
	);
	const monthTicks = useMemo(
		() => getMonthTicks(gantt.timeline),
		[gantt.timeline],
	);
	const weekTicks = useMemo(() => getWeekTicks(gantt.timeline), [gantt.timeline]);
	const scaleWeekTicks = useMemo(() => {
		const step = getScaleWeekStep(weekTicks.length);

		return weekTicks.filter((_, index) => index % step === 0);
	}, [weekTicks]);
	const stageById = useMemo(
		() => new Map(stages.map((stage) => [stage.id, stage])),
		[stages],
	);
	const editableStages = useMemo(
		() => stages.filter((stage) => stage.code !== "payments"),
		[stages],
	);

	const refreshData = useCallback(
		async (signal?: AbortSignal) => {
			if (!project?.id) {
				setStages([]);
				setEvents([]);
				setPayments([]);
				return;
			}

			const projectId = String(project.id);

			const [stageItems, eventItems, paymentItems] = await Promise.all([
				fetchProjectGanttStages(projectId, signal),
				fetchProjectGanttEvents(projectId, signal),
				fetchAutonomousProjectPayments(projectId, signal),
			]);

			setStages(stageItems);
			setEvents(eventItems);
			setPayments(paymentItems);
		},
		[project?.id],
	);

	useEffect(() => {
		const controller = new AbortController();

		setIsLoading(true);
		setError(null);
		refreshData(controller.signal)
			.catch(() => {
				if (!controller.signal.aborted) {
					setError("Не удалось загрузить данные Ганта");
				}
			})
			.finally(() => {
				if (!controller.signal.aborted) {
					setIsLoading(false);
				}
			});

		return () => controller.abort();
	}, [refreshData, paymentsRefreshKey]);

	const openStageCreateModal = () => {
		setStageForm({
			...DEFAULT_STAGE_FORM,
			title: getStageTypeLabel(DEFAULT_STAGE_FORM.stageType),
		});
		setIsStageModalOpen(true);
	};

	const openStageEditModal = (stage: ProjectGanttStage) => {
		const stageEvent = events.find((event) => event.stageId === stage.id);
		const stageType = getStageTypeFromStage(stage);

		setStageForm({
			eventId: stageEvent?.id ?? null,
			factEndDate: stageEvent?.factEndDate ?? "",
			factStartDate: stageEvent?.factStartDate ?? "",
			id: stage.id,
			planEndDate: stageEvent?.planEndDate ?? "",
			planStartDate: stageEvent?.planStartDate ?? "",
			stageType,
			title: stage.title,
		});
		setIsStageModalOpen(true);
	};

	const openEventCreateModal = (stage: ProjectGanttStage) => {
		setEventForm({
			...DEFAULT_EVENT_FORM,
			stageId: stage.id,
		});
		setIsEventModalOpen(true);
	};

	const openEventEditModal = (event: ProjectGanttEvent) => {
		setEventForm({
			eventKind: event.eventKind,
			factEndDate: event.factEndDate ?? "",
			factStartDate: event.factStartDate ?? "",
			id: event.id,
			planEndDate: event.planEndDate ?? "",
			planStartDate: event.planStartDate ?? "",
			stageId: event.stageId,
			title: event.title,
		});
		setIsEventModalOpen(true);
	};

	const openPaymentCreateModal = () => {
		setPaymentForm({
			...DEFAULT_PAYMENT_FORM,
			stageId: editableStages[0]?.id ?? stages[0]?.id ?? null,
		});
		setIsPaymentModalOpen(true);
	};

	const openPaymentEditModal = (payment: AutonomousProjectPayment) => {
		setPaymentForm({
			amount: payment.amount === null ? "" : String(payment.amount),
			id: payment.id,
			paymentDate: payment.paymentDate ?? "",
			percent: payment.percent === null ? "" : String(payment.percent),
			stageId: payment.stageId,
			status: payment.status,
			waitingDays:
				payment.waitingDays === null ? "" : String(payment.waitingDays),
		});
		setIsPaymentModalOpen(true);
	};

	const handleStageSubmit = async () => {
		if (!project?.id) {
			return;
		}

		const title = stageForm.title.trim() || getStageTypeLabel(stageForm.stageType);
		const eventKind = getStageEventKind(stageForm.stageType);
		const eventPayload = {
			eventKind,
			factEndDate:
				eventKind === "duration" ? stageForm.factEndDate || null : null,
			factStartDate: stageForm.factStartDate || null,
			planEndDate:
				eventKind === "duration" ? stageForm.planEndDate || null : null,
			planStartDate: stageForm.planStartDate || null,
			title,
		};

		if (stageForm.id) {
			await updateProjectGanttStage(stageForm.id, {
				stageType: stageForm.stageType,
				title,
			});

			const stageEvent =
				stageForm.eventId ??
				events.find((event) => event.stageId === stageForm.id)?.id ??
				null;

			if (stageEvent) {
				await updateProjectGanttEvent(stageEvent, {
					...eventPayload,
					stageId: stageForm.id,
				});
			} else {
				await createProjectGanttEvent(String(project.id), {
					...eventPayload,
					sortOrder: events.length,
					stageId: stageForm.id,
				});
			}
		} else {
			const createdStage = await createProjectGanttStage(String(project.id), {
				sortOrder: stages.length,
				stageType: stageForm.stageType,
				title,
			});
			const createdEvents = await fetchProjectGanttEvents(String(project.id));
			const createdStageEvent = createdEvents.find(
				(event) => event.stageId === createdStage.id,
			);

			if (createdStageEvent) {
				await updateProjectGanttEvent(createdStageEvent.id, {
					...eventPayload,
					stageId: createdStage.id,
				});
			} else {
				await createProjectGanttEvent(String(project.id), {
					...eventPayload,
					sortOrder: events.length,
					stageId: createdStage.id,
				});
			}
		}

		setIsStageModalOpen(false);
		await refreshData();
	};

	const handleStageDelete = async () => {
		if (!stageForm.id) {
			return;
		}

		if (deletingStageId !== stageForm.id) {
			setDeletingStageId(stageForm.id);
			return;
		}

		await deleteProjectGanttStage(stageForm.id);
		setDeletingStageId(null);
		setIsStageModalOpen(false);
		await refreshData();
	};

	const handleEventSubmit = async () => {
		if (!project?.id || !eventForm.stageId || !eventForm.title.trim()) {
			return;
		}

		const payload = {
			eventKind: eventForm.eventKind,
			factEndDate:
				eventForm.eventKind === "duration" ? eventForm.factEndDate || null : null,
			factStartDate: eventForm.factStartDate || null,
			planEndDate:
				eventForm.eventKind === "duration" ? eventForm.planEndDate || null : null,
			planStartDate: eventForm.planStartDate || null,
			stageId: eventForm.stageId,
			title: eventForm.title.trim(),
		};

		if (eventForm.id) {
			await updateProjectGanttEvent(eventForm.id, payload);
		} else {
			await createProjectGanttEvent(String(project.id), {
				...payload,
				sortOrder: events.length,
			});
		}

		setIsEventModalOpen(false);
		await refreshData();
	};

	const handleEventDelete = async () => {
		if (!eventForm.id) {
			return;
		}

		if (deletingEventId !== eventForm.id) {
			setDeletingEventId(eventForm.id);
			return;
		}

		await deleteProjectGanttEvent(eventForm.id);
		setDeletingEventId(null);
		setIsEventModalOpen(false);
		await refreshData();
	};

	const handlePaymentSubmit = async () => {
		if (!project?.id || !paymentForm.stageId) {
			return;
		}

		const payload = {
			amount: toNumberOrNull(
				calculatePaymentFields({
					amount: paymentForm.amount,
					percent: paymentForm.percent,
					projectAmount: project.projectAmount,
					source: paymentForm.amount ? "amount" : "percent",
				}).amount,
			),
			paymentDate: paymentForm.paymentDate || null,
			percent: toNumberOrNull(
				calculatePaymentFields({
					amount: paymentForm.amount,
					percent: paymentForm.percent,
					projectAmount: project.projectAmount,
					source: paymentForm.amount ? "amount" : "percent",
				}).percent,
			),
			stageId: paymentForm.stageId,
			status: paymentForm.status,
			waitingDays: toNumberOrNull(paymentForm.waitingDays),
		};

		if (paymentForm.id) {
			await updateAutonomousProjectPayment(paymentForm.id, payload);
		} else {
			await createAutonomousProjectPayment(String(project.id), {
				...payload,
				sortOrder: payments.length,
			});
		}

		setIsPaymentModalOpen(false);
		await refreshData();
		onPaymentsChanged?.();
	};

	const handlePaymentDelete = async () => {
		if (!paymentForm.id) {
			return;
		}

		if (deletingPaymentId !== paymentForm.id) {
			setDeletingPaymentId(paymentForm.id);
			return;
		}

		await deleteAutonomousProjectPayment(paymentForm.id);
		setDeletingPaymentId(null);
		setIsPaymentModalOpen(false);
		await refreshData();
		onPaymentsChanged?.();
	};

	if (!project) {
		return <div className={styles.emptyState}>Проект не выбран</div>;
	}

	return (
		<>
			<div className={styles.ganttCard}>
				<div className={styles.autonomousGanttToolbar}>
					<strong>Гант проекта</strong>
				</div>
				{error ? <div className={styles.emptyState}>{error}</div> : null}
				{isLoading ? (
					<div className={styles.emptyState}>Загрузка Ганта...</div>
				) : (
					<div className={styles.ganttBoard}>
						<div className={styles.ganttScaleLabel}>Этапы проекта</div>
						<div className={styles.ganttScale}>
							<GanttScale monthTicks={monthTicks} weekTicks={scaleWeekTicks} />
						</div>
						{gantt.rows.map((row) => (
							<AutonomousStageRow
								key={row.stage.id}
								monthTicks={monthTicks}
								onEventCreate={() =>
									row.stage.code === "payments"
										? openPaymentCreateModal()
										: openEventCreateModal(row.stage)
								}
								onEventEdit={openEventEditModal}
								onPaymentEdit={openPaymentEditModal}
								onStageEdit={openStageEditModal}
								row={row}
								stageById={stageById}
								timeline={gantt.timeline}
								weekTicks={weekTicks}
							/>
						))}
						<div className={`${styles.ganttRowInfo} ${styles.ganttAddEventCell}`}>
							<button
								type="button"
								className={styles.ganttAddEventButton}
								onClick={openStageCreateModal}
							>
								+
							</button>
						</div>
						<div className={styles.ganttTrack}>
							<GanttTrackGrid monthTicks={monthTicks} weekTicks={weekTicks} />
						</div>
					</div>
				)}
			</div>
			<StageModal
				deletingStageId={deletingStageId}
				form={stageForm}
				isOpen={isStageModalOpen}
				onClose={() => {
					setDeletingStageId(null);
					setIsStageModalOpen(false);
				}}
				onDelete={handleStageDelete}
				onFormChange={setStageForm}
				onSubmit={handleStageSubmit}
				stage={stageForm.id ? stageById.get(stageForm.id) : null}
			/>
			<EventModal
				deletingEventId={deletingEventId}
				form={eventForm}
				isOpen={isEventModalOpen}
				onClose={() => {
					setDeletingEventId(null);
					setIsEventModalOpen(false);
				}}
				onDelete={handleEventDelete}
				onFormChange={setEventForm}
				onSubmit={handleEventSubmit}
			/>
			<PaymentModal
				deletingPaymentId={deletingPaymentId}
				form={paymentForm}
				isOpen={isPaymentModalOpen}
				onClose={() => {
					setDeletingPaymentId(null);
					setIsPaymentModalOpen(false);
				}}
				onDelete={handlePaymentDelete}
				onFormChange={setPaymentForm}
				onSubmit={handlePaymentSubmit}
				projectAmount={project.projectAmount}
				stages={stages}
			/>
		</>
	);
};

const AutonomousStageRow = ({
	monthTicks,
	onEventCreate,
	onEventEdit,
	onPaymentEdit,
	onStageEdit,
	row,
	stageById,
	timeline,
	weekTicks,
}: {
	monthTicks: GanttMonthTick[];
	onEventCreate: () => void;
	onEventEdit: (event: ProjectGanttEvent) => void;
	onPaymentEdit: (payment: AutonomousProjectPayment) => void;
	onStageEdit: (stage: ProjectGanttStage) => void;
	row: ReturnType<typeof buildAutonomousProjectGantt>["rows"][number];
	stageById: Map<number, ProjectGanttStage>;
	timeline: ReturnType<typeof buildAutonomousProjectGantt>["timeline"];
	weekTicks: GanttWeekTick[];
}) => {
	const isPaymentsStage = row.stage.code === "payments";

	return (
		<>
			<div className={styles.ganttRowInfo}>
				<div className={styles.ganttCustomEventHeader}>
					<strong>{row.stage.title}</strong>
					{!row.stage.isDefault && row.stage.code !== "payments" ? (
						<button
							type="button"
							className={styles.ganttCustomEventMenuButton}
							onClick={() => onStageEdit(row.stage)}
						>
							...
						</button>
					) : null}
				</div>
				<span>
					{isPaymentsStage
						? "Платежи проекта"
						: "Пользовательский этап проекта"}
				</span>
			</div>
			<div
				className={styles.autonomousGanttTrack}
				onClick={onEventCreate}
				onKeyDown={(event) => {
					if (event.key === "Enter" || event.key === " ") {
						onEventCreate();
					}
				}}
				role="button"
				tabIndex={0}
			>
				<GanttTrackGrid monthTicks={monthTicks} weekTicks={weekTicks} />
				{row.events.map((event) => (
					<AutonomousEventItem
						event={event}
						key={event.event.id}
						onEdit={onEventEdit}
						timeline={timeline}
					/>
				))}
				{row.payments.map((payment, index) => (
					<AutonomousPaymentItem
						key={payment.id}
						onEdit={onPaymentEdit}
						payment={payment}
						stageTitle={stageById.get(payment.stageId)?.title ?? "—"}
						timeline={timeline}
						top={16 + index * 34}
					/>
				))}
			</div>
		</>
	);
};

const AutonomousEventItem = ({
	event,
	onEdit,
	timeline,
}: {
	event: ReturnType<typeof buildAutonomousProjectGantt>["rows"][number]["events"][number];
	onEdit: (event: ProjectGanttEvent) => void;
	timeline: ReturnType<typeof buildAutonomousProjectGantt>["timeline"];
}) => {
	const style = getAutonomousEventStyle(event, timeline);

	if (!style) {
		return <span className={styles.ganttNoDate}>Дата не заполнена</span>;
	}

	return event.event.eventKind === "duration" ? (
		<button
			type="button"
			className={`${styles.ganttSegment} ${styles.ganttCustomEventSegment}`}
			onClick={(clickEvent) => {
				clickEvent.stopPropagation();
				onEdit(event.event);
			}}
			style={style}
			title={formatAutonomousEventTooltip(event)}
		>
			{event.event.title}
		</button>
	) : (
		<button
			type="button"
			className={`${styles.ganttMilestone} ${styles.ganttCustomEventMarker}`}
			onClick={(clickEvent) => {
				clickEvent.stopPropagation();
				onEdit(event.event);
			}}
			style={style}
			title={formatAutonomousEventTooltip(event)}
		>
			<b />
			<small>
				{event.event.title}
				<br />
				{formatDateShort(event.displayDate)}
			</small>
		</button>
	);
};

const AutonomousPaymentItem = ({
	onEdit,
	payment,
	stageTitle,
	timeline,
	top,
}: {
	onEdit: (payment: AutonomousProjectPayment) => void;
	payment: AutonomousProjectPayment;
	stageTitle: string;
	timeline: ReturnType<typeof buildAutonomousProjectGantt>["timeline"];
	top: number;
}) => {
	const paymentDate = parseGanttDate(payment.paymentDate);
	const style = paymentDate
		? {
				...getMilestoneStyle(paymentDate, timeline),
				top,
			}
		: { left: "12px", top };

	return (
		<button
			type="button"
			className={`${styles.ganttMilestone} ${styles.autonomousPaymentMarker} ${
				styles[`autonomousPayment${payment.status}`] ?? ""
			}`}
			onClick={(clickEvent) => {
				clickEvent.stopPropagation();
				onEdit(payment);
			}}
			style={style}
			title={formatAutonomousPaymentTooltip(payment, stageTitle)}
		>
			<b>
				<FaMoneyBillWave aria-hidden="true" />
			</b>
			<small>
				{payment.percent ?? "—"}%
				<br />
				{formatMoney(payment.amount ?? 0)}
			</small>
		</button>
	);
};

const StageModal = ({
	deletingStageId,
	form,
	isOpen,
	onClose,
	onDelete,
	onFormChange,
	onSubmit,
	stage,
}: {
	deletingStageId: number | null;
	form: StageFormState;
	isOpen: boolean;
	onClose: () => void;
	onDelete: () => void;
	onFormChange: (value: StageFormState) => void;
	onSubmit: () => void;
	stage: ProjectGanttStage | null | undefined;
}) => {
	const isDurationStage = DURATION_STAGE_TYPES.has(form.stageType);

	return (
		<Modal isOpen={isOpen} onClose={onClose} size="small">
			<div className={styles.ganttFormModal}>
				<h3>{form.id ? "Редактирование этапа" : "Новый этап"}</h3>
				<label>
					<span>Тип этапа</span>
					<select
						value={form.stageType}
						onChange={(event) => {
							const stageType = event.target.value as ProjectGanttStageType;
							const previousDefaultTitle = getStageTypeLabel(form.stageType);
							const shouldUseDefaultTitle =
								!form.title.trim() || form.title === previousDefaultTitle;

							onFormChange({
								...form,
								stageType,
								title: shouldUseDefaultTitle
									? getStageTypeLabel(stageType)
									: form.title,
							});
						}}
					>
						{STAGE_TYPE_OPTIONS.map((option) => (
							<option key={option.value} value={option.value}>
								{option.label}
							</option>
						))}
					</select>
				</label>
				<label>
					<span>Название</span>
					<input
						value={form.title}
						onChange={(event) =>
							onFormChange({
								...form,
								title: event.target.value,
							})
						}
					/>
				</label>
				<div className={styles.ganttFormGrid}>
					<label>
						<span>
							{isDurationStage ? "Плановая дата начала" : "Плановая дата"}
						</span>
						<input
							type="date"
							value={form.planStartDate}
							onChange={(event) =>
								onFormChange({
									...form,
									planStartDate: event.target.value,
								})
							}
						/>
					</label>
					{isDurationStage ? (
						<label>
							<span>Плановая дата завершения</span>
							<input
								type="date"
								value={form.planEndDate}
								onChange={(event) =>
									onFormChange({
										...form,
										planEndDate: event.target.value,
									})
								}
							/>
						</label>
					) : null}
					<label>
						<span>
							{isDurationStage ? "Фактическая дата начала" : "Фактическая дата"}
						</span>
						<input
							type="date"
							value={form.factStartDate}
							onChange={(event) =>
								onFormChange({
									...form,
									factStartDate: event.target.value,
								})
							}
						/>
					</label>
					{isDurationStage ? (
						<label>
							<span>Фактическая дата завершения</span>
							<input
								type="date"
								value={form.factEndDate}
								onChange={(event) =>
									onFormChange({
										...form,
										factEndDate: event.target.value,
									})
								}
							/>
						</label>
					) : null}
				</div>
				<div className={styles.ganttFormActions}>
					{form.id && stage?.code !== "payments" && !stage?.isDefault ? (
						<button
							type="button"
							className={styles.ganttFormDeleteButton}
							onClick={onDelete}
						>
							{deletingStageId === form.id
								? "Подтвердить удаление"
								: "Удалить"}
						</button>
					) : null}
					<button type="button" onClick={onSubmit}>
						Сохранить
					</button>
				</div>
			</div>
		</Modal>
	);
};

const EventModal = ({
	deletingEventId,
	form,
	isOpen,
	onClose,
	onDelete,
	onFormChange,
	onSubmit,
}: {
	deletingEventId: number | null;
	form: EventFormState;
	isOpen: boolean;
	onClose: () => void;
	onDelete: () => void;
	onFormChange: (value: EventFormState) => void;
	onSubmit: () => void;
}) => (
	<Modal isOpen={isOpen} onClose={onClose} size="small">
		<div className={styles.ganttFormModal}>
			<h3>{form.id ? "Редактирование события" : "Новое событие"}</h3>
			<label>
				<span>Название</span>
				<input
					value={form.title}
					onChange={(event) =>
						onFormChange({
							...form,
							title: event.target.value,
						})
					}
				/>
			</label>
			<label>
				<span>Тип события</span>
				<select
					value={form.eventKind}
					onChange={(event) =>
						onFormChange({
							...form,
							eventKind: event.target.value as AutonomousGanttEventKind,
						})
					}
				>
					<option value="one_time">Разовое событие</option>
					<option value="duration">Событие с продолжительностью</option>
				</select>
			</label>
			<div className={styles.ganttFormGrid}>
				<label>
					<span>Плановая дата начала</span>
					<input
						type="date"
						value={form.planStartDate}
						onChange={(event) =>
							onFormChange({
								...form,
								planStartDate: event.target.value,
							})
						}
					/>
				</label>
				{form.eventKind === "duration" ? (
					<label>
						<span>Плановая дата завершения</span>
						<input
							type="date"
							value={form.planEndDate}
							onChange={(event) =>
								onFormChange({
									...form,
									planEndDate: event.target.value,
								})
							}
						/>
					</label>
				) : null}
				<label>
					<span>Фактическая дата начала</span>
					<input
						type="date"
						value={form.factStartDate}
						onChange={(event) =>
							onFormChange({
								...form,
								factStartDate: event.target.value,
							})
						}
					/>
				</label>
				{form.eventKind === "duration" ? (
					<label>
						<span>Фактическая дата завершения</span>
						<input
							type="date"
							value={form.factEndDate}
							onChange={(event) =>
								onFormChange({
									...form,
									factEndDate: event.target.value,
								})
							}
						/>
					</label>
				) : null}
			</div>
			<div className={styles.ganttFormActions}>
				{form.id ? (
					<button
						type="button"
						className={styles.ganttFormDeleteButton}
						onClick={onDelete}
					>
						{deletingEventId === form.id ? "Подтвердить удаление" : "Удалить"}
					</button>
				) : null}
				<button type="button" onClick={onSubmit}>
					Сохранить
				</button>
			</div>
		</div>
	</Modal>
);

export const PaymentModal = ({
	deletingPaymentId,
	form,
	isOpen,
	onClose,
	onDelete,
	onFormChange,
	onSubmit,
	projectAmount,
	stages,
}: {
	deletingPaymentId: number | null;
	form: PaymentFormState;
	isOpen: boolean;
	onClose: () => void;
	onDelete: () => void;
	onFormChange: (value: PaymentFormState) => void;
	onSubmit: () => void;
	projectAmount?: number | null;
	stages: ProjectGanttStage[];
}) => (
	<Modal isOpen={isOpen} onClose={onClose} size="small">
		<div className={styles.ganttFormModal}>
			<h3>{form.id ? "Редактирование оплаты" : "Новая оплата"}</h3>
			<label>
				<span>Стадия</span>
				<select
					value={form.status}
					onChange={(event) =>
						onFormChange({
							...form,
							status: event.target.value as AutonomousPaymentStatus,
						})
					}
				>
					<option value="todo">Нужно выполнить</option>
					<option value="debt">Дебиторка</option>
					<option value="paid">Оплачено</option>
					<option value="canceled">Отменено</option>
				</select>
			</label>
			<label>
				<span>Этап, к которому привязана оплата</span>
				<select
					value={form.stageId ?? ""}
					onChange={(event) =>
						onFormChange({
							...form,
							stageId: Number(event.target.value),
						})
					}
				>
					{stages
						.filter((stage) => stage.code !== "payments")
						.map((stage) => (
							<option key={stage.id} value={stage.id}>
								{stage.title}
							</option>
						))}
				</select>
			</label>
			<div className={styles.ganttFormGrid}>
				<label>
					<span>Дата платежа</span>
					<input
						type="date"
						value={form.paymentDate}
						onChange={(event) =>
							onFormChange({
								...form,
								paymentDate: event.target.value,
							})
						}
					/>
				</label>
				<label>
					<span>Процент от проекта</span>
					<input
						value={form.percent}
						onChange={(event) =>
							onFormChange({
								...form,
								...calculatePaymentFields({
									amount: form.amount,
									percent: event.target.value,
									projectAmount,
									source: "percent",
								}),
							})
						}
					/>
				</label>
				<label>
					<span>Сумма от проекта</span>
					<input
						value={form.amount}
						onChange={(event) =>
							onFormChange({
								...form,
								...calculatePaymentFields({
									amount: event.target.value,
									percent: form.percent,
									projectAmount,
									source: "amount",
								}),
							})
						}
					/>
				</label>
				<label>
					<span>Дней ожидания</span>
					<input
						value={form.waitingDays}
						onChange={(event) =>
							onFormChange({
								...form,
								waitingDays: event.target.value,
							})
						}
					/>
				</label>
			</div>
			<div className={styles.ganttFormActions}>
				{form.id ? (
					<button
						type="button"
						className={styles.ganttFormDeleteButton}
						onClick={onDelete}
					>
						{deletingPaymentId === form.id
							? "Подтвердить удаление"
							: "Удалить"}
					</button>
				) : null}
				<button type="button" onClick={onSubmit}>
					Сохранить
				</button>
			</div>
		</div>
	</Modal>
);

const GanttScale = ({
	monthTicks,
	weekTicks,
}: {
	monthTicks: GanttMonthTick[];
	weekTicks: GanttWeekTick[];
}) => (
	<div className={styles.ganttScaleHeader}>
		<div className={styles.ganttMonthScale}>
			{monthTicks.map((tick) => (
				<span key={tick.date.toISOString()} style={tick.style}>
					{tick.label}
				</span>
			))}
		</div>
		<div className={styles.ganttWeekScale}>
			{weekTicks.map((tick) => (
				<span key={tick.date.toISOString()} style={tick.style}>
					{tick.label}
				</span>
			))}
		</div>
	</div>
);

const GanttTrackGrid = ({
	monthTicks,
	weekTicks,
}: {
	monthTicks: GanttMonthTick[];
	weekTicks: GanttWeekTick[];
}) => (
	<>
		{weekTicks.map((tick) => (
			<i
				key={`week-${tick.date.toISOString()}`}
				className={styles.ganttTrackWeekLine}
				style={tick.style}
			/>
		))}
		{monthTicks.map((tick) => (
			<i
				key={`month-${tick.date.toISOString()}`}
				className={styles.ganttTrackMonthLine}
				style={{ left: tick.style.left }}
			/>
		))}
	</>
);
