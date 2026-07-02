import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import dayjs from "dayjs";
import { FaMoneyBillWave } from "react-icons/fa";
import Modal from "@/components/modal/Modal";
import {
	calculatePaymentFields,
	DEFAULT_PAYMENT_FORM,
	type PaymentFormState,
	toNumberOrNull,
} from "../model/autonomousPaymentForm";
import {
	buildAutonomousProjectGantt,
	formatAutonomousEventTooltip,
	formatAutonomousPaymentTooltip,
	getAutonomousEventStyle,
	resolveAutonomousPaymentDates,
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
	addDays,
	daysBetween,
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
	AutonomousPaymentStatus,
	AutonomousProjectPayment,
	ProjectGanttEvent,
	ProjectGanttEventPayload,
	ProjectGanttStage,
	ProjectGanttStageType,
	ReportProject,
} from "../model/types";
import styles from "../SalesProfitabilityReport.module.scss";
import { AutonomousGanttLegend } from "./AutonomousGanttLegend";
import {
	AutonomousGanttScale,
	AutonomousGanttTrackGrid,
} from "./AutonomousGanttScale";
import { PaymentModal } from "./AutonomousPaymentModal";

export {
	calculatePaymentFields,
	DEFAULT_PAYMENT_FORM,
	type PaymentFormState,
} from "../model/autonomousPaymentForm";
export { PaymentModal } from "./AutonomousPaymentModal";

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

type PaymentLinkLayout = {
	height: number;
	links: Array<{
		endX: number;
		endY: number;
		id: number;
		startX: number;
		startY: number;
	}>;
	width: number;
};

type DependencyLinkDraft = {
	endX: number;
	endY: number;
	startX: number;
	startY: number;
} | null;

type DependencyLinkSide = "left" | "right";

