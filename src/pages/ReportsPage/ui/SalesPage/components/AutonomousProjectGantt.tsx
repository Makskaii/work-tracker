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
import { notify } from "@/shared/ui/NotificationPopup/notify";
import {
	calculatePaymentFields,
	DEFAULT_PAYMENT_FORM,
	type PaymentFormState,
	toNumberOrNull,
} from "../model/autonomousPaymentForm";
import {
	buildAutonomousProjectGantt,
	formatAutonomousPaymentTooltip,
	getAutonomousDependencyAnchorDate,
	getAutonomousPaymentAnchorDate,
	getVisibleAutonomousGanttRows,
	isAutonomousPaymentDueByCompletedStage,
	recalculateAutonomousDependencyEvents,
	resolveAutonomousPaymentDates,
} from "../model/autonomousProjectGantt";
import {
	createProjectGanttEvent,
	createProjectGanttStage,
	deleteProjectGanttEvent,
	deleteProjectGanttStage,
	fetchProjectGanttEvents,
	fetchProjectGanttStages,
	moveProjectGanttStageParent,
	updateProjectGanttEvent,
	updateProjectGanttStage,
} from "../model/projectGantt.api";
import {
	createAutonomousProjectPayment,
	deleteAutonomousProjectPayment,
	fetchAutonomousProjectPayments,
	updateAutonomousProjectPayment,
} from "../model/projectPayments.api";
import type {
	GanttMonthTick,
	GanttTimeline,
	GanttWeekTick,
} from "../model/ganttTypes";
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
	ProjectGanttDependencyAnchor,
	ProjectGanttEvent,
	ProjectGanttEventPayload,
	ProjectGanttGroupStatus,
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
import { GanttStickyScale } from "./GanttStickyScale";
import planningStyles from "./ProjectPlanning.module.scss";
import { formatGanttHours, getGanttStagePlanning, GANTT_CATEGORY_LABELS, needsStageCompletionConfirmation, parseGanttHours, stageCategory } from "../model/ganttPlanning";

export {
	calculatePaymentFields,
	DEFAULT_PAYMENT_FORM,
	type PaymentFormState,
} from "../model/autonomousPaymentForm";
export { PaymentModal } from "./AutonomousPaymentModal";

