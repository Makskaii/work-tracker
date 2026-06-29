import {
	type Ref,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { FaExclamationTriangle } from "react-icons/fa";
import Modal from "@/components/modal/Modal";
import { ProjectCodes } from "@/components/calendar/constants/const";
import { EntityTypeIds } from "@/shared/constants/const";
import { useBitrixSlider } from "@/shared/hooks/useBitrixSlider";
import {
	createGanttCustomEvent,
	createGanttIncident,
	deleteGanttCustomEvent,
	fetchGanttCustomEvents,
	fetchGanttIncidents,
	fetchProjectIncidents,
	type ProjectIncident,
	updateGanttCustomEvent,
} from "../model/api";
import type {
	GanttCustomEventRow,
	GanttMilestone,
	GanttMonthTick,
	GanttStage,
	GanttTimeline,
	GanttWeekTick,
} from "../model/ganttTypes";
import {
	buildProjectGantt,
	daysBetween,
	formatDateFull,
	formatDateShort,
	formatDeviation,
	getDateMax,
	getDateMin,
	getGanttTimeline,
	getMilestoneStyle,
	getMonthTicks,
	getSegmentStyle,
	getStageDeviation,
	getStageStatus,
	getWeekTicks,
	parseGanttDate,
} from "../model/ganttUtils";
import {
	buildPaymentMarkers,
	getPaymentRowHeight,
} from "../model/ganttPaymentMarkers";
import type {
	CustomGanttEvent,
	CustomGanttEventKind,
	GanttIncident,
	ProfitabilityProject,
} from "../model/types";
import styles from "../SalesProfitabilityReport.module.scss";
import { GanttPaymentMarker } from "./GanttPaymentMarker";
import { ProjectIncidentModal } from "./ProjectIncidentModal";

type GanttPaymentLink = {
	endY: number;
	factPaymentEndX?: number;
	factPaymentDate?: string;
	incidentDescription?: string | null;
	overdueEndX?: number;
	overdueEndY?: number;
	overdueTargetY?: number;
	paymentId: string;
	startX: number;
	id: string;
	startY: number;
	targetX: number;
};

type GanttPaymentLinksLayout = {
	height: number;
	links: GanttPaymentLink[];
	width: number;
};

const PAYMENT_OVERDUE_LINK_Y_OFFSET = 132;

type CustomEventFormState = {
	title: string;
	eventKind: CustomGanttEventKind;
	planStartDate: string;
	planEndDate: string;
	factStartDate: string;
	factEndDate: string;
};

const DEFAULT_CUSTOM_EVENT_FORM: CustomEventFormState = {
	title: "",
	eventKind: "one_time",
	planStartDate: "",
	planEndDate: "",
	factStartDate: "",
	factEndDate: "",
};

const getScaleWeekStep = (weekTicksCount: number) => {
	if (weekTicksCount > 36) return 4;
	if (weekTicksCount > 24) return 3;
	if (weekTicksCount > 14) return 2;

	return 1;
};

export const ProjectGantt = ({
	project,
	dealAmount = 0,
}: {
	project: ProfitabilityProject | null;
	dealAmount?: number;
}) => {
	const [incidents, setIncidents] = useState<ProjectIncident[]>([]);
	const [ganttCustomEvents, setGanttCustomEvents] = useState<CustomGanttEvent[]>(
		[],
	);
	const [ganttIncidents, setGanttIncidents] = useState<GanttIncident[]>([]);
	const [isCustomEventModalOpen, setIsCustomEventModalOpen] = useState(false);
	const [customEventForm, setCustomEventForm] = useState<CustomEventFormState>(
		DEFAULT_CUSTOM_EVENT_FORM,
	);
	const [editingCustomEventId, setEditingCustomEventId] = useState<number | null>(
		null,
	);
	const [customEventError, setCustomEventError] = useState<string | null>(null);
	const [isCustomEventSaving, setIsCustomEventSaving] = useState(false);
	const [deletingCustomEventId, setDeletingCustomEventId] = useState<
		number | null
	>(null);
	const [isCustomEventDeleteConfirming, setIsCustomEventDeleteConfirming] =
		useState(false);
	const [paymentIncidentDraft, setPaymentIncidentDraft] = useState<{
		incidentDate: string;
		paymentId: string;
	} | null>(null);
	const [paymentIncidentDescription, setPaymentIncidentDescription] =
		useState("");
	const [isPaymentIncidentSaving, setIsPaymentIncidentSaving] = useState(false);
	const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
	const [isIncidentsLoading, setIsIncidentsLoading] = useState(false);
	const [paymentLinksLayout, setPaymentLinksLayout] =
		useState<GanttPaymentLinksLayout>({
			height: 0,
			links: [],
			width: 0,
		});
	const ganttBoardRef = useRef<HTMLDivElement>(null);
	const paymentMarkerRefs = useRef(new Map<string, HTMLSpanElement>());
	const ganttRowTrackRefs = useRef(new Map<string, HTMLDivElement>());
	const ganttAnchorRefs = useRef(new Map<string, HTMLElement>());
	const ganttOverdueRefs = useRef(new Map<string, HTMLElement>());
	const { openTask } = useBitrixSlider();
	const today = useMemo(() => {
		const currentDate = new Date();

		return new Date(
			currentDate.getFullYear(),
			currentDate.getMonth(),
			currentDate.getDate(),
		);
	}, []);
	const gantt = useMemo(
		() => buildProjectGantt(project, today, ganttCustomEvents),
		[ganttCustomEvents, project, today],
	);
	const timeline = useMemo(
		() => getGanttTimeline(gantt.rows, today),
		[gantt.rows, today],
	);
	const monthTicks = useMemo(() => getMonthTicks(timeline), [timeline]);
	const weekTicks = useMemo(() => getWeekTicks(timeline), [timeline]);
	const scaleWeekTicks = useMemo(() => {
		const step = getScaleWeekStep(weekTicks.length);

		return weekTicks.filter((_, index) => index % step === 0);
	}, [weekTicks]);
	const hasDates = gantt.rows.some((row) =>
		row.type === "milestone"
			? row.milestone.date
			: row.type === "customEvent"
				? row.customEvent.displayDate || row.customEvent.displayStart
				: row.stage.planStart || row.stage.planEnd || row.stage.factStart,
	);
	const paymentMarkers = useMemo(() => {
		if (!project) {
			return [];
		}

		return buildPaymentMarkers(project.payments, gantt.rows, timeline);
	}, [gantt.rows, project, timeline]);
	const paymentIncidentById = useMemo(() => {
		const items = new Map<string, GanttIncident>();

		ganttIncidents
			.filter((incident) => incident.entityType === "payment_waiting_overdue")
			.forEach((incident) => {
				items.set(incident.entityId, incident);
			});

		return items;
	}, [ganttIncidents]);
	const paymentRowHeight = getPaymentRowHeight(paymentMarkers);
	const setPaymentMarkerRef = useCallback(
		(paymentId: string) => (node: HTMLSpanElement | null) => {
			if (node) {
				paymentMarkerRefs.current.set(paymentId, node);
				return;
			}

			paymentMarkerRefs.current.delete(paymentId);
		},
		[],
	);
	const setGanttRowTrackRef = useCallback(
		(rowId: string) => (node: HTMLDivElement | null) => {
			if (node) {
				ganttRowTrackRefs.current.set(rowId, node);
				return;
			}

			ganttRowTrackRefs.current.delete(rowId);
		},
		[],
	);
	const setGanttAnchorRef = useCallback(
		(rowId: string) => (node: HTMLElement | null) => {
			if (node) {
				ganttAnchorRefs.current.set(rowId, node);
				return;
			}

			ganttAnchorRefs.current.delete(rowId);
		},
		[],
	);
	const setGanttOverdueRef = useCallback(
		(rowId: string) => (node: HTMLElement | null) => {
			if (node) {
				ganttOverdueRefs.current.set(rowId, node);
				return;
			}

			ganttOverdueRefs.current.delete(rowId);
		},
		[],
	);

	useEffect(() => {
		if (!project?.projectId) {
			setGanttCustomEvents([]);
			setGanttIncidents([]);
			return;
		}

		const controller = new AbortController();

		Promise.all([
			fetchGanttCustomEvents(project.projectId, controller.signal),
			fetchGanttIncidents(project.projectId, controller.signal),
		])
			.then(([customEvents, incidentItems]) => {
				setGanttCustomEvents(customEvents);
				setGanttIncidents(incidentItems);
			})
			.catch(() => {
				if (!controller.signal.aborted) {
					setGanttCustomEvents([]);
					setGanttIncidents([]);
				}
			});

		return () => controller.abort();
	}, [project?.projectId]);

	const refreshGanttBackendData = useCallback(async () => {
		if (!project?.projectId) {
			return;
		}

		const [customEvents, incidentItems] = await Promise.all([
			fetchGanttCustomEvents(project.projectId),
			fetchGanttIncidents(project.projectId),
		]);

		setGanttCustomEvents(customEvents);
		setGanttIncidents(incidentItems);
	}, [project?.projectId]);

	const handleCustomEventSubmit = async () => {
		if (!project?.projectId) {
			setCustomEventError("Проект не выбран");
			return;
		}

		if (!customEventForm.title.trim()) {
			setCustomEventError("Заполните название события");
			return;
		}

		if (
			customEventForm.eventKind === "one_time" &&
			!customEventForm.planStartDate &&
			!customEventForm.factStartDate
		) {
			setCustomEventError("Для разового события укажите плановую или фактическую дату");
			return;
		}

		if (
			customEventForm.eventKind === "duration" &&
			(!customEventForm.planStartDate || !customEventForm.planEndDate)
		) {
			setCustomEventError("Для события с продолжительностью укажите плановый период");
			return;
		}

		if (customEventForm.factEndDate && !customEventForm.factStartDate) {
			setCustomEventError("Фактическая дата завершения нельзя указать без Фактическая дата началаа");
			return;
		}

		setIsCustomEventSaving(true);
		setCustomEventError(null);

		try {
			const payload = {
				title: customEventForm.title.trim(),
				eventKind: customEventForm.eventKind,
				planStartDate: customEventForm.planStartDate || null,
				planEndDate:
					customEventForm.eventKind === "duration"
						? customEventForm.planEndDate || null
						: null,
				factStartDate: customEventForm.factStartDate || null,
				factEndDate:
					customEventForm.eventKind === "duration"
						? customEventForm.factEndDate || null
						: null,
			};

			if (editingCustomEventId !== null) {
				await updateGanttCustomEvent(editingCustomEventId, payload);
			} else {
				await createGanttCustomEvent(project.projectId, {
					...payload,
					sortOrder: ganttCustomEvents.length,
				});
			}

			setCustomEventForm(DEFAULT_CUSTOM_EVENT_FORM);
			setEditingCustomEventId(null);
			setIsCustomEventDeleteConfirming(false);
			setIsCustomEventModalOpen(false);
			await refreshGanttBackendData();
		} catch {
			setCustomEventError(
				editingCustomEventId !== null
					? "Не удалось обновить событие"
					: "Не удалось создать событие",
			);
		} finally {
			setIsCustomEventSaving(false);
		}
	};

	const openCustomEventCreateModal = () => {
		setEditingCustomEventId(null);
		setCustomEventForm(DEFAULT_CUSTOM_EVENT_FORM);
		setCustomEventError(null);
		setIsCustomEventDeleteConfirming(false);
		setIsCustomEventModalOpen(true);
	};

	const openCustomEventEditModal = (event: CustomGanttEvent) => {
		setEditingCustomEventId(event.id);
		setCustomEventForm({
			title: event.title,
			eventKind: event.eventKind,
			planStartDate: event.planStartDate ?? "",
			planEndDate: event.planEndDate ?? "",
			factStartDate: event.factStartDate ?? "",
			factEndDate: event.factEndDate ?? "",
		});
		setCustomEventError(null);
		setIsCustomEventDeleteConfirming(false);
		setIsCustomEventModalOpen(true);
	};

	const deleteCustomEventById = async (
		eventId: number,
		shouldCloseModal = false,
	) => {
		setDeletingCustomEventId(eventId);

		try {
			await deleteGanttCustomEvent(eventId);

			if (shouldCloseModal) {
				setCustomEventForm(DEFAULT_CUSTOM_EVENT_FORM);
				setEditingCustomEventId(null);
				setIsCustomEventDeleteConfirming(false);
				setIsCustomEventModalOpen(false);
			}

			await refreshGanttBackendData();
		} finally {
			setDeletingCustomEventId(null);
		}
	};

	const handleCustomEventDelete = async () => {
		if (editingCustomEventId === null) {
			return;
		}

		if (!isCustomEventDeleteConfirming) {
			setIsCustomEventDeleteConfirming(true);
			return;
		}

		await deleteCustomEventById(editingCustomEventId, true);
	};

	const handlePaymentIncidentSubmit = async () => {
		if (!project?.projectId || !paymentIncidentDraft) {
			return;
		}

		setIsPaymentIncidentSaving(true);

		try {
			await createGanttIncident(project.projectId, {
				entityType: "payment_waiting_overdue",
				entityId: paymentIncidentDraft.paymentId,
				description: paymentIncidentDescription || null,
				incidentDate: paymentIncidentDraft.incidentDate,
			});
			setPaymentIncidentDraft(null);
			setPaymentIncidentDescription("");
			await refreshGanttBackendData();
		} finally {
			setIsPaymentIncidentSaving(false);
		}
	};

	useLayoutEffect(() => {
		const board = ganttBoardRef.current;

		if (!board) {
			return;
		}

		let animationFrameId: number | null = null;
		const updatePaymentLinks = () => {
			const boardRect = board.getBoundingClientRect();
			const links = paymentMarkers.reduce<GanttPaymentLink[]>((items, marker) => {
				if (!marker.stageTarget) {
					return items;
				}

				const stageTarget = marker.stageTarget;
				const paymentNode = paymentMarkerRefs.current.get(
					String(marker.payment.id),
				);
				const rowNode = ganttRowTrackRefs.current.get(stageTarget.rowId);

				if (!paymentNode || !rowNode) {
					return items;
				}

				const paymentRect = paymentNode.getBoundingClientRect();
				const rowRect = rowNode.getBoundingClientRect();
				const anchorNode = ganttAnchorRefs.current.get(stageTarget.rowId);
				const overdueNode = ganttOverdueRefs.current.get(stageTarget.rowId);
				const anchorRect = anchorNode?.getBoundingClientRect();
				const overdueRect = overdueNode?.getBoundingClientRect();
				const startX =
					paymentRect.left +
					paymentRect.width / 2 -
					boardRect.left +
					board.scrollLeft;
				const startY = paymentRect.bottom - boardRect.top + board.scrollTop;
				const endY = anchorRect
					? anchorRect.top +
						anchorRect.height / 2 -
						boardRect.top +
						board.scrollTop
					: rowRect.top + rowRect.height / 2 - boardRect.top + board.scrollTop;
				const getTargetX = () => {
					if (anchorRect) {
						return stageTarget.rowType === "milestone"
							? anchorRect.left +
									anchorRect.width / 2 -
									boardRect.left +
									board.scrollLeft
							: anchorRect.right - boardRect.left + board.scrollLeft;
					}

					const markerStyle = getMilestoneStyle(stageTarget.date, timeline);
					const left = Number.parseFloat(String(markerStyle.left ?? 0));
					const safeLeft = Number.isFinite(left)
						? Math.min(Math.max(left, 0), 100)
						: 0;

					return (
						rowRect.left -
						boardRect.left +
						board.scrollLeft +
						(rowRect.width * safeLeft) / 100
					);
				};
				const targetX = getTargetX();
				const factPaymentDate = parseGanttDate(
					marker.payment[ProjectCodes.paymentDate],
				);
				const factPaymentStyle =
					factPaymentDate && factPaymentDate > marker.date
						? getMilestoneStyle(factPaymentDate, timeline)
						: null;
				const factPaymentLeft = factPaymentStyle
					? Number.parseFloat(String(factPaymentStyle.left ?? 0))
					: null;
				const factPaymentEndX =
					factPaymentLeft !== null && Number.isFinite(factPaymentLeft)
						? rowRect.left -
							boardRect.left +
							board.scrollLeft +
							(rowRect.width * Math.min(Math.max(factPaymentLeft, 0), 100)) /
								100
						: undefined;
				const overdueEndX = overdueRect
					? overdueRect.right - boardRect.left + board.scrollLeft
					: undefined;
				const overdueTargetY = overdueRect
					? overdueRect.top +
						overdueRect.height / 2 -
						boardRect.top +
						board.scrollTop
					: undefined;

				if (endY <= startY) {
					return items;
				}

				items.push({
					endY,
					factPaymentEndX,
					factPaymentDate: factPaymentDate?.toISOString().slice(0, 10),
					id: String(marker.payment.id),
					incidentDescription:
						paymentIncidentById.get(String(marker.payment.id))?.description ??
						null,
					overdueEndX,
					overdueTargetY,
					overdueEndY:
						overdueEndX === undefined
							? undefined
							: Math.max(startY, endY - PAYMENT_OVERDUE_LINK_Y_OFFSET),
					startX,
					startY,
					targetX,
					paymentId: String(marker.payment.id),
				});

				return items;
			}, []);

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
	}, [paymentIncidentById, paymentMarkers, timeline]);
	const handleOverdueClick = async () => {
		if (!project) {
			setIncidents([]);
			setIsIncidentModalOpen(true);
			return;
		}

		setIsIncidentModalOpen(true);
		setIsIncidentsLoading(true);

		try {
			const items = await fetchProjectIncidents({ project });
			setIncidents(items);
		} catch {
			setIncidents([]);
		} finally {
			setIsIncidentsLoading(false);
		}
	};

	return (
		<>
			<div className={styles.ganttCard}>
				<div className={styles.ganttMetrics}>
					<GanttMetric title="Проект" value={gantt.summary.projectTitle} accent />
					<GanttMetric
						title="Плановое завершение"
						value={formatDateShort(gantt.summary.finalPlanEnd)}
					/>
					<GanttMetric
						title="Факт / текущее завершение"
						value={formatDateShort(gantt.summary.currentFinish)}
					/>
					<GanttMetric
						title="Отклонение проекта"
						value={formatDeviation(gantt.summary.projectDeviation)}
						danger={(gantt.summary.projectDeviation ?? 0) > 0}
					/>
					<GanttMetric
						title="Просроченных этапов"
						value={String(gantt.summary.overdueStages)}
						danger={gantt.summary.overdueStages > 0}
					/>
					<GanttMetric
						title="Этапов раньше плана"
						value={String(gantt.summary.earlyStages)}
						success={gantt.summary.earlyStages > 0}
					/>
					<GanttMetric
						title="Суммарная просрочка"
						value={`${gantt.summary.totalOverdueDays} дн.`}
						danger={gantt.summary.totalOverdueDays > 0}
					/>
					<GanttMetric
						title="Дата подписания ТЗ"
						value={formatDateShort(gantt.summary.tzSignDate)}
						warning
					/>
				</div>

				<GanttLegend />

				<div ref={ganttBoardRef} className={styles.ganttBoard}>
					<GanttPaymentLinks
						layout={paymentLinksLayout}
						onPaymentOverdueClick={(paymentId, incidentDate) => {
							setPaymentIncidentDraft({ incidentDate, paymentId });
							setPaymentIncidentDescription("");
						}}
					/>
					<div className={styles.ganttScaleLabel}>Этапы проекта</div>
					<GanttScale monthTicks={monthTicks} weekTicks={scaleWeekTicks} />
					<div
						className={styles.ganttRowInfo}
						style={{ minHeight: paymentRowHeight }}
					>
						<strong>Оплаты</strong>
						<span>Смарт-процесс оплат по проекту</span>
					</div>
					<div
						className={styles.ganttTrack}
						style={{ minHeight: paymentRowHeight }}
					>
						<GanttTrackGrid monthTicks={monthTicks} weekTicks={weekTicks} />
						{paymentMarkers.map(({ date, level, payment, stageTarget }) => (
							<GanttPaymentMarker
								key={String(payment.id)}
								ref={setPaymentMarkerRef(String(payment.id))}
								date={date}
								dealAmount={dealAmount}
								level={level}
								payment={payment}
								stageTarget={stageTarget ?? undefined}
								timeline={timeline}
							/>
						))}
					</div>

					{hasDates ? (
						gantt.rows.map((row) =>
							row.type === "milestone" ? (
								<GanttMilestoneRow
									anchorRef={setGanttAnchorRef(row.milestone.id)}
									key={row.milestone.id}
									milestone={row.milestone}
									monthTicks={monthTicks}
									rowRef={setGanttRowTrackRef(row.milestone.id)}
									timeline={timeline}
									weekTicks={weekTicks}
								/>
							) : row.type === "customEvent" ? (
								<GanttCustomEventRowView
									key={`custom-${row.customEvent.event.id}`}
									customEvent={row.customEvent}
									isDeleting={
										deletingCustomEventId === row.customEvent.event.id
									}
									monthTicks={monthTicks}
									onDelete={() =>
										deleteCustomEventById(row.customEvent.event.id)
									}
									onEdit={() =>
										openCustomEventEditModal(row.customEvent.event)
									}
									today={today}
									timeline={timeline}
									weekTicks={weekTicks}
								/>
							) : (
								<GanttStageRow
									anchorRef={setGanttAnchorRef(row.stage.id)}
									key={row.stage.id}
									monthTicks={monthTicks}
									onOverdueClick={handleOverdueClick}
									overdueRef={setGanttOverdueRef(row.stage.id)}
									rowRef={setGanttRowTrackRef(row.stage.id)}
									stage={row.stage}
									timeline={timeline}
									today={today}
									weekTicks={weekTicks}
								/>
							),
						)
					) : (
						<div className={styles.ganttEmpty}>
							Заполните даты и длительности этапов в проекте, чтобы построить
							Гант.
						</div>
					)}
					<div className={`${styles.ganttRowInfo} ${styles.ganttAddEventCell}`}>
						<button
							type="button"
							className={styles.ganttAddEventButton}
							onClick={openCustomEventCreateModal}
						>
							+
						</button>
					</div>
					<div className={styles.ganttTrack}>
						<GanttTrackGrid monthTicks={monthTicks} weekTicks={weekTicks} />
					</div>
				</div>

				<GanttStageTable stages={gantt.stages} today={today} />
			</div>
			<ProjectIncidentModal
				incidents={incidents}
				isLoading={isIncidentsLoading}
				isOpen={isIncidentModalOpen}
				onClose={() => setIsIncidentModalOpen(false)}
				onIncidentOpen={(incidentId) =>
					openTask(incidentId, EntityTypeIds.projectIncidents)
				}
			/>
			<Modal
				isOpen={isCustomEventModalOpen}
				onClose={() => {
					setCustomEventError(null);
					setEditingCustomEventId(null);
					setCustomEventForm(DEFAULT_CUSTOM_EVENT_FORM);
					setIsCustomEventDeleteConfirming(false);
					setIsCustomEventModalOpen(false);
				}}
				size="small"
			>
				<div className={styles.ganttFormModal}>
					<h3>
						{editingCustomEventId !== null
							? "Редактирование события Ганта"
							: "Новое событие Ганта"}
					</h3>
					<label>
						<span>Название</span>
						<input
							value={customEventForm.title}
							onChange={(event) =>
								setCustomEventForm((prev) => ({
									...prev,
									title: event.target.value,
								}))
							}
						/>
					</label>
					<label>
						<span>Тип события</span>
						<select
							value={customEventForm.eventKind}
							onChange={(event) =>
								setCustomEventForm((prev) => ({
									...prev,
									eventKind: event.target.value as CustomGanttEventKind,
								}))
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
								value={customEventForm.planStartDate}
								onChange={(event) =>
									setCustomEventForm((prev) => ({
										...prev,
										planStartDate: event.target.value,
									}))
								}
							/>
						</label>
						{customEventForm.eventKind === "duration" ? (
							<label>
								<span>Плановая дата завершения</span>
								<input
									type="date"
									value={customEventForm.planEndDate}
									onChange={(event) =>
										setCustomEventForm((prev) => ({
											...prev,
											planEndDate: event.target.value,
										}))
									}
								/>
							</label>
						) : null}
						<label>
							<span>Фактическая дата начала</span>
							<input
								type="date"
								value={customEventForm.factStartDate}
								onChange={(event) =>
									setCustomEventForm((prev) => ({
										...prev,
										factStartDate: event.target.value,
									}))
								}
							/>
						</label>
						{customEventForm.eventKind === "duration" ? (
							<label>
								<span>Фактическая дата завершения</span>
								<input
									type="date"
									value={customEventForm.factEndDate}
									onChange={(event) =>
										setCustomEventForm((prev) => ({
											...prev,
											factEndDate: event.target.value,
										}))
									}
								/>
							</label>
						) : null}
					</div>
					{customEventError ? (
						<p className={styles.ganttFormError}>{customEventError}</p>
					) : null}
					<div className={styles.ganttFormActions}>
						{editingCustomEventId !== null ? (
							<button
								type="button"
								className={styles.ganttFormDeleteButton}
								disabled={deletingCustomEventId === editingCustomEventId}
								onClick={handleCustomEventDelete}
							>
								{isCustomEventDeleteConfirming
									? "Подтвердить удаление"
									: "Удалить"}
							</button>
						) : null}
						<button
							type="button"
							disabled={isCustomEventSaving}
							onClick={handleCustomEventSubmit}
						>
							Сохранить
						</button>
					</div>
				</div>
			</Modal>
			<Modal
				isOpen={Boolean(paymentIncidentDraft)}
				onClose={() => setPaymentIncidentDraft(null)}
				size="small"
			>
				<div className={styles.ganttFormModal}>
					<h3>Инцидент по просрочке оплаты</h3>
					<label>
						<span>Описание</span>
						<textarea
							value={paymentIncidentDescription}
							onChange={(event) =>
								setPaymentIncidentDescription(event.target.value)
							}
						/>
					</label>
					<button
						type="button"
						disabled={isPaymentIncidentSaving}
						onClick={handlePaymentIncidentSubmit}
					>
						Сохранить
					</button>
				</div>
			</Modal>
		</>
	);
};

const GanttMetric = ({
	title,
	value,
	accent,
	danger,
	success,
	warning,
}: {
	title: string;
	value: string;
	accent?: boolean;
	danger?: boolean;
	success?: boolean;
	warning?: boolean;
}) => (
	<div
		className={`${styles.ganttMetric} ${accent ? styles.ganttMetricAccent : ""} ${
			danger ? styles.ganttMetricDanger : ""
		} ${success ? styles.ganttMetricSuccess : ""} ${
			warning ? styles.ganttMetricWarning : ""
		}`}
	>
		<span>{title}</span>
		<strong>{value}</strong>
	</div>
);

const GanttLegend = () => (
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

const GanttPaymentLinks = ({
	layout,
	onPaymentOverdueClick,
}: {
	layout: GanttPaymentLinksLayout;
	onPaymentOverdueClick: (paymentId: string, incidentDate: string) => void;
}) =>
	layout.links.length > 0 && layout.width > 0 && layout.height > 0 ? (
		<svg
			aria-hidden="true"
			className={styles.ganttPaymentLinksLayer}
			height={layout.height}
			viewBox={`0 0 ${layout.width} ${layout.height}`}
			width={layout.width}
		>
			{layout.links.map((link) => (
				<g key={link.id}>
					<path
						className={styles.ganttPaymentLinkLine}
						d={`M ${link.startX} ${link.startY} V ${link.endY} H ${link.targetX}`}
					/>
					{link.overdueEndX !== undefined &&
					link.overdueEndY !== undefined &&
					link.overdueTargetY !== undefined ? (
						<path
							className={styles.ganttPaymentOverdueLinkLine}
							d={`M ${link.startX} ${link.overdueEndY} H ${link.overdueEndX} V ${link.overdueTargetY}`}
						/>
					) : null}
					{link.factPaymentEndX !== undefined && link.factPaymentDate ? (
						<path
							className={styles.ganttPaymentFactOverdueLinkLine}
							d={`M ${link.startX} ${link.startY} H ${link.factPaymentEndX}`}
							onClick={() =>
								onPaymentOverdueClick(link.paymentId, link.factPaymentDate ?? "")
							}
						/>
					) : null}
					{link.factPaymentEndX !== undefined && link.incidentDescription ? (
						<text
							className={styles.ganttPaymentIncidentText}
							x={Math.max(link.startX, link.factPaymentEndX) + 8}
							y={link.startY - 6}
						>
							{link.incidentDescription}
						</text>
					) : null}
				</g>
			))}
		</svg>
	) : null;

const getStageTooltip = (stage: GanttStage, today: Date) => {
	const deviation = getStageDeviation(stage, today);

	return [
		stage.title,
		`План: ${formatDateFull(stage.planStart)} — ${formatDateFull(stage.planEnd)}`,
		`Факт: ${formatDateFull(stage.factStart)} — ${formatDateFull(stage.factEnd)}`,
		`Отклонение: ${formatDeviation(deviation)}`,
		`Статус: ${getStageStatus(stage, today)}`,
	].join("\n");
};

const getCustomEventPlanDate = (customEvent: GanttCustomEventRow) =>
	customEvent.event.eventKind === "duration"
		? customEvent.planEnd
		: customEvent.planStart;

const getCustomEventFactDate = (customEvent: GanttCustomEventRow) =>
	customEvent.event.eventKind === "duration"
		? customEvent.factEnd
		: customEvent.factStart;

const getCustomEventDeviation = (
	customEvent: GanttCustomEventRow,
	today: Date,
) => {
	const planDate = getCustomEventPlanDate(customEvent);
	const factDate = getCustomEventFactDate(customEvent);

	if (!planDate) return null;
	if (factDate) return daysBetween(planDate, factDate);
	if (today > planDate) return daysBetween(planDate, today);

	return null;
};

const getCustomEventStatus = (customEvent: GanttCustomEventRow, today: Date) => {
	const planDate = getCustomEventPlanDate(customEvent);
	const factDate = getCustomEventFactDate(customEvent);

	if (!planDate) return "Нет данных";

	if (!factDate) {
		return today > planDate ? "Просрочен, факт не закрыт" : "Ожидает завершения";
	}

	const deviation = daysBetween(planDate, factDate);

	if (deviation > 0) return "Просрочен";
	if (deviation < 0) return "Завершён раньше плана";

	return "В срок";
};

const GanttStageRow = ({
	anchorRef,
	monthTicks,
	onOverdueClick,
	overdueRef,
	rowRef,
	stage,
	timeline,
	today,
	weekTicks,
}: {
	anchorRef?: Ref<HTMLSpanElement>;
	monthTicks: GanttMonthTick[];
	onOverdueClick: () => void;
	overdueRef?: Ref<HTMLSpanElement>;
	rowRef?: Ref<HTMLDivElement>;
	stage: GanttStage;
	timeline: GanttTimeline;
	today: Date;
	weekTicks: GanttWeekTick[];
}) => {
	const factEnd =
		stage.factEnd ??
		(stage.factStart ? getDateMax(stage.factStart, today) : null);
	const status = getStageStatus(stage, today);
	const tooltip = getStageTooltip(stage, today);
	const planSegment =
		stage.planStart && stage.planEnd
			? {
					start: stage.planStart,
					end: stage.planEnd,
				}
			: null;
	const factStartInPlan =
		planSegment && stage.factStart
			? getDateMax(stage.factStart, planSegment.start)
			: null;
	const factEndInPlan =
		planSegment && factEnd ? getDateMin(factEnd, planSegment.end) : null;
	const factSegment =
		factStartInPlan && factEndInPlan && factEndInPlan > factStartInPlan
			? {
					start: factStartInPlan,
					end: factEndInPlan,
				}
			: null;
	const lateStart =
		planSegment &&
		stage.factStart &&
		stage.factStart > planSegment.start &&
		planSegment.end > planSegment.start
			? {
					start: planSegment.start,
					end: getDateMin(stage.factStart, planSegment.end) ?? planSegment.end,
				}
			: null;
	const earlyStart =
		stage.planStart && stage.factStart && stage.factStart < stage.planStart
			? {
					start: stage.factStart,
					end: stage.planStart,
				}
			: null;
	const overdue =
		stage.planEnd &&
		((stage.factEnd && stage.factEnd > stage.planEnd) ||
			(!stage.factEnd && today > stage.planEnd))
			? {
					start: stage.planEnd,
					end: stage.factEnd ?? today,
				}
			: null;
	const overdueDays = overdue ? daysBetween(overdue.start, overdue.end) : 0;
	const reserve =
		stage.planEnd && stage.factEnd && stage.factEnd < stage.planEnd
			? {
					start: stage.factEnd,
					end: stage.planEnd,
				}
			: null;

	return (
		<>
			<div className={styles.ganttRowInfo} title={tooltip}>
				<strong>{stage.title}</strong>
				<span>{stage.description}</span>
				<small>
					План: {formatDateFull(stage.planStart)} —{" "}
					{formatDateFull(stage.planEnd)}
				</small>
				<small>
					Факт: {formatDateFull(stage.factStart)} —{" "}
					{formatDateFull(stage.factEnd)}
				</small>
			</div>
			<div ref={rowRef} className={styles.ganttTrack} title={tooltip}>
				<GanttTrackGrid monthTicks={monthTicks} weekTicks={weekTicks} />
				{planSegment ? (
					<span
						className={`${styles.ganttSegment} ${styles.ganttPlan}`}
						ref={factSegment ? undefined : anchorRef}
						style={getSegmentStyle(
							planSegment.start,
							planSegment.end,
							timeline,
						)}
						title={tooltip}
					/>
				) : null}
				{earlyStart ? (
					<span
						className={`${styles.ganttSegment} ${styles.ganttEarly}`}
						style={getSegmentStyle(earlyStart.start, earlyStart.end, timeline)}
						title={tooltip}
					/>
				) : null}
				{lateStart ? (
					<span
						className={`${styles.ganttSegment} ${styles.ganttLate}`}
						style={getSegmentStyle(lateStart.start, lateStart.end, timeline)}
						title={tooltip}
					/>
				) : null}
				{reserve ? (
					<span
						className={`${styles.ganttSegment} ${styles.ganttReserve}`}
						style={getSegmentStyle(reserve.start, reserve.end, timeline)}
						title={tooltip}
					/>
				) : null}
				{overdue ? (
					<span
						className={`${styles.ganttSegment} ${styles.ganttOverdue}`}
						ref={overdueRef}
						style={getSegmentStyle(overdue.start, overdue.end, timeline)}
						title={tooltip}
					/>
				) : null}
				{overdue ? (
					<button
						type="button"
						className={styles.ganttOverdueBadge}
						style={getSegmentStyle(overdue.start, overdue.end, timeline)}
						onClick={onOverdueClick}
						title={`Просрочка: +${overdueDays} дн.`}
					>
						<FaExclamationTriangle
							aria-hidden="true"
							className={styles.ganttOverdueIcon}
						/>
						Просрочка +{overdueDays} дн.
					</button>
				) : null}
				{factSegment ? (
					<span
						className={`${styles.ganttSegment} ${styles.ganttFact}`}
						ref={anchorRef}
						style={getSegmentStyle(
							factSegment.start,
							factSegment.end,
							timeline,
						)}
						title={tooltip}
					>
						Факт
					</span>
				) : null}
				<span className={styles.ganttStatus}>{status}</span>
			</div>
		</>
	);
};

const GanttMilestoneRow = ({
	anchorRef,
	milestone,
	monthTicks,
	rowRef,
	timeline,
	weekTicks,
}: {
	anchorRef?: Ref<HTMLSpanElement>;
	milestone: GanttMilestone;
	monthTicks: GanttMonthTick[];
	rowRef?: Ref<HTMLDivElement>;
	timeline: GanttTimeline;
	weekTicks: GanttWeekTick[];
}) => (
	<>
		<div className={styles.ganttRowInfo}>
			<strong>{milestone.title}</strong>
			<span>{milestone.description}</span>
		</div>
		<div ref={rowRef} className={styles.ganttTrack}>
			<GanttTrackGrid monthTicks={monthTicks} weekTicks={weekTicks} />
			{milestone.date ? (
				<span
					className={`${styles.ganttMilestone} ${
						milestone.color === "warning"
							? styles.ganttMilestoneWarning
							: styles.ganttMilestoneAccent
					}`}
					ref={anchorRef}
					style={getMilestoneStyle(milestone.date, timeline)}
				>
					<b />
					<small>
						{milestone.title === "Подписание ТЗ"
							? "ТЗ подписано"
							: "Акт / закрытие"}
						<br />
						{formatDateShort(milestone.date)}
					</small>
				</span>
			) : (
				<span className={styles.ganttNoDate}>Дата не заполнена</span>
			)}
		</div>
	</>
);

const GanttCustomEventRowView = ({
	customEvent,
	isDeleting,
	monthTicks,
	onDelete,
	onEdit,
	today,
	timeline,
	weekTicks,
}: {
	customEvent: GanttCustomEventRow;
	isDeleting: boolean;
	monthTicks: GanttMonthTick[];
	onDelete: () => Promise<void>;
	onEdit: () => void;
	today: Date;
	timeline: GanttTimeline;
	weekTicks: GanttWeekTick[];
}) => {
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [isDeleteConfirming, setIsDeleteConfirming] = useState(false);
	const deviation = getCustomEventDeviation(customEvent, today);
	const status = getCustomEventStatus(customEvent, today);
	const tooltip = [
		customEvent.title,
		`План: ${formatDateFull(customEvent.planStart)} — ${formatDateFull(customEvent.planEnd)}`,
		`Факт: ${formatDateFull(customEvent.factStart)} — ${formatDateFull(customEvent.factEnd)}`,
		`Отклонение: ${formatDeviation(deviation)}`,
		`Статус: ${status}`,
	].join("\n");
	const period =
		customEvent.displayStart &&
		customEvent.displayEnd &&
		customEvent.displayEnd > customEvent.displayStart
			? {
					start: customEvent.displayStart,
					end: customEvent.displayEnd,
				}
			: null;
	const handleEditClick = () => {
		setIsMenuOpen(false);
		setIsDeleteConfirming(false);
		onEdit();
	};
	const handleDeleteClick = async () => {
		if (!isDeleteConfirming) {
			setIsDeleteConfirming(true);
			return;
		}

		await onDelete();
		setIsMenuOpen(false);
		setIsDeleteConfirming(false);
	};

	return (
		<>
			<div
				className={`${styles.ganttRowInfo} ${styles.ganttCustomEventInfo}`}
				title={tooltip}
			>
				<div className={styles.ganttCustomEventHeader}>
					<strong>{customEvent.title}</strong>
					<button
						type="button"
						className={styles.ganttCustomEventMenuButton}
						onClick={() => {
							setIsMenuOpen((prev) => !prev);
							setIsDeleteConfirming(false);
						}}
						aria-label="Действия с кастомным этапом"
					>
						...
					</button>
					{isMenuOpen ? (
						<div className={styles.ganttCustomEventMenu}>
							<button type="button" onClick={handleEditClick}>
								Редактировать
							</button>
							<button
								type="button"
								className={isDeleteConfirming ? styles.dangerAction : ""}
								disabled={isDeleting}
								onClick={handleDeleteClick}
							>
								{isDeleteConfirming ? "Подтвердить удаление" : "Удалить"}
							</button>
						</div>
					) : null}
				</div>
				<span>{customEvent.description}</span>
				<small>
					План: {formatDateFull(customEvent.planStart)} —{" "}
					{formatDateFull(customEvent.planEnd)}
				</small>
				<small>
					Факт: {formatDateFull(customEvent.factStart)} —{" "}
					{formatDateFull(customEvent.factEnd)}
				</small>
				<small>Отклонение: {formatDeviation(deviation)}</small>
				<small>Статус: {status}</small>
			</div>
			<div className={styles.ganttTrack} title={tooltip}>
				<GanttTrackGrid monthTicks={monthTicks} weekTicks={weekTicks} />
				{customEvent.event.eventKind === "duration" && period ? (
					<button
						type="button"
						className={`${styles.ganttSegment} ${styles.ganttCustomEventSegment}`}
						onClick={onEdit}
						style={getSegmentStyle(period.start, period.end, timeline)}
					>
						{customEvent.title}
					</button>
				) : customEvent.displayDate ? (
					<button
						type="button"
						className={`${styles.ganttMilestone} ${styles.ganttCustomEventMarker}`}
						onClick={onEdit}
						style={getMilestoneStyle(customEvent.displayDate, timeline)}
					>
						<b />
						<small>
							{customEvent.title}
							<br />
							{formatDateShort(customEvent.displayDate)}
						</small>
					</button>
				) : (
					<span className={styles.ganttNoDate}>Дата не заполнена</span>
				)}
			</div>
		</>
	);
};

const GanttStageTable = ({
	stages,
	today,
}: {
	stages: GanttStage[];
	today: Date;
}) => (
	<div className={styles.ganttTable}>
		<div className={styles.ganttTableHead}>
			<span>Этап</span>
			<span>План</span>
			<span>Факт</span>
			<span>Отклонение</span>
			<span>Статус</span>
		</div>
		{stages.map((stage) => {
			const deviation = getStageDeviation(stage, today);
			const status = getStageStatus(stage, today);

			return (
				<div key={stage.id} className={styles.ganttTableRow}>
					<strong>{stage.title}</strong>
					<span>
						{formatDateFull(stage.planStart)} — {formatDateFull(stage.planEnd)}
					</span>
					<span>
						{formatDateFull(stage.factStart)} — {formatDateFull(stage.factEnd)}
					</span>
					<span>{formatDeviation(deviation)}</span>
					<span
						className={
							status.startsWith("Просрочен")
								? styles.ganttStatusDanger
								: status === "Завершён раньше плана"
									? styles.ganttStatusSuccess
									: styles.ganttStatusNeutral
						}
					>
						{status}
					</span>
				</div>
			);
		})}
	</div>
);