type PaymentLayoutItem = {
	level: number;
	payment: AutonomousProjectPayment;
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
	{ label: "Контрактация", value: "contracting" },
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
const GANTT_ROW_HEIGHT = 74;
const GANTT_PAYMENT_MARKER_STEP = 46;
const GANTT_PAYMENT_MARKER_TOP = 16;
const GANTT_PAYMENT_COLLISION_THRESHOLD = 9;
const GANTT_DRAG_CLICK_THRESHOLD = 4;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

type EventDateField =
	| "factEndDate"
	| "factStartDate"
	| "planEndDate"
	| "planStartDate";

const EVENT_DATE_FIELDS: EventDateField[] = [
	"factEndDate",
	"factStartDate",
	"planEndDate",
	"planStartDate",
];

const getScaleWeekStep = (weekTicksCount: number) => {
	if (weekTicksCount > 36) return 4;
	if (weekTicksCount > 24) return 3;
	if (weekTicksCount > 14) return 2;

	return 1;
};

const getStageTypeLabel = (stageType: ProjectGanttStageType) =>
	STAGE_TYPE_OPTIONS.find((option) => option.value === stageType)?.label ??
	stageType;

const formatInputDate = (date: Date) =>
	`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const getTrackDateFromClientX = (
	clientX: number,
	timeline: ReturnType<typeof buildAutonomousProjectGantt>["timeline"],
	trackRect: DOMRect,
) => {
	const ratio = Math.min(
		Math.max((clientX - trackRect.left) / Math.max(trackRect.width, 1), 0),
		1,
	);
	const time =
		timeline.start.getTime() +
		ratio * (timeline.end.getTime() - timeline.start.getTime());
	const date = new Date(Math.round(time / DAY_IN_MS) * DAY_IN_MS);

	return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const getGanttTrackFromPointerEvent = (
	event: ReactPointerEvent<HTMLElement>,
) =>
	event.currentTarget.closest<HTMLElement>(
		"[data-autonomous-gantt-track='true']",
	);

const getEventPayload = (
	event: ProjectGanttEvent,
	overrides: Partial<ProjectGanttEventPayload> = {},
): ProjectGanttEventPayload => ({
	eventKind: event.eventKind,
	factEndDate: event.factEndDate,
	factStartDate: event.factStartDate,
	planEndDate: event.planEndDate,
	planStartDate: event.planStartDate,
	stageId: event.stageId,
	title: event.title,
	...overrides,
});

const getClampedEventDate = (
	event: ProjectGanttEvent,
	field: EventDateField,
	date: Date,
	minDate: Date | null = null,
) => {
	const pairDate =
		field === "planStartDate"
			? parseGanttDate(event.planEndDate)
			: field === "planEndDate"
				? parseGanttDate(event.planStartDate)
				: field === "factStartDate"
					? parseGanttDate(event.factEndDate)
					: parseGanttDate(event.factStartDate);

	if (minDate && dayjs(date).isBefore(minDate)) {
		return minDate;
	}

	if (!pairDate) {
		return date;
	}

	if (field.endsWith("StartDate") && dayjs(date).isAfter(pairDate)) {
		return pairDate;
	}

	if (field.endsWith("EndDate") && dayjs(date).isBefore(pairDate)) {
		return pairDate;
	}

	return date;
};

const shiftEventDateValue = (value: string | null, deltaDays: number) =>
	value ? formatInputDate(dayjs(value).add(deltaDays, "day").toDate()) : value;

const getDependentStageIds = (
	stageId: number,
	stages: ProjectGanttStage[],
) => {
	const dependentStageIds = new Set<number>();
	const collectDependentStageIds = (currentStageId: number) => {
		stages
			.filter((stage) => stage.dependsOnStageId === currentStageId)
			.forEach((stage) => {
				if (dependentStageIds.has(stage.id)) {
					return;
				}

				dependentStageIds.add(stage.id);
				collectDependentStageIds(stage.id);
			});
	};

	collectDependentStageIds(stageId);

	return dependentStageIds;
};

const wouldCreateDependencyCycle = (
	dependentStageId: number,
	dependencyStageId: number,
	stages: ProjectGanttStage[],
) => {
	let currentStageId: number | null = dependencyStageId;

	while (currentStageId) {
		if (currentStageId === dependentStageId) {
			return true;
		}

		currentStageId =
			stages.find((stage) => stage.id === currentStageId)?.dependsOnStageId ??
			null;
	}

	return false;
};

const shiftEventDates = (
	event: ProjectGanttEvent,
	deltaDays: number,
	eventRow?: ReturnType<typeof buildAutonomousProjectGantt>["rows"][number]["events"][number],
) =>
	EVENT_DATE_FIELDS.reduce<ProjectGanttEvent>((result, field) => {
		const shiftedValue = shiftEventDateValue(event[field], deltaDays);

		if (
			field === "factEndDate" &&
			eventRow?.isDependencyDuration &&
			eventRow.displayStart &&
			shiftedValue &&
			dayjs(shiftedValue).isBefore(eventRow.displayStart)
		) {
			return {
				...result,
				[field]: formatInputDate(eventRow.displayStart),
			};
		}

		return {
			...result,
			[field]: shiftedValue,
		};
	}, event);

let shouldSuppressNextGanttClick = false;

const markGanttDragClick = (target: HTMLElement) => {
	const clickableNode = target.closest<HTMLElement>("button");

	shouldSuppressNextGanttClick = true;
	if (!clickableNode) {
		window.setTimeout(() => {
			shouldSuppressNextGanttClick = false;
		}, 250);
		return;
	}

	clickableNode.dataset.ganttDragging = "true";
	window.setTimeout(() => {
		shouldSuppressNextGanttClick = false;
		delete clickableNode.dataset.ganttDragging;
	}, 250);
};

const shouldSkipGanttClick = (target: HTMLElement) => {
	const clickableNode = target.closest<HTMLElement>("button");
	const shouldSkip =
		shouldSuppressNextGanttClick ||
		clickableNode?.dataset.ganttDragging === "true";

	shouldSuppressNextGanttClick = false;
	if (clickableNode) {
		delete clickableNode.dataset.ganttDragging;
	}

	return shouldSkip;
};

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

const getPaymentTimelinePercent = (
	payment: AutonomousProjectPayment,
	timeline: ReturnType<typeof buildAutonomousProjectGantt>["timeline"],
) => {
	const paymentDate = parseGanttDate(payment.paymentDate);

	if (!paymentDate) {
		return null;
	}

	const totalTime = Math.max(
		timeline.end.getTime() - timeline.start.getTime(),
		1,
	);

	return (
		((paymentDate.getTime() - timeline.start.getTime()) / totalTime) * 100
	);
};

const getPaymentLayoutItems = (
	payments: AutonomousProjectPayment[],
	timeline: ReturnType<typeof buildAutonomousProjectGantt>["timeline"],
): PaymentLayoutItem[] => {
	const levelPositions: number[][] = [];

	return payments.map((payment) => {
		const position = getPaymentTimelinePercent(payment, timeline);
		const safePosition = position ?? -1000;
		const level = levelPositions.findIndex(
			(positions) =>
				positions.every(
					(levelPosition) =>
						Math.abs(levelPosition - safePosition) >=
						GANTT_PAYMENT_COLLISION_THRESHOLD,
				),
		);
		const nextLevel = level >= 0 ? level : levelPositions.length;

		levelPositions[nextLevel] = [
			...(levelPositions[nextLevel] ?? []),
			safePosition,
		];

		return {
			level: nextLevel,
			payment,
		};
	});
};

const getEventVisualRange = (
	event: ReturnType<typeof buildAutonomousProjectGantt>["rows"][number]["events"][number],
) => {
	const dates = [
		event.planStart,
		event.planEnd,
		event.factStart,
		event.factEnd,
		event.displayStart,
		event.displayEnd,
		event.displayDate,
	].filter((date): date is Date => Boolean(date));

	if (dates.length === 0) {
		return {
			end: null,
			start: null,
		};
	}

	return {
		end: new Date(Math.max(...dates.map((date) => date.getTime()))),
		start: new Date(Math.min(...dates.map((date) => date.getTime()))),
	};
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

	if (stageType === "tz_signing" || stageType === "contracting") {
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

export const AutonomousProjectGantt = ({
	onPaymentsChanged,
	project,
}: {
	onPaymentsChanged?: () => void;
	project: ReportProject | null;
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
	const ganttBoardRef = useRef<HTMLDivElement | null>(null);
	const paymentMarkerRefs = useRef(new Map<number, HTMLButtonElement>());
	const eventRefsByStageId = useRef(new Map<number, HTMLButtonElement>());
	const [paymentLinksLayout, setPaymentLinksLayout] =
		useState<PaymentLinkLayout>({
			height: 0,
			links: [],
			width: 0,
		});
	const [dependencyLinkDraft, setDependencyLinkDraft] =
		useState<DependencyLinkDraft>(null);
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
	const setPaymentMarkerRef = useCallback(
		(paymentId: number) => (node: HTMLButtonElement | null) => {
			if (node) {
				paymentMarkerRefs.current.set(paymentId, node);
				return;
			}

			paymentMarkerRefs.current.delete(paymentId);
		},
		[],
	);
	const setStageEventRef = useCallback(
		(stageId: number) => (node: HTMLButtonElement | null) => {
			if (node) {
				eventRefsByStageId.current.set(stageId, node);
				return;
			}

			eventRefsByStageId.current.delete(stageId);
		},
		[],
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
	}, [refreshData]);
	useLayoutEffect(() => {
		const board = ganttBoardRef.current;

		if (!board) {
			setPaymentLinksLayout({ height: 0, links: [], width: 0 });
			return;
		}

		let animationFrameId: number | null = null;
		const updatePaymentLinks = () => {
			const boardRect = board.getBoundingClientRect();
			const paymentsRow = gantt.rows.find((row) => row.stage.code === "payments");

			if (!paymentsRow) {
				setPaymentLinksLayout({
					height: board.scrollHeight,
					links: [],
					width: board.scrollWidth,
				});
				return;
			}

			const links = paymentsRow.payments.flatMap((payment) => {
				if (!payment.paymentAnchor) {
					return [];
				}

				const paymentNode = paymentMarkerRefs.current.get(payment.id);
				const targetNode = eventRefsByStageId.current.get(payment.stageId);
				const targetEvent = gantt.rows
					.flatMap((row) => row.events)
					.find((event) => event.event.stageId === payment.stageId);

				if (!paymentNode || !targetNode || !targetEvent) {
					return [];
				}

				const paymentIconRect =
					paymentNode.querySelector("b")?.getBoundingClientRect() ??
					paymentNode.getBoundingClientRect();
				const targetRect = targetNode.getBoundingClientRect();
				const isStageStartAnchor = payment.paymentAnchor === "stage_start";
				const startX =
					paymentIconRect.left +
					paymentIconRect.width / 2 -
					boardRect.left +
					board.scrollLeft;
				const startY =
					paymentIconRect.top +
					paymentIconRect.height / 2 -
					boardRect.top +
					board.scrollTop;
				const targetDate = isStageStartAnchor
					? targetEvent.factStart
					: targetEvent.factEnd;
				const targetRange = getEventVisualRange(targetEvent);
				const targetRangeStart = targetRange.start;
				const targetRangeEnd = targetRange.end;
				const targetDateOffset =
					targetDate && targetRangeStart && targetRangeEnd
						? Math.min(
								Math.max(
									(targetDate.getTime() - targetRangeStart.getTime()) /
										Math.max(
											targetRangeEnd.getTime() - targetRangeStart.getTime(),
											1,
										),
									0,
								),
								1,
							)
						: null;
				const isTargetDuration =
					targetEvent.isDependencyDuration ||
					targetEvent.event.eventKind === "duration";
				const endX =
					(isTargetDuration
						? targetDateOffset !== null
							? targetRect.left + targetRect.width * targetDateOffset
							: isStageStartAnchor
								? targetRect.left
								: targetRect.right
						: targetRect.left + targetRect.width / 2) -
					boardRect.left +
					board.scrollLeft;
				const endY =
					targetRect.top +
					targetRect.height / 2 -
					boardRect.top +
					board.scrollTop;

				return [
					{
						endX,
						endY,
						id: payment.id,
						startX,
						startY,
					},
				];
			});

			setPaymentLinksLayout({
				height: board.scrollHeight,
				links,
				width: board.scrollWidth,
			});
		};
		const schedulePaymentLinksUpdate = () => {
			if (animationFrameId !== null) {
				cancelAnimationFrame(animationFrameId);
			}

			animationFrameId = requestAnimationFrame(() => {
				animationFrameId = null;
				updatePaymentLinks();
			});
		};
		const resizeObserver = new ResizeObserver(schedulePaymentLinksUpdate);

		updatePaymentLinks();
		resizeObserver.observe(board);
		window.addEventListener("resize", schedulePaymentLinksUpdate);
		board.addEventListener("scroll", schedulePaymentLinksUpdate, {
			passive: true,
		});

		return () => {
			if (animationFrameId !== null) {
				cancelAnimationFrame(animationFrameId);
			}

			resizeObserver.disconnect();
			window.removeEventListener("resize", schedulePaymentLinksUpdate);
			board.removeEventListener("scroll", schedulePaymentLinksUpdate);
		};
	}, [gantt.rows]);

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

	const handleEventDateDragStart = useCallback(
		(
			pointerEvent: ReactPointerEvent<HTMLElement>,
			event: ProjectGanttEvent,
			field: EventDateField,
		) => {
			const track = getGanttTrackFromPointerEvent(pointerEvent);

			if (!track) {
				return;
			}

			pointerEvent.preventDefault();
			pointerEvent.stopPropagation();

			const dragTarget = pointerEvent.currentTarget;
			const trackRect = track.getBoundingClientRect();
			const eventRow = gantt.rows
				.flatMap((row) => row.events)
				.find((rowEvent) => rowEvent.event.id === event.id);
			const linkedStageIds = getDependentStageIds(event.stageId, stages);
			const shouldMoveLinkedStages =
				field === "factEndDate" ||
				(field === "planEndDate" && !event.factEndDate);
			const eventIdsToMove = new Set<number>();
			events.forEach((currentEvent) => {
				if (
					shouldMoveLinkedStages &&
					linkedStageIds.has(currentEvent.stageId)
				) {
					eventIdsToMove.add(currentEvent.id);
				}
			});
			const initialEventById = new Map(
				events.map((currentEvent) => [currentEvent.id, currentEvent]),
			);
			const initialFieldDate = parseGanttDate(event[field]);
			const minDate =
				field === "factEndDate" && eventRow?.isDependencyDuration
					? eventRow.displayStart
					: null;
			let latestEvent = event;
			let latestEventsToSave: ProjectGanttEvent[] = [event];
			let latestValue = event[field];
			let hasMoved = false;

			const applyDate = (clientX: number) => {
				const nextDate = getTrackDateFromClientX(
					clientX,
					gantt.timeline,
					trackRect,
				);
				const clampedDate = getClampedEventDate(
					latestEvent,
					field,
					nextDate,
					minDate,
				);
				const nextValue = formatInputDate(clampedDate);
				const nextEvent = {
					...latestEvent,
					[field]: nextValue,
				};
				const deltaDays = initialFieldDate
					? dayjs(clampedDate).diff(initialFieldDate, "day")
					: 0;

				latestEvent = nextEvent;
				latestValue = nextValue;

				setEvents((currentEvents) => {
					const nextEvents = currentEvents.map((currentEvent) => {
						if (currentEvent.id === event.id) {
							return nextEvent;
						}

						if (!eventIdsToMove.has(currentEvent.id)) {
							return currentEvent;
						}

						const initialEvent =
							initialEventById.get(currentEvent.id) ?? currentEvent;

						return shiftEventDates(initialEvent, deltaDays);
					});

					latestEventsToSave = nextEvents.filter(
						(currentEvent) =>
							currentEvent.id === event.id ||
							(eventIdsToMove.has(currentEvent.id) &&
								EVENT_DATE_FIELDS.some((item) => currentEvent[item])),
					);

					setPayments((currentPayments) =>
						resolveAutonomousPaymentDates({
							events: nextEvents,
							payments: currentPayments,
							stages,
						}),
					);

					return nextEvents;
				});
			};
			const handlePointerMove = (moveEvent: PointerEvent) => {
				hasMoved = true;
				markGanttDragClick(dragTarget);
				applyDate(moveEvent.clientX);
			};
			const handlePointerUp = () => {
				window.removeEventListener("pointermove", handlePointerMove);
				window.removeEventListener("pointerup", handlePointerUp);

				if (!hasMoved || latestValue === event[field]) {
					return;
				}

				markGanttDragClick(dragTarget);
				void Promise.all(
					latestEventsToSave.map((eventToSave) =>
						updateProjectGanttEvent(
							eventToSave.id,
							eventToSave.id === event.id
								? getEventPayload(latestEvent, {
										[field]: latestValue,
									})
								: getEventPayload(eventToSave),
						),
					),
				).catch(() => {
						void refreshData();
					});
			};

			window.addEventListener("pointermove", handlePointerMove);
			window.addEventListener("pointerup", handlePointerUp, { once: true });
		},
		[events, gantt.rows, gantt.timeline, refreshData, stages],
	);

	const handleEventMoveDragStart = useCallback(
		(
			pointerEvent: ReactPointerEvent<HTMLElement>,
			event: ProjectGanttEvent,
		) => {
			if (pointerEvent.button !== 0) {
				return;
			}

			const track = getGanttTrackFromPointerEvent(pointerEvent);
			const linkedStageIds = getDependentStageIds(event.stageId, stages);
			const eventIdsToMove = new Set([event.id]);
			events.forEach((currentEvent) => {
				if (linkedStageIds.has(currentEvent.stageId)) {
					eventIdsToMove.add(currentEvent.id);
				}
			});
			const initialEventById = new Map(
				events.map((currentEvent) => [currentEvent.id, currentEvent]),
			);
			const hasMovableDates = events.some(
				(currentEvent) =>
					eventIdsToMove.has(currentEvent.id) &&
					EVENT_DATE_FIELDS.some((field) => currentEvent[field]),
			);

			if (!track || !hasMovableDates) {
				return;
			}

			const dragTarget = pointerEvent.currentTarget;
			const trackRect = track.getBoundingClientRect();
			const startClientX = pointerEvent.clientX;
			const startDate = getTrackDateFromClientX(
				startClientX,
				gantt.timeline,
				trackRect,
			);
			const eventRow = gantt.rows
				.flatMap((row) => row.events)
				.find((rowEvent) => rowEvent.event.id === event.id);
			let latestEventsToSave: ProjectGanttEvent[] = [event];
			let latestDeltaDays = 0;
			let hasDragged = false;

			const applyDelta = (clientX: number) => {
				if (
					!hasDragged &&
					Math.abs(clientX - startClientX) < GANTT_DRAG_CLICK_THRESHOLD
				) {
					return;
				}

				const nextDate = getTrackDateFromClientX(
					clientX,
					gantt.timeline,
					trackRect,
				);
				const deltaDays = dayjs(nextDate).diff(startDate, "day");

				if (hasDragged && deltaDays === latestDeltaDays) {
					return;
				}

				hasDragged = true;
				latestDeltaDays = deltaDays;
				markGanttDragClick(dragTarget);
				setEvents((currentEvents) => {
					const nextEvents = currentEvents.map((currentEvent) => {
						if (!eventIdsToMove.has(currentEvent.id)) {
							return currentEvent;
						}

						const initialEvent =
							initialEventById.get(currentEvent.id) ?? currentEvent;

						return shiftEventDates(
							initialEvent,
							deltaDays,
							currentEvent.id === event.id ? eventRow : undefined,
						);
					});

					latestEventsToSave = nextEvents.filter((currentEvent) =>
						eventIdsToMove.has(currentEvent.id) &&
						EVENT_DATE_FIELDS.some((field) => currentEvent[field]),
					);

					setPayments((currentPayments) =>
						resolveAutonomousPaymentDates({
							events: nextEvents,
							payments: currentPayments,
							stages,
						}),
					);

					return nextEvents;
				});
			};
			const handlePointerMove = (moveEvent: PointerEvent) => {
				applyDelta(moveEvent.clientX);
				if (hasDragged) {
					moveEvent.preventDefault();
				}
			};
			const handlePointerUp = () => {
				window.removeEventListener("pointermove", handlePointerMove);
				window.removeEventListener("pointerup", handlePointerUp);

				if (!hasDragged || latestDeltaDays === 0) {
					return;
				}

				markGanttDragClick(dragTarget);
				void Promise.all(
					latestEventsToSave.map((eventToSave) =>
						updateProjectGanttEvent(
							eventToSave.id,
							getEventPayload(eventToSave),
						),
					),
				).catch(() => {
					void refreshData();
				});
			};

			window.addEventListener("pointermove", handlePointerMove);
			window.addEventListener("pointerup", handlePointerUp, { once: true });
		},
		[events, gantt.rows, gantt.timeline, refreshData, stages],
	);

	const handleDependencyLinkDragStart = useCallback(
		(
			pointerEvent: ReactPointerEvent<HTMLElement>,
			sourceStageId: number,
			side: DependencyLinkSide,
		) => {
			if (pointerEvent.button !== 0) {
				return;
			}

			const board = ganttBoardRef.current;

			if (!board) {
				return;
			}

			pointerEvent.preventDefault();
			pointerEvent.stopPropagation();

			const boardRect = board.getBoundingClientRect();
			const handleRect = pointerEvent.currentTarget.getBoundingClientRect();
			const getBoardPoint = (clientX: number, clientY: number) => ({
				x: clientX - boardRect.left + board.scrollLeft,
				y: clientY - boardRect.top + board.scrollTop,
			});
			const startPoint = getBoardPoint(
				handleRect.left + handleRect.width / 2,
				handleRect.top + handleRect.height / 2,
			);
			const getTargetStageId = (clientX: number, clientY: number) => {
				for (const [stageId, node] of eventRefsByStageId.current.entries()) {
					if (stageId === sourceStageId) {
						continue;
					}

					const rect = node.getBoundingClientRect();

					if (
						clientX >= rect.left &&
						clientX <= rect.right &&
						clientY >= rect.top &&
						clientY <= rect.bottom
					) {
						return stageId;
					}
				}

				return null;
			};
			const updateDraft = (clientX: number, clientY: number) => {
				const endPoint = getBoardPoint(clientX, clientY);

				setDependencyLinkDraft({
					endX: endPoint.x,
					endY: endPoint.y,
					startX: startPoint.x,
					startY: startPoint.y,
				});
			};
			const handlePointerMove = (moveEvent: PointerEvent) => {
				moveEvent.preventDefault();
				updateDraft(moveEvent.clientX, moveEvent.clientY);
			};
			const handlePointerUp = (upEvent: PointerEvent) => {
				window.removeEventListener("pointermove", handlePointerMove);
				window.removeEventListener("pointerup", handlePointerUp);
				setDependencyLinkDraft(null);

				const targetStageId = getTargetStageId(upEvent.clientX, upEvent.clientY);

				if (!targetStageId) {
					return;
				}

				const dependentStageId =
					side === "right" ? targetStageId : sourceStageId;
				const dependencyStageId =
					side === "right" ? sourceStageId : targetStageId;

				if (
					wouldCreateDependencyCycle(
						dependentStageId,
						dependencyStageId,
						stages,
					)
				) {
					return;
				}

				const dependentStage = stages.find(
					(stage) => stage.id === dependentStageId,
				);
				const dependentEventRow = gantt.rows
					.flatMap((row) => row.events)
					.find((eventRow) => eventRow.event.stageId === dependentStageId);
				const dependentRange = dependentEventRow
					? getEventVisualRange(dependentEventRow)
					: null;
				const durationDays =
					dependentStage?.durationDays ??
					(dependentRange?.start && dependentRange.end
						? Math.max(daysBetween(dependentRange.start, dependentRange.end), 1)
						: null);

				setStages((currentStages) =>
					currentStages.map((stage) =>
						stage.id === dependentStageId
							? {
									...stage,
									dependsOnStageId: dependencyStageId,
									durationDays,
								}
							: stage,
					),
				);

				void updateProjectGanttStage(dependentStageId, {
					dependsOnStageId: dependencyStageId,
					durationDays,
				}).catch(() => {
					void refreshData();
				});
			};

			updateDraft(pointerEvent.clientX, pointerEvent.clientY);
			window.addEventListener("pointermove", handlePointerMove);
			window.addEventListener("pointerup", handlePointerUp, { once: true });
		},
		[gantt.rows, refreshData, stages],
	);

	const handlePaymentDateDragStart = useCallback(
		(
			pointerEvent: ReactPointerEvent<HTMLElement>,
			payment: AutonomousProjectPayment,
		) => {
			const track = getGanttTrackFromPointerEvent(pointerEvent);
			const paymentsStageId =
				stages.find((stage) => stage.code === "payments")?.id ?? payment.stageId;

			if (!track) {
				return;
			}

			pointerEvent.preventDefault();
			pointerEvent.stopPropagation();

			const dragTarget = pointerEvent.currentTarget;
			const trackRect = track.getBoundingClientRect();
			let latestValue = payment.paymentDate;
			let hasMoved = false;

			const applyDate = (clientX: number) => {
				const nextValue = formatInputDate(
					getTrackDateFromClientX(clientX, gantt.timeline, trackRect),
				);

				latestValue = nextValue;
				setPayments((currentPayments) =>
					currentPayments.map((currentPayment) =>
						currentPayment.id === payment.id
							? {
									...currentPayment,
									paymentAnchor: null,
									paymentDate: nextValue,
									stageId: paymentsStageId,
								}
							: currentPayment,
					),
				);
			};
			const handlePointerMove = (moveEvent: PointerEvent) => {
				hasMoved = true;
				markGanttDragClick(dragTarget);
				applyDate(moveEvent.clientX);
			};
			const handlePointerUp = () => {
				window.removeEventListener("pointermove", handlePointerMove);
				window.removeEventListener("pointerup", handlePointerUp);

				if (!hasMoved || !latestValue || latestValue === payment.paymentDate) {
					return;
				}

				markGanttDragClick(dragTarget);
				void updateAutonomousProjectPayment(payment.id, {
					amount: payment.amount,
					paymentAnchor: null,
					paymentDate: latestValue,
					percent: payment.percent,
					stageId: paymentsStageId,
					status: payment.status,
					waitingDays: payment.waitingDays,
				})
					.then(() => {
						onPaymentsChanged?.();
					})
					.catch(() => {
						void refreshData();
					});
			};

			window.addEventListener("pointermove", handlePointerMove);
			window.addEventListener("pointerup", handlePointerUp, { once: true });
		},
		[gantt.timeline, onPaymentsChanged, refreshData, stages],
	);

	const handleStageSubmit = async () => {
		if (!project?.id) {
			return;
		}

		const title = stageForm.title.trim() || getStageTypeLabel(stageForm.stageType);
		const isDependencyStage = Boolean(stageForm.dependsOnStageId);
		const eventKind = isDependencyStage
			? "duration"
			: getStageEventKind(stageForm.stageType);
		const durationDays = toNumberOrNull(stageForm.durationDays);
		const existingStageEvent =
			stageForm.eventId !== null
				? (events.find((event) => event.id === stageForm.eventId) ?? null)
				: null;
		const dependencyEventRow = stageForm.dependsOnStageId
			? (gantt.rows
					.find((row) => row.stage.id === stageForm.dependsOnStageId)
					?.events.at(0) ?? null)
			: null;
		const dependencyStart =
			dependencyEventRow?.factEnd ??
			dependencyEventRow?.displayEnd ??
			dependencyEventRow?.planEnd ??
			dependencyEventRow?.displayDate ??
			dependencyEventRow?.factStart ??
			dependencyEventRow?.planStart ??
			null;
		const dependencyFactEnd = parseGanttDate(stageForm.factEndDate);
		const dependencyFallbackStart =
			parseGanttDate(stageForm.planStartDate) ??
			parseGanttDate(existingStageEvent?.planStartDate ?? null) ??
			parseGanttDate(stageForm.factStartDate) ??
			parseGanttDate(existingStageEvent?.factStartDate ?? null) ??
			(dependencyFactEnd && durationDays
				? addDays(dependencyFactEnd, -durationDays)
				: dependencyFactEnd);
		const dependencyPlanStart = dependencyStart ?? dependencyFallbackStart;
		const dependencyPlanEnd =
			isDependencyStage && dependencyPlanStart
				? durationDays
					? addDays(dependencyPlanStart, durationDays)
					: (parseGanttDate(stageForm.planEndDate) ??
						parseGanttDate(existingStageEvent?.planEndDate ?? null) ??
						dependencyPlanStart)
				: null;
		const dependencyFactStart =
			dependencyPlanStart && dependencyFactEnd
				? getDateMin(dependencyPlanStart, dependencyFactEnd)
				: (dependencyPlanStart ?? dependencyFactEnd);
		const eventPayload = {
			eventKind,
			factEndDate: eventKind === "duration" ? stageForm.factEndDate || null : null,
			factStartDate: isDependencyStage
				? dependencyFactStart
					? formatInputDate(dependencyFactStart)
					: null
				: stageForm.factStartDate || null,
			planEndDate:
				eventKind === "duration"
					? isDependencyStage
						? dependencyPlanEnd
							? formatInputDate(dependencyPlanEnd)
							: null
						: stageForm.planEndDate || null
					: null,
			planStartDate: isDependencyStage
				? dependencyPlanStart
					? formatInputDate(dependencyPlanStart)
					: null
				: stageForm.planStartDate || null,
			title,
		};
		const stagePayload = {
			dependsOnStageId: stageForm.dependsOnStageId,
			durationDays,
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
			{error ? <div className={styles.emptyState}>{error}</div> : null}
			{isLoading ? (
				<div className={styles.emptyState}>Загрузка Ганта...</div>
			) : (
				<div
					ref={ganttBoardRef}
					className={`${styles.ganttBoard} ${styles.autonomousGanttBoard}`}
				>
					<div className={styles.ganttScaleLabel}>Этапы проекта</div>
					<div className={styles.ganttScale}>
						<AutonomousGanttScale
							monthTicks={monthTicks}
							weekTicks={scaleWeekTicks}
						/>
					</div>
					<AutonomousPaymentLinksLayer
						dependencyLinkDraft={dependencyLinkDraft}
						layout={paymentLinksLayout}
					/>
					{gantt.rows.map((row) => (
						<AutonomousStageRow
							key={row.stage.id}
							monthTicks={monthTicks}
							onPaymentCreate={openPaymentCreateModal}
							onPaymentDateDragStart={handlePaymentDateDragStart}
							onPaymentEdit={openPaymentEditModal}
							onEventDateDragStart={handleEventDateDragStart}
							onDependencyLinkDragStart={handleDependencyLinkDragStart}
							onEventMoveDragStart={handleEventMoveDragStart}
							onStageEdit={openStageEditModal}
							row={row}
							setPaymentMarkerRef={setPaymentMarkerRef}
							setStageEventRef={setStageEventRef}
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
						<AutonomousGanttTrackGrid
							monthTicks={monthTicks}
							weekTicks={weekTicks}
						/>
					</div>
				</div>
			)}
			<AutonomousGanttLegend />
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

const AutonomousPaymentLinksLayer = ({
	dependencyLinkDraft,
	layout,
}: {
	dependencyLinkDraft: DependencyLinkDraft;
	layout: PaymentLinkLayout;
}) => {
	if (
		(layout.links.length === 0 && !dependencyLinkDraft) ||
		layout.width <= 0 ||
		layout.height <= 0
	) {
		return null;
	}

	return (
		<svg
			className={styles.ganttPaymentLinksLayer}
			style={{ height: layout.height, width: layout.width }}
			viewBox={`0 0 ${layout.width} ${layout.height}`}
		>
			{layout.links.map((link) => (
				<polyline
					key={link.id}
					className={styles.ganttPaymentLinkLine}
					points={`${link.startX},${link.startY} ${link.endX},${link.endY}`}
				/>
			))}
			{dependencyLinkDraft ? (
				<polyline
					className={styles.ganttDependencyLinkLine}
					points={`${dependencyLinkDraft.startX},${dependencyLinkDraft.startY} ${dependencyLinkDraft.endX},${dependencyLinkDraft.endY}`}
				/>
			) : null}
		</svg>
	);
};

const AutonomousStageRow = ({
	monthTicks,
	onDependencyLinkDragStart,
	onEventDateDragStart,
	onEventMoveDragStart,
	onPaymentCreate,
	onPaymentDateDragStart,
	onPaymentEdit,
	onStageEdit,
	row,
	setPaymentMarkerRef,
	setStageEventRef,
	stageById,
	today,
	timeline,
	weekTicks,
}: {
	monthTicks: GanttMonthTick[];
	onDependencyLinkDragStart: (
		event: ReactPointerEvent<HTMLElement>,
		sourceStageId: number,
		side: DependencyLinkSide,
	) => void;
	onEventDateDragStart: (
		event: ReactPointerEvent<HTMLElement>,
		ganttEvent: ProjectGanttEvent,
		field: EventDateField,
	) => void;
	onEventMoveDragStart: (
		event: ReactPointerEvent<HTMLElement>,
		ganttEvent: ProjectGanttEvent,
	) => void;
	onPaymentCreate: () => void;
	onPaymentDateDragStart: (
		event: ReactPointerEvent<HTMLElement>,
		payment: AutonomousProjectPayment,
	) => void;
	onPaymentEdit: (payment: AutonomousProjectPayment) => void;
	onStageEdit: (stage: ProjectGanttStage) => void;
	row: ReturnType<typeof buildAutonomousProjectGantt>["rows"][number];
	setPaymentMarkerRef: (
		paymentId: number,
	) => (node: HTMLButtonElement | null) => void;
	setStageEventRef: (
		stageId: number,
	) => (node: HTMLButtonElement | null) => void;
	stageById: Map<number, ProjectGanttStage>;
	today: Date;
	timeline: ReturnType<typeof buildAutonomousProjectGantt>["timeline"];
	weekTicks: GanttWeekTick[];
}) => {
	const isPaymentsStage = row.stage.code === "payments";
	const paymentLayoutItems = isPaymentsStage
		? getPaymentLayoutItems(row.payments, timeline)
		: [];
	const maxPaymentLevel = paymentLayoutItems.reduce(
		(maxLevel, item) => Math.max(maxLevel, item.level),
		0,
	);
	const rowHeight = isPaymentsStage
		? Math.max(
				GANTT_ROW_HEIGHT,
				GANTT_PAYMENT_MARKER_TOP +
					(maxPaymentLevel + 1) * GANTT_PAYMENT_MARKER_STEP +
					18,
			)
		: GANTT_ROW_HEIGHT;

	return (
		<>
			<div className={styles.ganttRowInfo} style={{ minHeight: rowHeight }}>
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
				data-autonomous-gantt-track="true"
				style={{ minHeight: rowHeight }}
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
				<AutonomousGanttTrackGrid
					monthTicks={monthTicks}
					weekTicks={weekTicks}
				/>
				{row.events.map((event) => (
					<AutonomousEventItem
						event={event}
						key={event.event.id}
						onDependencyLinkDragStart={onDependencyLinkDragStart}
						onDateDragStart={onEventDateDragStart}
						onEdit={() => onStageEdit(row.stage)}
						onMoveDragStart={onEventMoveDragStart}
						targetRef={setStageEventRef(row.stage.id)}
						stageType={row.stage.stageType}
						today={today}
						timeline={timeline}
					/>
				))}
				{paymentLayoutItems.map(({ level, payment }) => (
					<AutonomousPaymentItem
						key={payment.id}
						markerRef={setPaymentMarkerRef(payment.id)}
						onDateDragStart={onPaymentDateDragStart}
						onEdit={onPaymentEdit}
						payment={payment}
						stageTitle={stageById.get(payment.stageId)?.title ?? "—"}
						timeline={timeline}
						top={
							GANTT_PAYMENT_MARKER_TOP + level * GANTT_PAYMENT_MARKER_STEP
						}
					/>
				))}
			</div>
		</>
	);
};

const AutonomousEventItem = ({
	event,
	onDependencyLinkDragStart,
	onDateDragStart,
	onEdit,
	onMoveDragStart,
	stageType,
	targetRef,
	today,
	timeline,
}: {
	event: ReturnType<typeof buildAutonomousProjectGantt>["rows"][number]["events"][number];
	onDependencyLinkDragStart: (
		event: ReactPointerEvent<HTMLElement>,
		sourceStageId: number,
		side: DependencyLinkSide,
	) => void;
	onDateDragStart: (
		event: ReactPointerEvent<HTMLElement>,
		ganttEvent: ProjectGanttEvent,
		field: EventDateField,
	) => void;
	onEdit: () => void;
	onMoveDragStart: (
		event: ReactPointerEvent<HTMLElement>,
		ganttEvent: ProjectGanttEvent,
	) => void;
	stageType: ProjectGanttStage["stageType"];
	targetRef: (node: HTMLButtonElement | null) => void;
	today: Date;
	timeline: ReturnType<typeof buildAutonomousProjectGantt>["timeline"];
}) => {
	const style = getAutonomousEventStyle(event, timeline);
	const eventClassName = getAutonomousEventClassName(
		event.event,
		stageType,
		today,
	);
	const renderDateHandle = (
		date: Date | null,
		field: EventDateField,
		shellStart: Date,
		shellEnd: Date,
		className = "",
	) =>
		date ? (
			<span
				className={`${styles.ganttDateDragHandle} ${className}`}
				onPointerDown={(pointerEvent) => {
					pointerEvent.stopPropagation();
					onDateDragStart(pointerEvent, event.event, field);
				}}
				style={{
					left: getInnerSegmentStyle(date, date, shellStart, shellEnd).left,
				}}
			/>
		) : null;
	const renderDependencyHandles = () => (
		<>
			<span
				className={`${styles.ganttDependencyHandle} ${styles.ganttDependencyHandleLeft}`}
				onPointerDown={(pointerEvent) => {
					pointerEvent.stopPropagation();
					onDependencyLinkDragStart(
						pointerEvent,
						event.event.stageId,
						"left",
					);
				}}
			/>
			<span
				className={`${styles.ganttDependencyHandle} ${styles.ganttDependencyHandleRight}`}
				onPointerDown={(pointerEvent) => {
					pointerEvent.stopPropagation();
					onDependencyLinkDragStart(
						pointerEvent,
						event.event.stageId,
						"right",
					);
				}}
			/>
		</>
	);

	if (!style) {
		return <span className={styles.ganttNoDate}>Дата не заполнена</span>;
	}

	if (event.isDependencyDuration || event.event.eventKind === "duration") {
		const safeFactEnd =
			event.factEnd && event.displayStart && event.factEnd < event.displayStart
				? event.displayStart
				: event.factEnd;
		const planSegment =
			event.planStart && event.planEnd
				? {
						end: event.planEnd,
						start: event.planStart,
					}
				: null;
		const factEnd = safeFactEnd ?? (event.factStart ? today : null);
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
				? safeFactEnd &&
					safeFactEnd > event.displayStart &&
					safeFactEnd.getTime() !== event.displayEnd.getTime()
					? safeFactEnd < event.displayEnd
						? [
								{
									className:
										eventClassName || styles.ganttAutonomousEventFact,
									end: safeFactEnd,
									start: event.displayStart,
								},
								{
									className: styles.ganttAutonomousEventReserve,
									end: event.displayEnd,
									start: safeFactEnd,
								},
							]
						: [
								{
									className:
										eventClassName || styles.ganttAutonomousEventFact,
									end: event.displayEnd,
									start: event.displayStart,
								},
								{
									className: styles.ganttAutonomousEventOverdue,
									end: safeFactEnd,
									start: event.displayEnd,
								},
							]
					: [
							{
								className: eventClassName || styles.ganttAutonomousEventFact,
								end: event.displayEnd,
								start: event.displayStart,
							},
						]
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
			: (fallbackSegments ?? []);
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
					if (shouldSkipGanttClick(clickEvent.currentTarget)) {
						return;
					}

					onEdit();
				}}
				onPointerDown={(pointerEvent) =>
					onMoveDragStart(pointerEvent, event.event)
				}
				ref={targetRef}
				style={getSegmentStyle(shellStart, shellEnd, timeline)}
				title={formatAutonomousEventTooltip(event)}
			>
				{normalizedSegments.map((segment) => (
					<span
						key={`${segment.className}-${segment.start.toISOString()}-${segment.end.toISOString()}`}
						className={`${styles.ganttCustomEventSegment} ${segment.className} ${
							segment.start.getTime() === shellStart.getTime()
								? styles.ganttCustomEventSegmentStart
								: ""
						} ${
							segment.end.getTime() === shellEnd.getTime()
								? styles.ganttCustomEventSegmentEnd
								: ""
						}`}
						style={getInnerSegmentStyle(
							segment.start,
							segment.end,
							shellStart,
							shellEnd,
						)}
					/>
				))}
				{renderDateHandle(
					event.planStart,
					"planStartDate",
					shellStart,
					shellEnd,
					styles.ganttDateDragHandlePlan,
				)}
				{renderDateHandle(
					event.planEnd,
					"planEndDate",
					shellStart,
					shellEnd,
					styles.ganttDateDragHandlePlan,
				)}
				{renderDateHandle(
					event.factStart,
					"factStartDate",
					shellStart,
					shellEnd,
					styles.ganttDateDragHandleFact,
				)}
				{renderDateHandle(
					event.factEnd,
					"factEndDate",
					shellStart,
					shellEnd,
					styles.ganttDateDragHandleFact,
				)}
				{renderDependencyHandles()}
			</button>
		);
	}

	if (
		event.planStart &&
		event.factStart &&
		event.planStart.getTime() !== event.factStart.getTime()
	) {
		const shellStart = getDateMin(event.planStart, event.factStart);
		const shellEnd = getDateMax(event.planStart, event.factStart);
		const factClassName = eventClassName || styles.ganttAutonomousEventFact;

		if (!shellStart || !shellEnd) {
			return <span className={styles.ganttNoDate}>Дата не заполнена</span>;
		}

		return (
			<button
				type="button"
				className={styles.ganttCustomEventOneTimeShell}
				onClick={(clickEvent) => {
					clickEvent.stopPropagation();
					if (shouldSkipGanttClick(clickEvent.currentTarget)) {
						return;
					}

					onEdit();
				}}
				onPointerDown={(pointerEvent) =>
					onMoveDragStart(pointerEvent, event.event)
				}
				ref={targetRef}
				style={getSegmentStyle(shellStart, shellEnd, timeline)}
				title={formatAutonomousEventTooltip(event)}
			>
				<span className={styles.ganttCustomEventOneTimePath} />
				<span
					className={`${styles.ganttCustomEventOneTimeDot} ${styles.ganttCustomEventOneTimePlanDot}`}
					onPointerDown={(pointerEvent) => {
						pointerEvent.stopPropagation();
						onDateDragStart(pointerEvent, event.event, "planStartDate");
					}}
					style={{
						left: getInnerSegmentStyle(
							event.planStart,
							event.planStart,
							shellStart,
							shellEnd,
						).left,
					}}
				/>
				<span
					className={`${styles.ganttCustomEventOneTimeDot} ${styles.ganttCustomEventOneTimeFactDot} ${factClassName}`}
					onPointerDown={(pointerEvent) => {
						pointerEvent.stopPropagation();
						onDateDragStart(pointerEvent, event.event, "factStartDate");
					}}
					style={{
						left: getInnerSegmentStyle(
							event.factStart,
							event.factStart,
							shellStart,
							shellEnd,
						).left,
					}}
				/>
				{renderDependencyHandles()}
			</button>
		);
	}

	return (
		<button
			type="button"
			className={`${styles.ganttMilestone} ${styles.ganttCustomEventMarker} ${eventClassName}`}
			onClick={(clickEvent) => {
				clickEvent.stopPropagation();
				if (shouldSkipGanttClick(clickEvent.currentTarget)) {
					return;
				}

				onEdit();
			}}
			onPointerDown={(pointerEvent) =>
				onMoveDragStart(pointerEvent, event.event)
			}
			ref={targetRef}
			style={style}
			title={formatAutonomousEventTooltip(event)}
		>
			<b
				onPointerDown={(pointerEvent) => {
					pointerEvent.stopPropagation();
					onDateDragStart(
						pointerEvent,
						event.event,
						event.event.factStartDate ? "factStartDate" : "planStartDate",
					);
				}}
			/>
			<small>
				{event.event.title}
				<br />
				{formatDateShort(event.displayDate)}
			</small>
			{renderDependencyHandles()}
		</button>
	);
};

const AutonomousPaymentItem = ({
	markerRef,
	onDateDragStart,
	onEdit,
	payment,
	stageTitle,
	timeline,
	top,
}: {
	markerRef: (node: HTMLButtonElement | null) => void;
	onDateDragStart: (
		event: ReactPointerEvent<HTMLElement>,
		payment: AutonomousProjectPayment,
	) => void;
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
				if (shouldSkipGanttClick(clickEvent.currentTarget)) {
					return;
				}

				onEdit(payment);
			}}
			ref={markerRef}
			style={style}
			title={formatAutonomousPaymentTooltip(payment, stageTitle)}
		>
			<b
				onPointerDown={(pointerEvent) =>
					onDateDragStart(pointerEvent, payment)
				}
			>
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
					<>
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
					</>
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