type StageFormState = {
	plannedHours: string;
	dependsOnStageId: number | null;
	dependencyAnchor: ProjectGanttDependencyAnchor;
	durationDays: string;
	eventId: number | null;
	factEndDate: string;
	factStartDate: string;
	id: number | null;
	isGroup: boolean;
	parentStageId: number | null;
	groupStatus: ProjectGanttGroupStatus;
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

type DragDateGuide = {
	date: Date;
} | null;

type StageDropTarget = {
	anchorStageId: number | null;
	beforeStageId: number | null;
	parentStageId: number;
	placement: "append" | "after" | "before";
} | null;

type DependencyLinkSide = "left" | "right";

type PaymentLayoutItem = {
	level: number;
	payment: AutonomousProjectPayment;
};

const DEFAULT_STAGE_FORM: StageFormState = {
	plannedHours: "",
	dependsOnStageId: null,
	dependencyAnchor: "stage_end",
	durationDays: "",
	eventId: null,
	factEndDate: "",
	factStartDate: "",
	id: null,
	isGroup: false,
	parentStageId: null,
	groupStatus: "not_started",
	planEndDate: "",
	planStartDate: "",
	stageType: "tz_writing",
	title: "",
};

const GROUP_STATUS_OPTIONS: Array<{
	label: string;
	value: ProjectGanttGroupStatus;
}> = [
	{ label: "Не начат", value: "not_started" },
	{ label: "В работе", value: "in_progress" },
	{ label: "Неактивен", value: "inactive" },
	{ label: "Завершён", value: "completed" },
];

const getGroupStatusLabel = (status: ProjectGanttGroupStatus | null) =>
	GROUP_STATUS_OPTIONS.find((option) => option.value === status)?.label ??
	"Не начат";

const getGroupStatusClassName = (status: ProjectGanttGroupStatus | null) => {
	switch (status) {
		case "in_progress":
			return styles.ganttGroupStatusInProgress;
		case "inactive":
			return styles.ganttGroupStatusInactive;
		case "completed":
			return styles.ganttGroupStatusCompleted;
		default:
			return styles.ganttGroupStatusNotStarted;
	}
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
const GANTT_MIN_STAGE_ROW_HEIGHT = 120;
const GANTT_MIN_GROUP_ROW_HEIGHT = 190;
const GANTT_MAX_STAGE_ROW_HEIGHT = 280;
const GANTT_PAYMENT_MARKER_STEP = 46;
const GANTT_PAYMENT_MARKER_TOP = 16;
const GANTT_PAYMENT_COLLISION_THRESHOLD = 9;
const GANTT_DRAG_CLICK_THRESHOLD = 4;
const GANTT_DEPENDENCY_TARGET_HITBOX_PADDING = 28;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

type EventDateField =
	| "factEndDate"
	| "factStartDate"
	| "planEndDate"
	| "planStartDate";

const EVENT_DATE_FIELDS: EventDateField[] = [
	"planEndDate",
	"planStartDate",
];

const GANTT_DEFAULT_PIXELS_PER_DAY = 10;
const GANTT_MIN_PIXELS_PER_DAY = 2;
const GANTT_MAX_PIXELS_PER_DAY = 50;
const GANTT_ZOOM_STEP = 1;
const GANTT_STAGE_COLUMN_WIDTH = 280;

type TimelineZoomAnchor = {
	date: Date;
	ratio: number;
};

type TimelineZoomPointerAnchor = {
	date: Date;
	viewportX: number;
};

const getDisplayTimeline = (
	baseTimeline: GanttTimeline,
	viewportWidth: number,
	pixelsPerDay: number,
	anchor: TimelineZoomAnchor | null,
): GanttTimeline => {
	const requiredDays = Math.max(
		baseTimeline.totalDays,
		Math.ceil(viewportWidth / Math.max(pixelsPerDay, 1)),
	);

	if (requiredDays === baseTimeline.totalDays) {
		return baseTimeline;
	}

	const extraDays = requiredDays - baseTimeline.totalDays;
	const desiredStart = anchor
		? addDays(anchor.date, -Math.round(requiredDays * anchor.ratio))
		: addDays(baseTimeline.start, -Math.floor(extraDays / 2));
	const earliestStart = addDays(baseTimeline.end, -requiredDays);
	const latestStart = baseTimeline.start;
	const start =
		desiredStart < earliestStart
			? earliestStart
			: desiredStart > latestStart
				? latestStart
				: desiredStart;

	return {
		end: addDays(start, requiredDays),
		start,
		totalDays: requiredDays,
	};
};

const getHorizontalScrollContainer = (node: HTMLElement | null) => {
	let parent = node?.parentElement ?? null;

	while (parent) {
		const overflowX = window.getComputedStyle(parent).overflowX;
		const canScrollHorizontally =
			overflowX === "auto" || overflowX === "scroll";

		if (canScrollHorizontally && parent.scrollWidth > parent.clientWidth) {
			return parent;
		}

		parent = parent.parentElement;
	}

	return null;
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

const getDragGuideLeftPercent = (
	date: Date,
	timeline: ReturnType<typeof buildAutonomousProjectGantt>["timeline"],
) => {
	const ratio = Math.min(
		Math.max(daysBetween(timeline.start, date) / timeline.totalDays, 0),
		1,
	);

	return ratio * 100;
};

const getEventPayload = (
	event: ProjectGanttEvent,
	overrides: Partial<ProjectGanttEventPayload> = {},
): ProjectGanttEventPayload => ({
	eventKind: event.eventKind,
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

const shiftEventPlanDates = (
	event: ProjectGanttEvent,
	deltaDays: number,
) => ({
	...event,
	planEndDate: shiftEventDateValue(event.planEndDate, deltaDays),
	planStartDate: shiftEventDateValue(event.planStartDate, deltaDays),
});

const hasEventFactDates = (event: ProjectGanttEvent) =>
	Boolean(event.factStartDate || event.factEndDate);

const DEPENDENCY_FACT_DATES_CONFIRM_MESSAGE =
	"У этапа есть фактические даты. Привязка изменит только плановые даты, фактические даты останутся без изменений. Продолжить?";

const getApiErrorMessage = (error: unknown, fallbackMessage: string) => {
	const responseData =
		typeof error === "object" && error && "response" in error
			? (error as { response?: { data?: { message?: unknown } } }).response?.data
			: null;
	const message = responseData?.message;

	if (Array.isArray(message)) {
		return message.filter(Boolean).join("\n") || fallbackMessage;
	}

	if (typeof message === "string" && message.trim()) {
		return message;
	}

	return fallbackMessage;
};

const getInclusiveDurationDays = (start: Date, end: Date) =>
	Math.max(daysBetween(start, end) + 1, 1);

const getInclusiveDurationFromValues = (startValue: string, endValue: string) => {
	const start = parseGanttDate(startValue);
	const end = parseGanttDate(endValue);

	return start && end ? String(getInclusiveDurationDays(start, end)) : "";
};

const getPlanEndFromDuration = (planStartValue: string, durationValue: string) => {
	const planStart = parseGanttDate(planStartValue);
	const durationDays = toNumberOrNull(durationValue);

	return planStart && durationDays
		? formatInputDate(addDays(planStart, durationDays - 1))
		: "";
};

const getStageFormDerivedDuration = (form: StageFormState) =>
	getInclusiveDurationFromValues(form.planStartDate, form.planEndDate) ||
	form.durationDays;

const withDerivedStageDuration = (form: StageFormState): StageFormState => ({
	...form,
	durationDays: getStageFormDerivedDuration(form),
});

const withPlanEndFromStageDuration = (
	form: StageFormState,
): StageFormState => {
	const planEndDate = getPlanEndFromDuration(
		form.planStartDate,
		form.durationDays,
	);

	return planEndDate
		? {
				...form,
				planEndDate,
			}
		: form;
};

const getPlanAnchorDateFromEvent = (
	event: ProjectGanttEvent | null | undefined,
	anchor: ProjectGanttDependencyAnchor | null | undefined,
) => {
	if (!event) {
		return null;
	}

	const planStart = parseGanttDate(event.planStartDate);
	const planEnd = parseGanttDate(event.planEndDate);

	return anchor === "stage_start" ? planStart : (planEnd ?? planStart);
};

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

export const AutonomousProjectGantt = ({
  onPaymentsChanged, project, onPlanningChange, focusStage,
}: {
  onPaymentsChanged?: () => void;
  project: ReportProject | null;
  onPlanningChange?: (stages: ProjectGanttStage[] | null, error: string | null) => void;
  focusStage?: { id: number; revision: number } | null;
}) => {
	const [stages, setStages] = useState<ProjectGanttStage[]>([]);
	const [events, setEvents] = useState<ProjectGanttEvent[]>([]);
	const [payments, setPayments] = useState<AutonomousProjectPayment[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [stageForm, setStageForm] = useState<StageFormState>(DEFAULT_STAGE_FORM);
	const [eventForm, setEventForm] = useState<EventFormState>(DEFAULT_EVENT_FORM);
	const [paymentForm, setPaymentForm] =
		useState<PaymentFormState>(DEFAULT_PAYMENT_FORM);
	const [isStageModalOpen, setIsStageModalOpen] = useState(false);
	const [expandedGroupIds, setExpandedGroupIds] = useState<Set<number>>(
		new Set(),
	);
	const [isGroupExpansionInitialized, setIsGroupExpansionInitialized] =
		useState(false);
	const [isEventModalOpen, setIsEventModalOpen] = useState(false);
	const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
	const [deletingStageId, setDeletingStageId] = useState<number | null>(null);
	const [deletingEventId, setDeletingEventId] = useState<number | null>(null);
	const [deletingPaymentId, setDeletingPaymentId] = useState<number | null>(null);
	const ganttViewportRef = useRef<HTMLDivElement | null>(null);
	const ganttBoardRef = useRef<HTMLDivElement | null>(null);
	const ganttScaleRef = useRef<HTMLDivElement | null>(null);
	const paymentMarkerRefs = useRef(new Map<number, HTMLButtonElement>());
	const eventRefsByStageId = useRef(new Map<number, HTMLButtonElement>());
	const groupDropTargetRefs = useRef(new Map<number, HTMLDivElement>());
	const stageDropTargetRefs = useRef(new Map<number, HTMLDivElement>());
	const [paymentLinksLayout, setPaymentLinksLayout] =
		useState<PaymentLinkLayout>({
			height: 0,
			links: [],
			width: 0,
		});
	const [dependencyLinkDraft, setDependencyLinkDraft] =
		useState<DependencyLinkDraft>(null);
	const [dragDateGuide, setDragDateGuide] = useState<DragDateGuide>(null);
	const [draggingStageId, setDraggingStageId] = useState<number | null>(null);
	const [dragTargetGroupId, setDragTargetGroupId] = useState<number | null>(
		null,
	);
	const [stageDropTarget, setStageDropTarget] = useState<StageDropTarget>(null);
	const [stageRowHeights, setStageRowHeights] = useState<Record<number, number>>(
		{},
	);
	const [pixelsPerDay, setPixelsPerDay] = useState(
		GANTT_DEFAULT_PIXELS_PER_DAY,
	);
	const pixelsPerDayRef = useRef(GANTT_DEFAULT_PIXELS_PER_DAY);
	const targetPixelsPerDayRef = useRef(GANTT_DEFAULT_PIXELS_PER_DAY);
	const zoomAnimationFrameRef = useRef<number | null>(null);
	const isTimelineZoomingRef = useRef(false);
	const [paymentLinksTimelineRevision, setPaymentLinksTimelineRevision] =
		useState(0);
	const timelineZoomPointerAnchorRef =
		useRef<TimelineZoomPointerAnchor | null>(null);
	const [ganttViewportWidth, setGanttViewportWidth] = useState(0);
	const [timelineZoomAnchor, setTimelineZoomAnchor] =
		useState<TimelineZoomAnchor | null>(null);
	const today = useMemo(() => {
		const currentDate = new Date();

		return new Date(
			currentDate.getFullYear(),
			currentDate.getMonth(),
			currentDate.getDate(),
		);
	}, []);
	const baseGantt = useMemo(
		() => buildAutonomousProjectGantt({ events, payments, stages, today }),
		[events, payments, stages, today],
	);
	const availableTimelineWidth = Math.max(
		ganttViewportWidth - GANTT_STAGE_COLUMN_WIDTH,
		1,
	);
	const displayTimeline = useMemo(
		() =>
			getDisplayTimeline(
				baseGantt.timeline,
				availableTimelineWidth,
				pixelsPerDay,
				timelineZoomAnchor,
			),
		[
			availableTimelineWidth,
			baseGantt.timeline,
			pixelsPerDay,
			timelineZoomAnchor,
		],
	);
	const gantt = useMemo(
		() => ({ ...baseGantt, timeline: displayTimeline }),
		[baseGantt, displayTimeline],
	);
	const visibleGanttRows = useMemo(
		() => getVisibleAutonomousGanttRows(gantt.rows.map((row) => ({
      ...row, events: row.events.map((item) => ({
        ...item, factStart: null, factEnd: null,
        displayDate: item.planStart ?? (item.isDependencyDuration ? item.displayStart : null),
      })),
    })), expandedGroupIds),
		[expandedGroupIds, gantt.rows],
	);
	const monthTicks = useMemo(
		() => getMonthTicks(gantt.timeline),
		[gantt.timeline],
	);
	const weekTicks = useMemo(() => getWeekTicks(gantt.timeline), [gantt.timeline]);
	const timelineWidth = Math.max(
		availableTimelineWidth,
		gantt.timeline.totalDays * pixelsPerDay,
	);
	const effectivePixelsPerDay =
		timelineWidth / Math.max(gantt.timeline.totalDays, 1);
	const scaleWeekTicks = useMemo(() => {
		const step = effectivePixelsPerDay < 7 ? 2 : 1;

		return weekTicks.filter((_, index) => index % step === 0);
	}, [effectivePixelsPerDay, weekTicks]);
	const ganttBoardWidth = GANTT_STAGE_COLUMN_WIDTH + timelineWidth;
	const animateTimelineZoom = useCallback(() => {
		const currentPixelsPerDay = pixelsPerDayRef.current;
		const targetPixelsPerDay = targetPixelsPerDayRef.current;
		const difference = targetPixelsPerDay - currentPixelsPerDay;

		if (Math.abs(difference) < 0.01) {
			pixelsPerDayRef.current = targetPixelsPerDay;
			setPixelsPerDay(targetPixelsPerDay);
			isTimelineZoomingRef.current = false;
			setPaymentLinksTimelineRevision((revision) => revision + 1);
			zoomAnimationFrameRef.current = null;
			return;
		}

		const nextPixelsPerDay = currentPixelsPerDay + difference * 0.32;
		pixelsPerDayRef.current = nextPixelsPerDay;
		setPixelsPerDay(nextPixelsPerDay);
		zoomAnimationFrameRef.current = window.requestAnimationFrame(
			animateTimelineZoom,
		);
	}, []);
	const handleGanttWheel = useCallback(
		(event: WheelEvent) => {
			const board = ganttBoardRef.current;
			const scale = ganttScaleRef.current;

			if (!board || !scale) {
				return;
			}

			const scrollContainer = getHorizontalScrollContainer(board);

			if (event.ctrlKey) {
				event.preventDefault();
				const direction = event.deltaY < 0 ? 1 : -1;
				const scaleRect = scale.getBoundingClientRect();
				const cursorTimelineRatio = Math.min(
					Math.max(
						(event.clientX - scaleRect.left) /
							Math.max(scaleRect.width, 1),
						0,
					),
					1,
				);
				const anchorDate = addDays(
					gantt.timeline.start,
					Math.round(gantt.timeline.totalDays * cursorTimelineRatio),
				);
				const zoomAnchor: TimelineZoomAnchor = {
					date: anchorDate,
					ratio: cursorTimelineRatio,
				};

				const nextPixelsPerDay = Math.min(
					GANTT_MAX_PIXELS_PER_DAY,
					Math.max(
						GANTT_MIN_PIXELS_PER_DAY,
						targetPixelsPerDayRef.current + direction * GANTT_ZOOM_STEP,
					),
				);

				if (nextPixelsPerDay === targetPixelsPerDayRef.current) {
					return;
				}

				timelineZoomPointerAnchorRef.current = {
					date: anchorDate,
					viewportX: event.clientX,
				};
				isTimelineZoomingRef.current = true;
				setTimelineZoomAnchor(zoomAnchor);
				targetPixelsPerDayRef.current = nextPixelsPerDay;

				if (zoomAnimationFrameRef.current === null) {
					zoomAnimationFrameRef.current = window.requestAnimationFrame(
						animateTimelineZoom,
					);
				}
				return;
			}

			if (event.shiftKey && scrollContainer) {
				event.preventDefault();
				scrollContainer.scrollLeft += event.deltaY || event.deltaX;
			}
		},
		[
			animateTimelineZoom,
			gantt.timeline,
			timelineWidth,
		],
	);

	useLayoutEffect(() => {
		const pointerAnchor = timelineZoomPointerAnchorRef.current;
		const viewport = ganttViewportRef.current;
		const scale = ganttScaleRef.current;

		if (!pointerAnchor || !viewport || !scale) {
			return;
		}

		const anchorOffsetDays = daysBetween(
			gantt.timeline.start,
			pointerAnchor.date,
		);
		const anchorTimelineX =
			(anchorOffsetDays / Math.max(gantt.timeline.totalDays, 1)) *
			scale.clientWidth;
		const viewportX = pointerAnchor.viewportX - viewport.getBoundingClientRect().left;

		viewport.scrollLeft = scale.offsetLeft + anchorTimelineX - viewportX;
	}, [gantt.timeline.start, gantt.timeline.totalDays, timelineWidth]);

	useLayoutEffect(() => {
		const viewport = ganttViewportRef.current;

		if (!viewport) {
			return;
		}

		const updateViewportWidth = () => {
			setGanttViewportWidth(viewport.clientWidth);
		};
		const resizeObserver = new ResizeObserver(updateViewportWidth);

		updateViewportWidth();
		resizeObserver.observe(viewport);

		return () => resizeObserver.disconnect();
	}, [isLoading]);

	useEffect(() => {
		const viewport = ganttViewportRef.current;

		if (!viewport) {
			return;
		}

		viewport.addEventListener("wheel", handleGanttWheel, {
			capture: true,
			passive: false,
		});

		return () =>
			viewport.removeEventListener("wheel", handleGanttWheel, true);
	}, [handleGanttWheel, isLoading]);

	useEffect(() => {
		setPixelsPerDay(GANTT_DEFAULT_PIXELS_PER_DAY);
		pixelsPerDayRef.current = GANTT_DEFAULT_PIXELS_PER_DAY;
		targetPixelsPerDayRef.current = GANTT_DEFAULT_PIXELS_PER_DAY;
		timelineZoomPointerAnchorRef.current = null;
		setTimelineZoomAnchor(null);

		const animationFrameId = window.requestAnimationFrame(() => {
			const scrollContainer = getHorizontalScrollContainer(
				ganttBoardRef.current,
			);

			if (scrollContainer) {
				scrollContainer.scrollLeft = 0;
			}
		});

		return () => window.cancelAnimationFrame(animationFrameId);
	}, [project?.id]);

	useEffect(
		() => () => {
			if (zoomAnimationFrameRef.current !== null) {
				window.cancelAnimationFrame(zoomAnimationFrameRef.current);
			}
		},
		[],
	);
	const updateGanttTimelineOffset = useCallback(() => {
		const boardNode = ganttBoardRef.current;
		const scaleNode = ganttScaleRef.current;

		if (!boardNode || !scaleNode) {
			return;
		}

		boardNode.style.setProperty(
			"--gantt-timeline-left",
			`${scaleNode.offsetLeft}px`,
		);
	}, []);

	useEffect(() => {
		if (isLoading) {
			ganttBoardRef.current?.style.removeProperty("--gantt-timeline-left");
			return;
		}

		let animationFrameId = window.requestAnimationFrame(
			updateGanttTimelineOffset,
		);

		const handleUpdate = () => {
			window.cancelAnimationFrame(animationFrameId);
			animationFrameId = window.requestAnimationFrame(updateGanttTimelineOffset);
		};

		window.addEventListener("resize", handleUpdate);

		return () => {
			window.cancelAnimationFrame(animationFrameId);
			window.removeEventListener("resize", handleUpdate);
		};
	}, [isLoading, updateGanttTimelineOffset]);

	const dragDateGuidePercent = dragDateGuide
		? getDragGuideLeftPercent(dragDateGuide.date, gantt.timeline)
		: null;
	const todayLinePercent = useMemo(() => {
		if (today < gantt.timeline.start || today > gantt.timeline.end) {
			return null;
		}

		return getDragGuideLeftPercent(today, gantt.timeline);
	}, [gantt.timeline, today]);
	const stageById = useMemo(
		() => new Map(stages.map((stage) => [stage.id, stage])),
		[stages],
	);
	const eventByStageId = useMemo(
		() => new Map(events.map((event) => [event.stageId, event])),
		[events],
	);
	const editableStages = useMemo(
		() =>
			stages.filter((stage) => stage.code !== "payments" && !stage.isGroup),
		[stages],
	);
	useEffect(() => {
		setExpandedGroupIds(new Set());
		setIsGroupExpansionInitialized(false);
	}, [project?.id]);
	useEffect(() => {
		if (isGroupExpansionInitialized || !stages.length) {
			return;
		}

		setExpandedGroupIds(
			new Set(stages.filter((stage) => stage.isGroup).map((stage) => stage.id)),
		);
		setIsGroupExpansionInitialized(true);
	}, [isGroupExpansionInitialized, stages]);
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
	const setGroupDropTargetRef = useCallback(
		(groupStageId: number) => (node: HTMLDivElement | null) => {
			if (node) {
				groupDropTargetRefs.current.set(groupStageId, node);
				return;
			}

			groupDropTargetRefs.current.delete(groupStageId);
		},
		[],
	);
	const setStageDropTargetRef = useCallback(
		(stageId: number) => (node: HTMLDivElement | null) => {
			if (node) {
				stageDropTargetRefs.current.set(stageId, node);
				return;
			}

			stageDropTargetRefs.current.delete(stageId);
		},
		[],
	);
	const handleStageRowHeightChange = useCallback(
		(stageId: number, height: number) => {
			setStageRowHeights((currentHeights) => ({
				...currentHeights,
				[stageId]: height,
			}));
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

			if (signal?.aborted) return;
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
			if (isTimelineZoomingRef.current) {
				return;
			}

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
				const targetTrackRect =
					targetNode
						.closest<HTMLElement>("[data-autonomous-gantt-track='true']")
						?.getBoundingClientRect() ?? targetRect;
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
				const targetDate = getAutonomousPaymentAnchorDate(
					targetEvent,
					payment.paymentAnchor,
				);
				const isTargetDuration =
					targetEvent.isDependencyDuration ||
					targetEvent.event.eventKind === "duration";
				const endX =
					(targetDate
						? targetTrackRect.left +
							targetTrackRect.width *
								Math.min(
									Math.max(
										daysBetween(gantt.timeline.start, targetDate) /
											gantt.timeline.totalDays,
										0,
									),
									1,
								)
						: isTargetDuration
							? payment.paymentAnchor === "stage_start"
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
			if (isTimelineZoomingRef.current) {
				return;
			}

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
	}, [
		gantt.rows,
		gantt.timeline.start,
		gantt.timeline.totalDays,
		paymentLinksTimelineRevision,
		timelineWidth,
	]);

  useEffect(() => {
    onPlanningChange?.(isLoading || error ? null : stages, error);
  }, [stages, isLoading, error, onPlanningChange]);
  useEffect(() => {
    if (!focusStage || isLoading) return;
    setExpandedGroupIds((current) => new Set([...current, focusStage.id]));
    const frame = requestAnimationFrame(() => {
      ganttBoardRef.current?.querySelector<HTMLElement>(`[data-planning-stage-id="${focusStage.id}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    });
    return () => cancelAnimationFrame(frame);
  }, [focusStage, isLoading]);

	const openStageCreateModal = (parentStageId: number | null = null) => {
		setStageForm({
			...DEFAULT_STAGE_FORM,
			parentStageId,
			title: getStageTypeLabel(DEFAULT_STAGE_FORM.stageType),
		});
		setIsStageModalOpen(true);
	};

	const openGroupCreateModal = () => {
		setStageForm({
			...DEFAULT_STAGE_FORM,
			isGroup: true,
			title: "Новый этап",
		});
		setIsStageModalOpen(true);
	};

	const openStageEditModal = (stage: ProjectGanttStage) => {
		const stageEvent = events.find((event) => event.stageId === stage.id);
		const stageType = getStageTypeFromStage(stage);
		const nextForm: StageFormState = {
			dependsOnStageId: stage.dependsOnStageId,
			dependencyAnchor: stage.dependencyAnchor ?? "stage_end",
			durationDays: stage.durationDays === null ? "" : String(stage.durationDays),
			eventId: stageEvent?.id ?? null,
			factEndDate: stageEvent?.factEndDate ?? "",
			factStartDate: stageEvent?.factStartDate ?? "",
			id: stage.id,
			isGroup: stage.isGroup,
			parentStageId: stage.parentStageId,
			plannedHours: stage.plannedHours == null ? "" : String(stage.plannedHours),
			groupStatus: stage.groupStatus ?? "not_started",
			planEndDate: stageEvent?.planEndDate ?? "",
			planStartDate: stageEvent?.planStartDate ?? "",
			stageType,
			title: stage.title,
		};

		setStageForm(withDerivedStageDuration(nextForm));
		setIsStageModalOpen(true);
	};

	const toggleGroupExpanded = (groupStageId: number) => {
		setExpandedGroupIds((currentIds) => {
			const nextIds = new Set(currentIds);

			if (nextIds.has(groupStageId)) {
				nextIds.delete(groupStageId);
			} else {
				nextIds.add(groupStageId);
			}

			return nextIds;
		});
	};

	const handleGroupStatusChange = async (
		stage: ProjectGanttStage,
		groupStatus: ProjectGanttGroupStatus,
	) => {
    if (needsStageCompletionConfirmation(stage.id, groupStatus, stages) &&
        !window.confirm("У этапа есть незавершённые подэтапы. Завершить только этот этап? Статусы подэтапов не изменятся.")) return;
		try {
			const updatedStage = await updateProjectGanttStage(stage.id, {
				groupStatus,
			});
			setStages((currentStages) =>
				currentStages.map((item) =>
					item.id === updatedStage.id ? updatedStage : item,
				),
			);
		} catch (error) {
			notify({
				duration: 5000,
				message: getApiErrorMessage(error, "Не удалось обновить статус этапа"),
				type: "error",
			});
		}
	};

	const moveStageToParent = useCallback(async (
		stage: ProjectGanttStage,
		dropTarget: Exclude<StageDropTarget, null>,
	) => {
		try {
			await moveProjectGanttStageParent(
				stage.id,
				dropTarget.parentStageId,
				dropTarget.beforeStageId,
			);
			await refreshData();
		} catch (error) {
			notify({
				duration: 5000,
				message: getApiErrorMessage(error, "Не удалось перенести этап"),
				type: "error",
			});
		}
	}, [refreshData]);

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

	const handleStageReorderDragStart = useCallback(
		(
			pointerEvent: ReactPointerEvent<HTMLElement>,
			stage: ProjectGanttStage,
		) => {
			if (
				pointerEvent.button !== 0 ||
				stage.code === "payments" ||
				(pointerEvent.target as HTMLElement).closest("button")
			) {
				return;
			}

			pointerEvent.preventDefault();

			const dragTarget = pointerEvent.currentTarget;
			let latestDropTarget: StageDropTarget = null;
			const handlePointerMove = (moveEvent: PointerEvent) => {
				const targetStageId = Array.from(
					stageDropTargetRefs.current.entries(),
				).find(([, node]) => {
					const rect = node.getBoundingClientRect();

					return (
						moveEvent.clientY >= rect.top &&
						moveEvent.clientY <= rect.bottom
					);
				})?.[0] ?? null;
				const targetStage = targetStageId
					? stages.find((item) => item.id === targetStageId) ?? null
					: null;
				const targetStageNode = targetStageId
					? stageDropTargetRefs.current.get(targetStageId) ?? null
					: null;
				const targetStageRect = targetStageNode?.getBoundingClientRect() ?? null;
				const targetGroupId = Array.from(
					groupDropTargetRefs.current.entries(),
				).find(([, node]) => {
					const rect = node.getBoundingClientRect();

					return (
						moveEvent.clientY >= rect.top &&
						moveEvent.clientY <= rect.bottom
					);
				})?.[0] ?? null;
				const nextDropTarget: StageDropTarget =
					targetStage &&
					targetStage.id !== stage.id &&
					targetStage.parentStageId !== null &&
					targetStageRect
						? (() => {
							const placement =
								moveEvent.clientY <
								targetStageRect.top + targetStageRect.height / 2
									? "before"
									: "after";
							const siblings = stages
								.filter(
									(item) =>
										!item.isGroup &&
										item.code !== "payments" &&
										item.id !== stage.id &&
										item.parentStageId === targetStage.parentStageId,
								)
								.toSorted((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
							const nextSibling = siblings.at(
								siblings.findIndex((item) => item.id === targetStage.id) + 1,
							);

							return {
								anchorStageId: targetStage.id,
								beforeStageId:
									placement === "before"
										? targetStage.id
										: nextSibling?.id ?? null,
								parentStageId: targetStage.parentStageId,
								placement,
							};
						})()
						: targetGroupId !== null
							? {
									anchorStageId: null,
									beforeStageId: null,
									parentStageId: targetGroupId,
									placement: "append",
								}
							: null;

				latestDropTarget = nextDropTarget;
				setDragTargetGroupId(nextDropTarget?.parentStageId ?? null);
				setStageDropTarget(nextDropTarget);

				if (nextDropTarget !== null) {
					setDraggingStageId(stage.id);
					moveEvent.preventDefault();
				}
			};
			const handlePointerUp = () => {
				window.removeEventListener("pointermove", handlePointerMove);
				window.removeEventListener("pointerup", handlePointerUp);
				setDraggingStageId(null);
				setDragTargetGroupId(null);
				setStageDropTarget(null);

				if (latestDropTarget !== null) {
					markGanttDragClick(dragTarget);
					void moveStageToParent(stage, latestDropTarget);
				}
			};

			window.addEventListener("pointermove", handlePointerMove);
			window.addEventListener("pointerup", handlePointerUp, { once: true });
		},
		[moveStageToParent, stages],
	);

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
			const initialEventById = new Map(
				events.map((currentEvent) => [currentEvent.id, currentEvent]),
			);
			const initialStage = stages.find((stage) => stage.id === event.stageId);
			const minDate =
				field === "factEndDate" && eventRow?.isDependencyDuration
					? eventRow.displayStart
					: null;
			let latestEvent = event;
			let latestEventsToSave: ProjectGanttEvent[] = [event];
			let latestStages = stages;
			let latestStageToSave: ProjectGanttStage | null = null;
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
				const shouldUpdateDependencyDuration =
					field === "planEndDate" &&
					Boolean(eventRow?.isDependencyDuration && eventRow.displayStart);
				const nextDurationDays =
					shouldUpdateDependencyDuration && eventRow?.displayStart
						? getInclusiveDurationDays(eventRow.displayStart, clampedDate)
						: null;
				const nextStages =
					nextDurationDays && initialStage
						? stages.map((stage) =>
								stage.id === initialStage.id
									? {
											...stage,
											durationDays: nextDurationDays,
										}
									: stage,
							)
						: stages;
				latestEvent = nextEvent;
				latestStages = nextStages;
				if (nextDurationDays && initialStage) {
					latestStageToSave =
						initialStage.durationDays !== nextDurationDays
							? {
									...initialStage,
									durationDays: nextDurationDays,
								}
							: null;
				} else {
					latestStageToSave = null;
				}
				latestValue = nextValue;
				setDragDateGuide({
					date: clampedDate,
				});

				const nextEvents = recalculateAutonomousDependencyEvents(
					events.map((currentEvent) =>
						currentEvent.id === event.id ? nextEvent : currentEvent,
					),
					nextStages,
					events,
					stages,
					today,
				);

				latestEventsToSave = nextEvents.filter(
					(currentEvent) =>
						EVENT_DATE_FIELDS.some(
							(fieldName) =>
								currentEvent[fieldName] !==
								initialEventById.get(currentEvent.id)?.[fieldName],
						),
				);

				setStages(nextStages);
				setEvents(nextEvents);
				setPayments((currentPayments) =>
					resolveAutonomousPaymentDates({
						events: nextEvents,
						payments: currentPayments,
						stages: nextStages,
						today,
					}),
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
				setDragDateGuide(null);

				if (!hasMoved || latestValue === event[field]) {
					return;
				}

				markGanttDragClick(dragTarget);
				void Promise.all([
					...latestEventsToSave.map((eventToSave) =>
						updateProjectGanttEvent(
							eventToSave.id,
							eventToSave.id === event.id
								? getEventPayload(latestEvent, {
										[field]: latestValue,
									})
								: getEventPayload(eventToSave),
						),
					),
					...(latestStageToSave
						? [
								updateProjectGanttStage(latestStageToSave.id, {
									durationDays: latestStageToSave.durationDays,
								}),
							]
						: []),
				]).catch(() => {
						setStages(latestStages);
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
			const eventIdsToMove = new Set([event.id]);
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
			const eventVisualRange = eventRow ? getEventVisualRange(eventRow) : null;
			const eventVisualStart = eventVisualRange?.start ?? null;
			const eventVisualEnd = eventVisualRange?.end ?? eventVisualStart;
			const guideEdge =
				eventVisualStart && eventVisualEnd
					? Math.abs(startDate.getTime() - eventVisualStart.getTime()) <=
							Math.abs(startDate.getTime() - eventVisualEnd.getTime())
						? "start"
						: "end"
					: "start";
			const shouldMoveSelectedFactDates = true;
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
				const nextEvents = recalculateAutonomousDependencyEvents(
					events.map((currentEvent) => {
						if (!eventIdsToMove.has(currentEvent.id)) {
							return currentEvent;
						}

						const initialEvent =
							initialEventById.get(currentEvent.id) ?? currentEvent;

						if (currentEvent.id === event.id && shouldMoveSelectedFactDates) {
							return shiftEventDates(initialEvent, deltaDays, eventRow);
						}

						return shiftEventPlanDates(initialEvent, deltaDays);
					}),
					stages,
					events,
					stages,
					today,
				);
				const nextGantt = buildAutonomousProjectGantt({
					events: nextEvents,
					payments,
					stages,
					today,
				});
				const nextEventRow = nextGantt.rows
					.flatMap((row) => row.events)
					.find((rowEvent) => rowEvent.event.id === event.id);
				const nextEventRange = nextEventRow
					? getEventVisualRange(nextEventRow)
					: null;
				const guideDate =
					(guideEdge === "start"
						? nextEventRange?.start
						: nextEventRange?.end) ?? nextDate;
				setDragDateGuide({
					date: guideDate,
				});

				latestEventsToSave = nextEvents.filter((currentEvent) =>
					EVENT_DATE_FIELDS.some(
						(field) =>
							currentEvent[field] !==
							initialEventById.get(currentEvent.id)?.[field],
					),
				);

				setEvents(nextEvents);
				setPayments((currentPayments) =>
					resolveAutonomousPaymentDates({
						events: nextEvents,
						payments: currentPayments,
						stages,
						today,
					}),
				);

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
				setDragDateGuide(null);

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
		[events, gantt.rows, gantt.timeline, payments, refreshData, stages, today],
	);

	const handleDependencyLinkDragStart = useCallback(
		(
			pointerEvent: ReactPointerEvent<HTMLElement>,
			sourceStageId: number,
			_sourceAnchor: "left" | "right",
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
			const initialStages = stages;
			const initialTargetRects = Array.from(
				eventRefsByStageId.current.entries(),
			)
				.filter(([stageId]) => stageId !== sourceStageId)
				.map(([stageId, node]) => ({
					rect: node.getBoundingClientRect(),
					stageId,
				}));
			const getTargetStage = (clientX: number, clientY: number) => {
				for (const { rect, stageId } of initialTargetRects) {
					if (
						clientX >=
							rect.left - GANTT_DEPENDENCY_TARGET_HITBOX_PADDING &&
						clientX <=
							rect.right + GANTT_DEPENDENCY_TARGET_HITBOX_PADDING &&
						clientY >=
							rect.top - GANTT_DEPENDENCY_TARGET_HITBOX_PADDING &&
						clientY <=
							rect.bottom + GANTT_DEPENDENCY_TARGET_HITBOX_PADDING
					) {
						return {
							dependencyAnchor:
								clientX <= rect.left + rect.width / 2
									? "stage_start"
									: "stage_end",
							stageId,
						} satisfies {
							dependencyAnchor: ProjectGanttDependencyAnchor;
							stageId: number;
						};
					}
				}

				return null;
			};
			const getDependencyCandidate = (
				targetStage: {
					dependencyAnchor: ProjectGanttDependencyAnchor;
					stageId: number;
				} | null,
			) => {
				if (!targetStage) {
					return null;
				}

				const dependentStageId = sourceStageId;
				const dependencyStageId = targetStage.stageId;
				const dependencyAnchor = targetStage.dependencyAnchor;

				if (
					wouldCreateDependencyCycle(
						dependentStageId,
						dependencyStageId,
						initialStages,
					)
				) {
					return null;
				}

				const dependentStage = initialStages.find(
					(stage) => stage.id === dependentStageId,
				);
				const isDependentDurationStage = dependentStage
					? DURATION_STAGE_TYPES.has(getStageTypeFromStage(dependentStage))
					: false;
				const dependentEventRow = gantt.rows
					.flatMap((row) => row.events)
					.find((eventRow) => eventRow.event.stageId === dependentStageId);
				const dependentRange = dependentEventRow
					? getEventVisualRange(dependentEventRow)
					: null;
				const durationDays =
					isDependentDurationStage
						? (dependentStage?.durationDays ??
							(dependentRange?.start && dependentRange.end
								? Math.max(
										getInclusiveDurationDays(
											dependentRange.start,
											dependentRange.end,
										),
										1,
									)
								: null))
						: null;

				return {
					dependencyAnchor,
					dependencyStageId,
					dependentStageId,
					durationDays,
				};
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

				const candidate = getDependencyCandidate(
					getTargetStage(upEvent.clientX, upEvent.clientY),
				);

				if (!candidate) {
					return;
				}

				const nextStages = stages.map((stage) =>
					stage.id === candidate.dependentStageId
						? {
								...stage,
								dependsOnStageId: candidate.dependencyStageId,
								dependencyAnchor: candidate.dependencyAnchor,
								durationDays: candidate.durationDays,
							}
						: stage,
				);
				const nextEvents = recalculateAutonomousDependencyEvents(
					events,
					nextStages,
					events,
					stages,
					today,
				);
				const eventById = new Map(events.map((event) => [event.id, event]));
				const eventsToSave = nextEvents.filter((event) =>
					EVENT_DATE_FIELDS.some(
						(field) => event[field] !== eventById.get(event.id)?.[field],
					),
				);

				setStages(nextStages);
				setEvents(nextEvents);
				setPayments((currentPayments) =>
					resolveAutonomousPaymentDates({
						events: nextEvents,
						payments: currentPayments,
						stages: nextStages,
						today,
					}),
				);

				void updateProjectGanttStage(candidate.dependentStageId, {
					dependsOnStageId: candidate.dependencyStageId,
					dependencyAnchor: candidate.dependencyAnchor,
					durationDays: candidate.durationDays,
				})
					.then(() =>
						Promise.all(
							eventsToSave.map((event) =>
								updateProjectGanttEvent(event.id, getEventPayload(event)),
							),
						),
					)
					.catch(() => {
						void refreshData();
					});
			};

			updateDraft(pointerEvent.clientX, pointerEvent.clientY);
			window.addEventListener("pointermove", handlePointerMove);
			window.addEventListener("pointerup", handlePointerUp, { once: true });
		},
		[events, gantt.rows, refreshData, stages],
	);

	const handleStageSubmit = async () => {
		if (!project?.id) {
			return;
		}

    let plannedHours: number | null;
    try { plannedHours = parseGanttHours(stageForm.plannedHours); }
    catch (cause) {
      notify({ type: "error", message: cause instanceof Error ? cause.message : "Проверьте плановые часы", duration: 5000 });
      return;
    }
    if (needsStageCompletionConfirmation(stageForm.id, stageForm.groupStatus, stages) &&
        !window.confirm("У этапа есть незавершённые подэтапы. Завершить только этот этап? Статусы подэтапов не изменятся.")) return;
		try {
    // Editing only hours, title or manual status must not recalculate the schedule.
    const previousStage = stages.find((item) => item.id === stageForm.id);
    const previousEvent = events.find((item) => item.stageId === stageForm.id);
    if (previousStage && !stageForm.isGroup &&
        stageForm.stageType === getStageTypeFromStage(previousStage) &&
        stageForm.dependsOnStageId === previousStage.dependsOnStageId &&
        stageForm.dependencyAnchor === (previousStage.dependencyAnchor ?? "stage_end") &&
        stageForm.planStartDate === (previousEvent?.planStartDate ?? "") &&
        stageForm.planEndDate === (previousEvent?.planEndDate ?? "") &&
        stageForm.durationDays === (getInclusiveDurationFromValues(previousEvent?.planStartDate ?? "", previousEvent?.planEndDate ?? "") || (previousStage.durationDays == null ? "" : String(previousStage.durationDays)))) {
      await updateProjectGanttStage(previousStage.id, {
        title: stageForm.title.trim() || previousStage.title, plannedHours, groupStatus: stageForm.groupStatus,
      });
      setIsStageModalOpen(false);
      await refreshData();
      return;
    }
		if (stageForm.isGroup) {
			const groupPayload = {
				plannedHours,
				groupStatus: stageForm.groupStatus,
				isGroup: true,
				stageType: stageForm.stageType,
				title: stageForm.title.trim() || "Новый этап",
			};

			if (stageForm.id) {
				await updateProjectGanttStage(stageForm.id, groupPayload);
			} else {
				await createProjectGanttStage(String(project.id), {
					...groupPayload,
					sortOrder: stages.length,
				});
			}

			setIsStageModalOpen(false);
			await refreshData();
			return;
		}

		const title = stageForm.title.trim() || getStageTypeLabel(stageForm.stageType);
		const isDependencyStage = Boolean(stageForm.dependsOnStageId);
		const eventKind = getStageEventKind(stageForm.stageType);
		const isDependencyDurationStage =
			isDependencyStage && eventKind === "duration";
		const durationDays = isDependencyDurationStage
			? toNumberOrNull(stageForm.durationDays)
			: null;
		const existingStageEvent =
			stageForm.eventId !== null
				? (events.find((event) => event.id === stageForm.eventId) ?? null)
				: null;
		const existingStage =
			stageForm.id !== null
				? (stages.find((stage) => stage.id === stageForm.id) ?? null)
				: null;
		const isDependencyChanged =
			Boolean(stageForm.dependsOnStageId) &&
			(existingStage?.dependsOnStageId !== stageForm.dependsOnStageId ||
				(existingStage?.dependencyAnchor ?? "stage_end") !==
					stageForm.dependencyAnchor);

		if (
			isDependencyChanged &&
			existingStageEvent &&
			hasEventFactDates(existingStageEvent) &&
			!window.confirm(DEPENDENCY_FACT_DATES_CONFIRM_MESSAGE)
		) {
			return;
		}

		const dependencyEventRow = stageForm.dependsOnStageId
			? (gantt.rows
					.find((row) => row.stage.id === stageForm.dependsOnStageId)
					?.events.at(0) ?? null)
			: null;
		const dependencyStart = dependencyEventRow
			? getAutonomousDependencyAnchorDate(
					dependencyEventRow,
					stageForm.dependencyAnchor,
					today,
				)
			: null;
		const dependencyPlanStart =
			parseGanttDate(stageForm.planStartDate) ??
			dependencyStart ??
			parseGanttDate(existingStageEvent?.planStartDate ?? null);
		const dependencyPlanEnd =
			isDependencyDurationStage && dependencyPlanStart
				? (parseGanttDate(stageForm.planEndDate) ??
					(durationDays
						? addDays(dependencyPlanStart, durationDays - 1)
						: (parseGanttDate(existingStageEvent?.planEndDate ?? null) ??
							dependencyPlanStart)))
				: null;
		const eventPayload = {
			eventKind,
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
			plannedHours,
			groupStatus: stageForm.groupStatus,
			dependsOnStageId: stageForm.dependsOnStageId,
			dependencyAnchor: stageForm.dependsOnStageId
				? stageForm.dependencyAnchor
				: null,
			durationDays,
			stageType: stageForm.stageType,
			title,
		};
		let savedStageId = stageForm.id;
		let savedStage: ProjectGanttStage | null = null;
		let savedEvent: ProjectGanttEvent | null = null;

		if (stageForm.id) {
			await updateProjectGanttStage(stageForm.id, stagePayload);
			savedStage = existingStage
				? {
						...existingStage,
						...stagePayload,
						dependencyAnchor: stagePayload.dependencyAnchor,
						dependsOnStageId: stagePayload.dependsOnStageId,
						durationDays: stagePayload.durationDays,
						stageType: stagePayload.stageType,
						title: stagePayload.title,
					}
				: null;

			const stageEvent =
				stageForm.eventId ??
				events.find((event) => event.stageId === stageForm.id)?.id ??
				null;

			if (stageEvent) {
				savedEvent = await updateProjectGanttEvent(stageEvent, {
					...eventPayload,
					stageId: stageForm.id,
				});
			} else {
				savedEvent = await createProjectGanttEvent(String(project.id), {
					...eventPayload,
					sortOrder: events.length,
					stageId: stageForm.id,
				});
			}
		} else {
			const createdStage = await createProjectGanttStage(String(project.id), {
				...stagePayload,
				parentStageId: stageForm.parentStageId,
				sortOrder: stages.length,
			});
			savedStageId = createdStage.id;
			savedStage = createdStage;
			const createdEvents = await fetchProjectGanttEvents(String(project.id));
			const createdStageEvent = createdEvents.find(
				(event) => event.stageId === createdStage.id,
			);

			if (createdStageEvent) {
				savedEvent = await updateProjectGanttEvent(createdStageEvent.id, {
					...eventPayload,
					stageId: createdStage.id,
				});
			} else {
				savedEvent = await createProjectGanttEvent(String(project.id), {
					...eventPayload,
					sortOrder: events.length,
					stageId: createdStage.id,
				});
			}
		}

		if (savedStageId && savedStage && savedEvent) {
			const nextStages = stages.some((stage) => stage.id === savedStageId)
				? stages.map((stage) =>
						stage.id === savedStageId
							? (savedStage as ProjectGanttStage)
							: stage,
					)
				: [...stages, savedStage];
			const baseEvents = events.some((event) => event.id === savedEvent?.id)
				? events.map((event) =>
						event.id === savedEvent?.id
							? (savedEvent as ProjectGanttEvent)
							: event,
					)
				: [...events, savedEvent];
			const recalculatedEvents = recalculateAutonomousDependencyEvents(
				baseEvents,
				nextStages,
				events,
				stages,
				today,
			);
			const baseEventById = new Map(
				baseEvents.map((event) => [event.id, event]),
			);
			const changedEvents = recalculatedEvents.filter((event) =>
				EVENT_DATE_FIELDS.some(
					(field) => event[field] !== baseEventById.get(event.id)?.[field],
				),
			);

			await Promise.all(
				changedEvents.map((event) =>
					updateProjectGanttEvent(event.id, getEventPayload(event)),
				),
			);
		}

		setIsStageModalOpen(false);
		await refreshData();
		onPaymentsChanged?.();
		} catch (error) {
			notify({
				duration: 5000,
				message: getApiErrorMessage(error, "Не удалось сохранить этап"),
				type: "error",
			});
		}
	};

	const handleStageDelete = async () => {
		if (!stageForm.id) {
			return;
		}

		if (deletingStageId !== stageForm.id) {
			setDeletingStageId(stageForm.id);
			return;
		}

		try {
			await deleteProjectGanttStage(stageForm.id);
			setDeletingStageId(null);
			setIsStageModalOpen(false);
			await refreshData();
		} catch (error) {
			notify({
				duration: 5000,
				message: getApiErrorMessage(error, "Не удалось удалить этап"),
				type: "error",
			});
		}
	};

	const handleEventSubmit = async () => {
		if (!project?.id || !eventForm.stageId || !eventForm.title.trim()) {
			return;
		}

		const payload = {
			eventKind: eventForm.eventKind,
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
				<div ref={ganttViewportRef} className={styles.ganttBoardScroll}>
					<div
						ref={ganttBoardRef}
						className={`${styles.ganttBoard} ${styles.autonomousGanttBoard}`}
						style={{
							gridTemplateColumns: `${GANTT_STAGE_COLUMN_WIDTH}px minmax(${timelineWidth}px, 1fr)`,
							minWidth: "100%",
							width: `${ganttBoardWidth}px`,
						}}
					>
						<div className={styles.ganttScaleLabel}>Этапы проекта</div>
						<div ref={ganttScaleRef} className={styles.ganttScale}>
							<AutonomousGanttScale
								monthTicks={monthTicks}
								weekTicks={scaleWeekTicks}
							/>
							{todayLinePercent !== null ? (
								<span
									className={styles.ganttTodayLineLabel}
									style={{ left: `${todayLinePercent}%` }}
								>
									{formatDateShort(today)}
								</span>
									) : null}
							{dragDateGuide && dragDateGuidePercent !== null ? (
								<div
									className={styles.ganttDragDateGuideLabel}
									style={{ left: `${dragDateGuidePercent}%` }}
								>
									{formatDateShort(dragDateGuide.date)}
								</div>
							) : null}
						</div>
						<AutonomousPaymentLinksLayer
							dependencyLinkDraft={dependencyLinkDraft}
							layout={paymentLinksLayout}
						/>
						{todayLinePercent !== null ? (
							<div className={styles.ganttTodayLineLayer}>
								<span
									className={styles.ganttTodayLine}
									style={{ left: `${todayLinePercent}%` }}
								/>
							</div>
						) : null}
						{visibleGanttRows.map((row) => (
							<AutonomousStageRow
								childStageCount={
									row.stage.isGroup
										? stages.filter(
											(stage) => stage.parentStageId === row.stage.id,
										).length
										: 0
								}
								key={row.stage.id}
								dragDateGuidePercent={dragDateGuidePercent}
								monthTicks={monthTicks}
								onPaymentCreate={openPaymentCreateModal}
								onPaymentEdit={openPaymentEditModal}
								onEventDateDragStart={handleEventDateDragStart}
								onDependencyLinkDragStart={handleDependencyLinkDragStart}
								onEventMoveDragStart={handleEventMoveDragStart}
								onStageReorderDragStart={handleStageReorderDragStart}
								onStageEdit={openStageEditModal}
								onGroupAddChild={openStageCreateModal}
								onGroupStatusChange={handleGroupStatusChange}
								onGroupToggle={toggleGroupExpanded}
								isGroupExpanded={expandedGroupIds.has(row.stage.id)}
								customRowHeight={stageRowHeights[row.stage.id]}
								onRowHeightChange={handleStageRowHeightChange}
								showAddChildButton={
									row.stage.isGroup && expandedGroupIds.has(row.stage.id)
								}
								dropPlacement={
									stageDropTarget?.anchorStageId === row.stage.id
										? stageDropTarget.placement
										: null
								}
								row={row}
								isPlanningSelected={focusStage?.id === row.stage.id}
								eventByStageId={eventByStageId}
								setPaymentMarkerRef={setPaymentMarkerRef}
								setStageEventRef={setStageEventRef}
								setGroupDropTargetRef={setGroupDropTargetRef}
								setStageDropTargetRef={setStageDropTargetRef}
								stageById={stageById}
								today={today}
								timeline={gantt.timeline}
								draggingStageId={draggingStageId}
								isDragTarget={dragTargetGroupId === row.stage.id}
								weekTicks={weekTicks}
							/>
						))}
						<div className={`${styles.ganttRowInfo} ${styles.ganttAddEventCell}`}>
							<button
								type="button"
								className={styles.ganttAddEventButton}
								title="Добавить родительский этап"
								onClick={openGroupCreateModal}
							>
								+
							</button>
						</div>
						<div className={styles.ganttTrack}>
							<AutonomousGanttTrackGrid
								monthTicks={monthTicks}
								weekTicks={weekTicks}
							/>
							{dragDateGuidePercent !== null ? (
								<span
									className={styles.ganttDragDateGuideLine}
									style={{ left: `${dragDateGuidePercent}%` }}
								/>
							) : null}
						</div>
					</div>
				</div>
			)}
      <GanttStickyScale boardRef={ganttBoardRef} viewportRef={ganttViewportRef} scaleRef={ganttScaleRef}
        enabled={!isLoading && !error} labelWidth={GANTT_STAGE_COLUMN_WIDTH}>
        <AutonomousGanttScale monthTicks={monthTicks} weekTicks={scaleWeekTicks} />
      </GanttStickyScale>
			<AutonomousGanttLegend />
			<StageModal
				deletingStageId={deletingStageId}
				events={events}
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
	isPlanningSelected,
	childStageCount,
	dragDateGuidePercent,
	isDragTarget,
	draggingStageId,
	eventByStageId,
	monthTicks,
	onDependencyLinkDragStart,
	onEventDateDragStart,
	onEventMoveDragStart,
	onPaymentCreate,
	onPaymentEdit,
	onStageReorderDragStart,
	onStageEdit,
	onGroupAddChild,
	onGroupStatusChange,
	onGroupToggle,
	isGroupExpanded,
	customRowHeight,
	onRowHeightChange,
	showAddChildButton,
	dropPlacement,
	row,
	setPaymentMarkerRef,
	setStageEventRef,
	setGroupDropTargetRef,
	setStageDropTargetRef,
	stageById,
	today,
	timeline,
	weekTicks,
}: {
	isPlanningSelected?: boolean;
	childStageCount: number;
	dragDateGuidePercent: number | null;
	isDragTarget: boolean;
	draggingStageId: number | null;
	eventByStageId: Map<number, ProjectGanttEvent>;
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
	onPaymentEdit: (payment: AutonomousProjectPayment) => void;
	onStageReorderDragStart: (
		event: ReactPointerEvent<HTMLElement>,
		stage: ProjectGanttStage,
	) => void;
	onStageEdit: (stage: ProjectGanttStage) => void;
	onGroupAddChild: (parentStageId: number) => void;
	onGroupStatusChange: (
		stage: ProjectGanttStage,
		status: ProjectGanttGroupStatus,
	) => void;
	onGroupToggle: (groupStageId: number) => void;
	isGroupExpanded: boolean;
	customRowHeight: number | undefined;
	onRowHeightChange: (stageId: number, height: number) => void;
	showAddChildButton: boolean;
	dropPlacement: Exclude<StageDropTarget, null>["placement"] | null;
	row: ReturnType<typeof buildAutonomousProjectGantt>["rows"][number];
	setPaymentMarkerRef: (
		paymentId: number,
	) => (node: HTMLButtonElement | null) => void;
	setStageEventRef: (
		stageId: number,
	) => (node: HTMLButtonElement | null) => void;
	setGroupDropTargetRef: (
		groupStageId: number,
	) => (node: HTMLDivElement | null) => void;
	setStageDropTargetRef: (
		stageId: number,
	) => (node: HTMLDivElement | null) => void;
	stageById: Map<number, ProjectGanttStage>;
	today: Date;
	timeline: ReturnType<typeof buildAutonomousProjectGantt>["timeline"];
	weekTicks: GanttWeekTick[];
}) => {
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
	const rowInfoRef = useRef<HTMLDivElement | null>(null);
	const stageTitleRef = useRef<HTMLElement | null>(null);
	const isPaymentsStage = row.stage.code === "payments";
	const planning = getGanttStagePlanning(row.stage, [...stageById.values()]);
	const isGroupStage = row.stage.isGroup;
	const canReorderStage = !isPaymentsStage && !isGroupStage;
	const isDraggingStage = draggingStageId === row.stage.id;
	const paymentLayoutItems = isPaymentsStage
		? getPaymentLayoutItems(row.payments, timeline)
		: [];
	const maxPaymentLevel = paymentLayoutItems.reduce(
		(maxLevel, item) => Math.max(maxLevel, item.level),
		0,
	);
	const defaultRowHeight = isPaymentsStage
		? row.payments.length
			? Math.max(
					GANTT_ROW_HEIGHT,
					GANTT_PAYMENT_MARKER_TOP +
						(maxPaymentLevel + 1) * GANTT_PAYMENT_MARKER_STEP +
						18,
				)
			: 52
		: isGroupStage && showAddChildButton
			? GANTT_MIN_GROUP_ROW_HEIGHT
			: GANTT_ROW_HEIGHT;
	const minRowHeight = isGroupStage && showAddChildButton
		? GANTT_MIN_GROUP_ROW_HEIGHT
		: GANTT_MIN_STAGE_ROW_HEIGHT;
	const rowHeight = isPaymentsStage
		? defaultRowHeight
		: Math.max(minRowHeight, customRowHeight ?? defaultRowHeight);
	const handleRowResizeStart = (event: ReactPointerEvent<HTMLDivElement>) => {
		if (event.button !== 0) {
			return;
		}

		event.preventDefault();
		event.stopPropagation();
		const startY = event.clientY;
		const startHeight = rowHeight;
		const handlePointerMove = (moveEvent: PointerEvent) => {
			const nextHeight = Math.min(
				GANTT_MAX_STAGE_ROW_HEIGHT,
				Math.max(minRowHeight, startHeight + moveEvent.clientY - startY),
			);
			onRowHeightChange(row.stage.id, nextHeight);
		};
		const handlePointerUp = () => {
			window.removeEventListener("pointermove", handlePointerMove);
			window.removeEventListener("pointerup", handlePointerUp);
		};

		window.addEventListener("pointermove", handlePointerMove);
		window.addEventListener("pointerup", handlePointerUp);
	};

	useEffect(() => {
		if (!isMenuOpen && !isStatusMenuOpen) {
			return;
		}

		const closeMenu = (event: PointerEvent) => {
			if (!rowInfoRef.current?.contains(event.target as Node)) {
				setIsMenuOpen(false);
				setIsStatusMenuOpen(false);
			}
		};
		const closeMenuOnEscape = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				setIsMenuOpen(false);
				setIsStatusMenuOpen(false);
			}
		};

		document.addEventListener("pointerdown", closeMenu);
		document.addEventListener("keydown", closeMenuOnEscape);

		return () => {
			document.removeEventListener("pointerdown", closeMenu);
			document.removeEventListener("keydown", closeMenuOnEscape);
		};
	}, [isMenuOpen, isStatusMenuOpen]);

	useLayoutEffect(() => {
		if (isPaymentsStage || !stageTitleRef.current) {
			return;
		}

		const requiredHeight = Math.max(
			minRowHeight,
			Math.ceil(
				stageTitleRef.current.offsetTop +
					stageTitleRef.current.scrollHeight +
					(isGroupStage && showAddChildButton ? 42 : 14),
			),
		);

		if (requiredHeight > rowHeight) {
			onRowHeightChange(row.stage.id, requiredHeight);
		}
	}, [
		isPaymentsStage,
		minRowHeight,
		onRowHeightChange,
		row.stage.id,
		row.stage.title,
		rowHeight,
	]);

	return (
		<>
			<div
				ref={(node) => {
					rowInfoRef.current = node;

					if (isGroupStage) {
						setGroupDropTargetRef(row.stage.id)(node);
						return;
					}

					setStageDropTargetRef(row.stage.id)(node);
				}}
				data-planning-stage-id={row.stage.id}
				data-gantt-group-stage-id={
					isGroupStage ? row.stage.id : undefined
				}
				className={`${planningStyles.stageRow} ${isPlanningSelected ? planningStyles.selected : ""} ${styles.ganttRowInfo} ${isPaymentsStage ? styles.ganttPaymentRowInfo : ""} ${isGroupStage ? styles.ganttParentRowInfo : ""} ${row.stage.parentStageId ? styles.ganttChildRowInfo : ""} ${canReorderStage ? styles.ganttRowInfoReorderable : ""} ${isDraggingStage ? styles.ganttRowInfoDragging : ""} ${isDragTarget ? styles.ganttParentRowInfoDropTarget : ""} ${dropPlacement === "before" ? styles.ganttStageDropBefore : ""} ${dropPlacement === "after" ? styles.ganttStageDropAfter : ""} ${isMenuOpen || isStatusMenuOpen ? styles.ganttRowInfoWithOpenMenu : ""}`}
				style={{ height: rowHeight, minHeight: rowHeight }}
				onPointerDown={
					canReorderStage
						? (event) => onStageReorderDragStart(event, row.stage)
						: undefined
				}
			>
				{isGroupStage ? (
					<span className={styles.ganttGroupType}>
						{row.stage.stageType && row.stage.stageType !== "payments"
							? getStageTypeLabel(row.stage.stageType)
							: "Этап проекта"}
					</span>
				) : null}
				<div className={styles.ganttCustomEventHeader}>
					{isGroupStage ? (
						<button
							type="button"
							className={styles.ganttGroupToggle}
							onClick={() => onGroupToggle(row.stage.id)}
							aria-expanded={isGroupExpanded}
							title={isGroupExpanded ? "Свернуть этапы" : "Раскрыть этапы"}
						>
							{isGroupExpanded ? "⌄" : "›"}
						</button>
					) : null}
					{!isGroupStage && row.stage.parentStageId ? (
						<span className={styles.ganttChildRowMarker} />
					) : null}
					<strong
						ref={stageTitleRef}
						className={styles.ganttStageTitle}
						title={row.stage.title}
					>
						{row.stage.title}
					</strong>
					{!isPaymentsStage ? (
						<div className={styles.ganttGroupMeta}>
							{isGroupStage ? <span className={styles.ganttGroupCount}>{childStageCount}</span> : null}
							<div className={styles.ganttGroupStatusWrapper}>
								<button
									type="button"
									className={`${styles.ganttGroupStatus} ${getGroupStatusClassName(row.stage.groupStatus)}`}
									aria-label={`Статус этапа: ${row.stage.title}`}
									onPointerDown={(event) => event.stopPropagation()}
									onClick={() => setIsStatusMenuOpen((isOpen) => !isOpen)}
								>
									{getGroupStatusLabel(row.stage.groupStatus)}
								</button>
								{isStatusMenuOpen ? (
									<div className={styles.ganttGroupStatusMenu}>
										{GROUP_STATUS_OPTIONS.map((option) => (
											<button
												type="button"
												key={option.value}
												className={`${styles.ganttGroupStatusMenuItem} ${getGroupStatusClassName(option.value)}`}
												onClick={() => {
													onGroupStatusChange(row.stage, option.value);
													setIsStatusMenuOpen(false);
												}}
											>
												{option.label}
											</button>
										))}
									</div>
								) : null}
							</div>
						</div>
					) : null}
					{!row.stage.isDefault && !isPaymentsStage ? (
						<div className={styles.ganttStageActions}>
							<button
								type="button"
								className={styles.ganttCustomEventMenuButton}
								onClick={() => setIsMenuOpen((isOpen) => !isOpen)}
								aria-expanded={isMenuOpen}
							>
								...
							</button>
							{isMenuOpen ? (
								<div className={styles.ganttCustomEventMenu}>
									{isGroupStage ? (
										<button
											type="button"
											onClick={() => {
												onGroupAddChild(row.stage.id);
												setIsMenuOpen(false);
											}}
										>
											Добавить подэтап
										</button>
					) : null}
									<button
										type="button"
										onClick={() => {
											onStageEdit(row.stage);
											setIsMenuOpen(false);
										}}
									>
										Редактировать
									</button>
								</div>
							) : null}
						</div>
					) : null}
				</div>
        {!isPaymentsStage && <div className={planningStyles.rowMeta}>
          <strong>План: {formatGanttHours(planning.plannedHours)}{planning.derivedFromChildren ? " (по подэтапам)" : ""}</strong>
          <small>Готовность: {planning.progress.toLocaleString("ru-RU", { maximumFractionDigits: 1 })}% · {GANTT_CATEGORY_LABELS[planning.category]}</small>
          {planning.unallocatedToChildren > 0 && <small>Не распределено по подэтапам: {formatGanttHours(planning.unallocatedToChildren)}</small>}
          {planning.overallocatedToChildren > 0 && <small className={planningStyles.warning}>Превышение оценок: {formatGanttHours(planning.overallocatedToChildren)}</small>}
          {planning.missingEstimates > 0 && <small className={planningStyles.warning}>Без оценки: {planning.missingEstimates}</small>}
        </div>}
				{showAddChildButton ? (
					<div className={styles.ganttGroupAddChildCell}>
						<button
							type="button"
							className={styles.ganttGroupAddChildButton}
							title="Добавить подэтап"
							onClick={() => onGroupAddChild(row.stage.id)}
						>
							+
						</button>
					</div>
				) : null}
				{isPaymentsStage ? (
					<span>
						{row.payments.length
							? `${row.payments.length} платежей`
							: "Платежи проекта"}
					</span>
				) : null}
				{!isPaymentsStage ? (
					<div
						className={styles.ganttRowResizeHandle}
						onPointerDown={handleRowResizeStart}
						role="separator"
						aria-orientation="horizontal"
						aria-label="Изменить высоту этапа"
					/>
				) : null}
			</div>
			<div
				className={`${styles.autonomousGanttTrack} ${isGroupStage && isDragTarget ? styles.ganttParentTrackDropTarget : ""}`}
				data-planning-stage-id={row.stage.id}
				data-gantt-group-stage-id={
					isGroupStage ? row.stage.id : undefined
				}
				data-autonomous-gantt-track="true"
				style={{ height: rowHeight, minHeight: rowHeight }}
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
				{dragDateGuidePercent !== null ? (
					<span
						className={styles.ganttDragDateGuideLine}
						style={{ left: `${dragDateGuidePercent}%` }}
					/>
				) : null}
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
						onEdit={onPaymentEdit}
						isDueByCompletedStage={isAutonomousPaymentDueByCompletedStage(
							payment,
							eventByStageId,
						)}
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
	targetRef,
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
  const isSummary = Boolean(event.isCollapsedGroupSummary);
  const start = event.planStart ?? (event.isDependencyDuration ? event.displayStart : null);
  const end = event.planEnd ?? (event.isDependencyDuration ? event.displayEnd : null) ?? start;
  const isDuration = event.event.eventKind === "duration" || event.isDependencyDuration;
  if (!start || !end) return <span className={styles.ganttNoDate}>Плановые даты не заданы</span>;
  const tooltip = `${event.event.title}\nПлан: ${formatDateShort(start)}${isDuration ? ` — ${formatDateShort(end)}` : ""}`;
  const position = isDuration ? getSegmentStyle(start, end, timeline) : { ...getMilestoneStyle(start, timeline), width: "18px" };
  return <button type="button" data-gantt-plan-event={event.event.id}
    className={`${styles.ganttCustomEventSegmentShell} ${isSummary ? styles.ganttGroupSummaryEvent : ""}`}
    style={{ ...position, top: "50%", transform: isDuration ? "translateY(-50%)" : "translate(-50%, -50%)", height: 36 }}
    ref={isSummary ? undefined : targetRef} title={tooltip} aria-label={tooltip}
    onClick={(click) => { click.stopPropagation(); if (!isSummary && !shouldSkipGanttClick(click.currentTarget)) onEdit(); }}
    onPointerDown={isSummary ? undefined : (pointer) => onMoveDragStart(pointer, event.event)}>
    {isDuration ? <span className={`${styles.ganttCustomEventSegment} ${styles.ganttAutonomousEventPlan} ${styles.ganttCustomEventSegmentStart} ${styles.ganttCustomEventSegmentEnd}`}
      style={{ left: 0, width: "100%", top: 10, height: 16 }} />
      : <span style={{ position: "absolute", left: 3, top: 12, width: 12, height: 12, transform: "rotate(45deg)", background: "var(--color-primary, #58d2eb)", borderRadius: 2 }} />}
    {!isSummary && isDuration && (["planStartDate", "planEndDate"] as const).map((field) => <span key={field}
      className={`${styles.ganttDateDragHandle} ${styles.ganttDateDragHandlePlan}`}
      style={{ left: field === "planStartDate" ? "0%" : "100%" }} title={tooltip}
      onClick={(click) => click.stopPropagation()}
      onPointerDown={(pointer) => { pointer.stopPropagation(); onDateDragStart(pointer, event.event, field); }} />)}
    {!isSummary && (["left", "right"] as const).map((side) => <span key={side}
      className={`${styles.ganttDependencyHandle} ${side === "left" ? styles.ganttDependencyHandleLeft : styles.ganttDependencyHandleRight}`}
      onPointerDown={(pointer) => { pointer.stopPropagation(); onDependencyLinkDragStart(pointer, event.event.stageId, side); }} />)}
  </button>;
};

const AutonomousPaymentItem = ({
	isDueByCompletedStage,
	markerRef,
	onEdit,
	payment,
	stageTitle,
	timeline,
	top,
}: {
	isDueByCompletedStage: boolean;
	markerRef: (node: HTMLButtonElement | null) => void;
	onEdit: (payment: AutonomousProjectPayment) => void;
	payment: AutonomousProjectPayment;
	stageTitle: string;
	timeline: ReturnType<typeof buildAutonomousProjectGantt>["timeline"];
	top: number;
}) => {
	const paymentDate = parseGanttDate(payment.paymentDate);
	if (!paymentDate && payment.paymentAnchor) {
		return null;
	}

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
					: isDueByCompletedStage
						? styles.autonomousPaymentDue
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
			aria-label={formatAutonomousPaymentTooltip(payment, stageTitle)}
		>
			<b>
				<FaMoneyBillWave aria-hidden="true" />
			</b>
			<span className={styles.ganttPaymentTooltip}>
				<i aria-hidden="true" />
				<span>
					<small>{stageTitle}</small>
					<span className={styles.ganttPaymentTooltipMeta}>
						<small>
							{paymentDate ? formatDateShort(paymentDate) : "Дата не указана"}
						</small>
						<strong>{formatMoney(payment.amount ?? 0)}</strong>
					</span>
				</span>
			</span>
		</button>
	);
};

const StageModal = ({
	deletingStageId,
	events,
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
	events: ProjectGanttEvent[];
	form: StageFormState;
	isOpen: boolean;
	onClose: () => void;
	onDelete: () => void;
	onFormChange: (value: StageFormState) => void;
	onSubmit: () => void;
	stage: ProjectGanttStage | null | undefined;
	stages: ProjectGanttStage[];
}) => {
	const isGroupStage = form.isGroup;
	const isDurationStage = DURATION_STAGE_TYPES.has(form.stageType);
	const isDependencyStage = Boolean(form.dependsOnStageId);
	const availableDependencyStages = stages.filter((item) => item.id !== form.id);
	const getDependencyPlanStartDate = (
		dependsOnStageId: number | null,
		dependencyAnchor: ProjectGanttDependencyAnchor,
	) => {
		const dependencyEvent = events.find(
			(event) => event.stageId === dependsOnStageId,
		);
		const dependencyStart = getPlanAnchorDateFromEvent(
			dependencyEvent,
			dependencyAnchor,
		);

		return dependencyStart ? formatInputDate(dependencyStart) : "";
	};
	const withDependencyPlanStartFallback = (
		nextForm: StageFormState,
	): StageFormState => {
		if (!nextForm.dependsOnStageId || nextForm.planStartDate) {
			return nextForm;
		}

		const planStartDate = getDependencyPlanStartDate(
			nextForm.dependsOnStageId,
			nextForm.dependencyAnchor,
		);

		return planStartDate
			? {
					...nextForm,
					planStartDate,
				}
			: nextForm;
	};
	const handleDependencyStageChange = (dependsOnStageId: number | null) => {
		const nextForm = withDependencyPlanStartFallback({
			...form,
			dependsOnStageId,
			dependencyAnchor: dependsOnStageId ? form.dependencyAnchor : "stage_end",
		});

		onFormChange(withPlanEndFromStageDuration(nextForm));
	};
	const handleDependencyAnchorChange = (
		dependencyAnchor: ProjectGanttDependencyAnchor,
	) => {
		const nextForm = withDependencyPlanStartFallback({
			...form,
			dependencyAnchor,
		});

		onFormChange(withPlanEndFromStageDuration(nextForm));
	};
	const handleDurationDaysChange = (durationDays: string) => {
		const nextForm = withDependencyPlanStartFallback({
			...form,
			durationDays,
		});

		onFormChange(withPlanEndFromStageDuration(nextForm));
	};
	const handlePlanStartDateChange = (planStartDate: string) => {
		const nextForm = {
			...form,
			planStartDate,
		};

		if (nextForm.planEndDate) {
			onFormChange(withDerivedStageDuration(nextForm));
			return;
		}

		onFormChange(withPlanEndFromStageDuration(nextForm));
	};
	const handlePlanEndDateChange = (planEndDate: string) => {
		onFormChange(
			withDerivedStageDuration({
				...form,
				planEndDate,
			}),
		);
	};

	return (
		<Modal isOpen={isOpen} onClose={onClose} position="right" size="small">
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
        <label><span>Плановый объём, ч</span>
          <input inputMode="decimal" value={form.plannedHours} placeholder="Часы не заданы"
            onChange={(event) => onFormChange({ ...form, plannedHours: event.target.value })} />
        </label>
        <p className={planningStyles.planningFieldHint}>{form.parentStageId
          ? "Часы подэтапа входят в бюджет родительского этапа. Категория сводки наследуется от родителя."
          : `Категория сводки: ${GANTT_CATEGORY_LABELS[stageCategory({ stageType: form.stageType })]}. Пустое поле — без оценки; 0 — явная нулевая трудоёмкость.`}</p>
        <label><span>Статус этапа</span>
          <select value={form.groupStatus} onChange={(event) => onFormChange({ ...form, groupStatus: event.target.value as ProjectGanttGroupStatus })}>
            {GROUP_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
				{!isGroupStage ? <label>
					<span>Этап привязки</span>
					<select
						value={form.dependsOnStageId ?? ""}
						onChange={(event) =>
							handleDependencyStageChange(
								event.target.value ? Number(event.target.value) : null,
							)
						}
					>
						<option value="">Без привязки</option>
						{availableDependencyStages.map((item) => (
							<option key={item.id} value={item.id}>
								{item.title}
							</option>
						))}
					</select>
				</label> : null}
				{!isGroupStage && isDependencyStage ? (
					<>
						<label>
							<span>Точка привязки</span>
							<select
								value={form.dependencyAnchor}
								onChange={(event) =>
									handleDependencyAnchorChange(
										event.target.value as ProjectGanttDependencyAnchor,
									)
								}
							>
								<option value="stage_start">К началу этапа</option>
								<option value="stage_end">К концу этапа</option>
							</select>
						</label>
						{isDurationStage ? (
							<label>
								<span>Длительность, дней</span>
								<input
									value={form.durationDays}
									onChange={(event) =>
										handleDurationDaysChange(event.target.value)
									}
								/>
							</label>
						) : null}
					</>
				) : null}
				{!isGroupStage ? <div className={styles.ganttFormGrid}>
					<label>
						<span>
							{isDurationStage ? "Плановая дата начала" : "Плановая дата"}
						</span>
						<input
							type="date"
							value={form.planStartDate}
							onChange={(event) =>
								handlePlanStartDateChange(event.target.value)
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
									handlePlanEndDateChange(event.target.value)
								}
							/>
						</label>
					) : null}


				</div> : null}
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
