import { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
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
	getSegmentStyle,
	getWeekTicks,
	parseGanttDate,
} from "../model/ganttUtils";
import { formatMoney } from "../model/profitabilityUtils";
import type {
	AutonomousGanttEventKind,
	AutonomousPaymentAnchor,
	AutonomousPaymentStatus,
	AutonomousProjectPayment,
	ProjectGanttEvent,
	ProjectGanttStage,
	ProjectGanttStageType,
	ReportProject,
} from "../model/types";
import styles from "../SalesProfitabilityReport.module.scss";

type StageFormState = {
	dependsOnStageId: number | null;
	durationDays: string;
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
	paymentAnchor: AutonomousPaymentAnchor;
	paymentDate: string;
	percent: string;
	stageId: number | null;
	status: AutonomousPaymentStatus;
	waitingDays: string;
};

const DEFAULT_STAGE_FORM: StageFormState = {
	dependsOnStageId: null,
	durationDays: "",
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
	paymentAnchor: "stage_end",
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

const getDateMin = (left: Date | null, right: Date | null) => {
	if (!left) return right;
	if (!right) return left;

	return dayjs(left).isBefore(right) ? left : right;
};

const getDateMax = (left: Date | null, right: Date | null) => {
	if (!left) return right;
	if (!right) return left;

	return dayjs(left).isAfter(right) ? left : right;
};

const isPaymentPaid = (payment: AutonomousProjectPayment) =>
	payment.status === "paid";

const getInnerSegmentStyle = (
	start: Date,
	end: Date,
	shellStart: Date,
	shellEnd: Date,
) => {
	const totalTime = Math.max(shellEnd.getTime() - shellStart.getTime(), 1);
	const left = Math.max(
		0,
		((start.getTime() - shellStart.getTime()) / totalTime) * 100,
	);
	const right = Math.min(
		100,
		((end.getTime() - shellStart.getTime()) / totalTime) * 100,
	);

	return {
		left: `${left}%`,
		width: `${Math.max(right - left, 0.8)}%`,
	};
};

const getAutonomousEventClassName = (
	event: ProjectGanttEvent,
	stageType: ProjectGanttStage["stageType"],
	today: Date,
) => {
	const planStartDate = parseGanttDate(event.planStartDate);
	const planEndDate = parseGanttDate(event.planEndDate);
	const factStartDate = parseGanttDate(event.factStartDate);
	const factEndDate = parseGanttDate(event.factEndDate);

	if (
		planEndDate &&
		((factEndDate && factEndDate > planEndDate) ||
			(!factEndDate && today > planEndDate))
	) {
		return styles.ganttAutonomousEventOverdue;
	}

	if (planEndDate && factEndDate && factEndDate < planEndDate) {
		return styles.ganttAutonomousEventReserve;
	}

	if (planStartDate && factStartDate && factStartDate > planStartDate) {
		return styles.ganttAutonomousEventLate;
	}

	if (planStartDate && factStartDate && factStartDate < planStartDate) {
		return styles.ganttAutonomousEventEarly;
	}

	if (stageType === "tz_signing") {
		return styles.ganttAutonomousEventSigning;
	}

	if (stageType === "closing") {
		return styles.ganttAutonomousEventClosing;
	}

	if (event.eventKind === "duration" && (factStartDate || factEndDate)) {
		return styles.ganttAutonomousEventFact;
	}

	if (event.eventKind === "duration") {
		return styles.ganttAutonomousEventPlan;
	}

	return "";
};

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
		void paymentsRefreshKey;

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
			dependsOnStageId: stage.dependsOnStageId,
			durationDays: stage.durationDays === null ? "" : String(stage.durationDays),
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
		const stageId = editableStages[0]?.id ?? stages[0]?.id ?? null;

		setPaymentForm({
			...DEFAULT_PAYMENT_FORM,
			paymentDate: "",
			stageId,
		});
		setIsPaymentModalOpen(true);
	};

	const openPaymentEditModal = (payment: AutonomousProjectPayment) => {
		setPaymentForm({
			amount: payment.amount === null ? "" : String(payment.amount),
			id: payment.id,
			paymentAnchor: payment.paymentAnchor ?? "stage_end",
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
		const isDependencyStage = Boolean(stageForm.dependsOnStageId);
		const eventKind = isDependencyStage
			? "duration"
			: getStageEventKind(stageForm.stageType);
		const eventPayload = {
			eventKind,
			factEndDate:
				!isDependencyStage && eventKind === "duration"
					? stageForm.factEndDate || null
					: null,
			factStartDate: isDependencyStage ? null : stageForm.factStartDate || null,
			planEndDate:
				!isDependencyStage && eventKind === "duration"
					? stageForm.planEndDate || null
					: null,
			planStartDate: isDependencyStage ? null : stageForm.planStartDate || null,
			title,
		};
		const stagePayload = {
			dependsOnStageId: stageForm.dependsOnStageId,
			durationDays: toNumberOrNull(stageForm.durationDays),
			stageType: stageForm.stageType,
			title,
		};

		if (stageForm.id) {
			await updateProjectGanttStage(stageForm.id, stagePayload);

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
				...stagePayload,
				sortOrder: stages.length,
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
		onPaymentsChanged?.();
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

	const handlePaymentSubmit = async (submittedPaymentForm: PaymentFormState) => {
		setPaymentForm(submittedPaymentForm);

		if (!project?.id || !submittedPaymentForm.stageId) {
			return;
		}

		const normalizedPaymentStatus: AutonomousPaymentStatus =
			submittedPaymentForm.status === "paid" ? "paid" : "todo";
		const payload = {
			amount: toNumberOrNull(
				calculatePaymentFields({
					amount: submittedPaymentForm.amount,
					percent: submittedPaymentForm.percent,
					projectAmount: project.projectAmount,
					source: submittedPaymentForm.amount ? "amount" : "percent",
				}).amount,
			),
			paymentAnchor: submittedPaymentForm.paymentAnchor,
			paymentDate: null,
			percent: toNumberOrNull(
				calculatePaymentFields({
					amount: submittedPaymentForm.amount,
					percent: submittedPaymentForm.percent,
					projectAmount: project.projectAmount,
					source: submittedPaymentForm.amount ? "amount" : "percent",
				}).percent,
			),
			stageId: submittedPaymentForm.stageId,
			status: normalizedPaymentStatus,
			waitingDays: toNumberOrNull(submittedPaymentForm.waitingDays),
		};

		if (submittedPaymentForm.id) {
			await updateAutonomousProjectPayment(submittedPaymentForm.id, payload);
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
					<div>
						<h3>Диаграмма Ганта: {project.title}</h3>
						<span>План пересчитывается по зависимостям между этапами</span>
					</div>
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
								onPaymentCreate={openPaymentCreateModal}
								onEventEdit={openEventEditModal}
								onPaymentEdit={openPaymentEditModal}
								onStageEdit={openStageEditModal}
								row={row}
								stageById={stageById}
								today={today}
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
				<AutonomousGanttLegend />
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
				stages={editableStages}
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
	onEventEdit,
	onPaymentCreate,
	onPaymentEdit,
	onStageEdit,
	row,
	stageById,
	today,
	timeline,
	weekTicks,
}: {
	monthTicks: GanttMonthTick[];
	onEventEdit: (event: ProjectGanttEvent) => void;
	onPaymentCreate: () => void;
	onPaymentEdit: (payment: AutonomousProjectPayment) => void;
	onStageEdit: (stage: ProjectGanttStage) => void;
	row: ReturnType<typeof buildAutonomousProjectGantt>["rows"][number];
	stageById: Map<number, ProjectGanttStage>;
	today: Date;
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
				onClick={isPaymentsStage ? onPaymentCreate : undefined}
				onKeyDown={
					isPaymentsStage
						? (event) => {
								if (event.key === "Enter" || event.key === " ") {
									onPaymentCreate();
								}
							}
						: undefined
				}
				role={isPaymentsStage ? "button" : undefined}
				tabIndex={isPaymentsStage ? 0 : undefined}
			>
				<GanttTrackGrid monthTicks={monthTicks} weekTicks={weekTicks} />
				{row.events.map((event) => (
					<AutonomousEventItem
						event={event}
						key={event.event.id}
						onEdit={onEventEdit}
						stageType={row.stage.stageType}
						today={today}
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
						top={16 + index * 46}
					/>
				))}
			</div>
		</>
	);
};

const AutonomousEventItem = ({
	event,
	onEdit,
	stageType,
	today,
	timeline,
}: {
	event: ReturnType<typeof buildAutonomousProjectGantt>["rows"][number]["events"][number];
	onEdit: (event: ProjectGanttEvent) => void;
	stageType: ProjectGanttStage["stageType"];
	today: Date;
	timeline: ReturnType<typeof buildAutonomousProjectGantt>["timeline"];
}) => {
	const style = getAutonomousEventStyle(event, timeline);
	const eventClassName = getAutonomousEventClassName(
		event.event,
		stageType,
		today,
	);

	if (!style) {
		return <span className={styles.ganttNoDate}>Дата не заполнена</span>;
	}

	if (event.event.eventKind === "duration") {
		const planSegment =
			event.planStart && event.planEnd
				? {
						end: event.planEnd,
						start: event.planStart,
					}
				: null;
		const factEnd = event.factEnd ?? (event.factStart ? today : null);
		const boundaryDates = [
			event.planStart,
			event.planEnd,
			event.factStart,
			factEnd,
		]
			.filter((date): date is Date => Boolean(date))
			.toSorted((left, right) => left.getTime() - right.getTime())
			.filter(
				(date, index, dates) =>
					index === 0 || date.getTime() !== dates[index - 1].getTime(),
			);
		const fallbackSegments =
			!planSegment && event.displayStart && event.displayEnd
				? {
						className: eventClassName || styles.ganttAutonomousEventFact,
						end: event.displayEnd,
						start: event.displayStart,
					}
				: null;
		const segments = planSegment
			? boundaryDates
					.slice(0, -1)
					.map((start, index) => {
						const end = boundaryDates[index + 1];
						const isInsidePlan = start >= planSegment.start && end <= planSegment.end;
						const isInsideFact =
							Boolean(event.factStart && factEnd) &&
							start >= (event.factStart ?? start) &&
							end <= (factEnd ?? end);
						const isEarlyStart =
							Boolean(event.factStart && event.planStart) &&
							start < (event.planStart ?? start) &&
							end <= (event.planStart ?? end);
						const isLateStart =
							Boolean(event.factStart) &&
							isInsidePlan &&
							start < (event.factStart ?? start);
						const isOverdue =
							Boolean(event.planEnd) &&
							start >= (event.planEnd ?? start) &&
							Boolean(factEnd);
						const isReserve =
							Boolean(event.factEnd && event.planEnd) &&
							start >= (event.factEnd ?? start) &&
							end <= (event.planEnd ?? end);

						if (!isInsidePlan && !isInsideFact && !isEarlyStart && !isOverdue) {
							return null;
						}

						return {
							className: isOverdue
								? styles.ganttAutonomousEventOverdue
								: isEarlyStart
									? styles.ganttAutonomousEventEarly
									: isLateStart
										? styles.ganttAutonomousEventLate
										: isReserve
											? styles.ganttAutonomousEventReserve
											: isInsideFact
												? styles.ganttAutonomousEventFact
												: styles.ganttAutonomousEventPlan,
							end,
							start,
						};
					})
					.filter(Boolean)
			: [fallbackSegments].filter(Boolean);
		const normalizedSegments = segments.filter((segment): segment is {
			className: string;
			end: Date;
			start: Date;
		} => Boolean(segment));

		const segmentStarts = normalizedSegments.map((segment) => segment.start);
		const segmentEnds = normalizedSegments.map((segment) => segment.end);
		const shellStart = segmentStarts.reduce<Date | null>(
			(minDate, date) => getDateMin(minDate, date),
			null,
		);
		const shellEnd = segmentEnds.reduce<Date | null>(
			(maxDate, date) => getDateMax(maxDate, date),
			null,
		);

		if (!shellStart || !shellEnd) {
			return <span className={styles.ganttNoDate}>Дата не заполнена</span>;
		}

		return (
			<button
				type="button"
				className={`${styles.ganttSegment} ${styles.ganttCustomEventSegmentShell}`}
				onClick={(clickEvent) => {
					clickEvent.stopPropagation();
					onEdit(event.event);
				}}
				style={getSegmentStyle(shellStart, shellEnd, timeline)}
				title={formatAutonomousEventTooltip(event)}
			>
				{normalizedSegments.map((segment) => (
					<span
						key={`${segment.className}-${segment.start.toISOString()}-${segment.end.toISOString()}`}
						className={`${styles.ganttCustomEventSegment} ${segment.className}`}
						style={getInnerSegmentStyle(
							segment.start,
							segment.end,
							shellStart,
							shellEnd,
						)}
					/>
				))}
			</button>
		);
	}

	return (
		<button
			type="button"
			className={`${styles.ganttMilestone} ${styles.ganttCustomEventMarker} ${eventClassName}`}
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

const AutonomousGanttLegend = () => (
	<div className={styles.ganttLegend}>
		<span>
			<i className={styles.legendPlan} /> Плановый период
		</span>
		<span>
			<i className={styles.legendFact} /> Фактическая работа
		</span>
		<span>
			<i className={styles.legendLate} /> Поздний старт
		</span>
		<span>
			<i className={styles.legendEarly} /> Ранний старт
		</span>
		<span>
			<i className={styles.legendOverdue} /> Просрочка завершения
		</span>
		<span>
			<i className={styles.legendReserve} /> Запас до планового срока
		</span>
		<span>
			<i className={styles.legendSign} /> Подписание ТЗ
		</span>
		<span>
			<i className={styles.legendClose} /> Акт / закрытие
		</span>
	</div>
);

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
				isPaymentPaid(payment)
					? styles.autonomousPaymentPaid
					: styles.autonomousPaymentUnpaid
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
			<small>{formatMoney(payment.amount ?? 0)}</small>
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
	stages,
}: {
	deletingStageId: number | null;
	form: StageFormState;
	isOpen: boolean;
	onClose: () => void;
	onDelete: () => void;
	onFormChange: (value: StageFormState) => void;
	onSubmit: () => void;
	stage: ProjectGanttStage | null | undefined;
	stages: ProjectGanttStage[];
}) => {
	const isDurationStage = DURATION_STAGE_TYPES.has(form.stageType);
	const isDependencyStage = Boolean(form.dependsOnStageId);
	const availableDependencyStages = stages.filter((item) => item.id !== form.id);

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
				<label>
					<span>Привязка к этапу</span>
					<select
						value={form.dependsOnStageId ?? ""}
						onChange={(event) =>
							onFormChange({
								...form,
								dependsOnStageId: event.target.value
									? Number(event.target.value)
									: null,
							})
						}
					>
						<option value="">Без привязки</option>
						{availableDependencyStages.map((item) => (
							<option key={item.id} value={item.id}>
								После этапа: {item.title}
							</option>
						))}
					</select>
				</label>
				{isDependencyStage ? (
					<label>
						<span>Длительность, дней</span>
						<input
							value={form.durationDays}
							onChange={(event) =>
								onFormChange({
									...form,
									durationDays: event.target.value,
								})
							}
						/>
					</label>
				) : null}
				<div className={styles.ganttFormGrid}>
					{!isDependencyStage ? (
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
					) : null}
					{!isDependencyStage && isDurationStage ? (
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
					{!isDependencyStage ? (
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
					) : null}
					{!isDependencyStage && isDurationStage ? (
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
	onSubmit: (value: PaymentFormState) => void;
	projectAmount?: number | null;
	stages: ProjectGanttStage[];
}) => (
	<Modal isOpen={isOpen} onClose={onClose} size="small">
		<form
			className={styles.ganttFormModal}
			onSubmit={(event) => {
				event.preventDefault();
				onSubmit(form);
			}}
		>
			<h3>{form.id ? "Редактирование оплаты" : "Новая оплата"}</h3>
			<label>
				<span>Стадия</span>
				<select
					value={form.status === "paid" ? "paid" : "todo"}
					onChange={(event) =>
						onFormChange({
							...form,
							status: event.target.value as AutonomousPaymentStatus,
						})
					}
				>
					<option value="paid">Оплачено</option>
					<option value="todo">Неоплачено</option>
				</select>
			</label>
			<label>
				<span>Этап, к которому привязана оплата</span>
				<select
					value={form.stageId ?? ""}
					onChange={(event) => {
						const stageId = Number(event.target.value);

						onFormChange({
							...form,
							stageId,
						});
					}}
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
			<label>
				<span>Дата оплаты от этапа</span>
				<select
					value={form.paymentAnchor}
					onChange={(event) =>
						onFormChange({
							...form,
							paymentAnchor: event.target.value as PaymentFormState["paymentAnchor"],
						})
					}
				>
					<option value="stage_start">К началу этапа</option>
					<option value="stage_end">К концу этапа</option>
				</select>
			</label>
			<div className={styles.ganttFormGrid}>
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
				<button type="submit">Сохранить</button>
			</div>
		</form>
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
