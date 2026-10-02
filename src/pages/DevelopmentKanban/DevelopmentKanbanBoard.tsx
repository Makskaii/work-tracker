import { type CSSProperties, useId, useMemo, useRef, useState } from "react";
import styles from "./DevelopmentKanbanBoard.module.scss";
import {
	formatKanbanDate,
	getDeadlineState,
	type KanbanLane,
	type KanbanStage,
	type KanbanTask,
} from "./model";

export type DevelopmentKanbanBoardProps = {
	stages: KanbanStage[];
	lanes: KanbanLane[];
	onOpenTask: (id: string) => void;
	now?: Date;
};

const hourFormat = new Intl.NumberFormat("ru-RU", {
	maximumFractionDigits: 2,
});
const formatHours = (hours: number) => hourFormat.format(hours);
const getInitials = (name: string) =>
	name
		.trim()
		.split(/\s+/)
		.slice(0, 2)
		.map((part) => part[0] ?? "")
		.join("")
		.toUpperCase() || "?";

const EmployeeAvatar = ({ lane }: { lane: KanbanLane }) => {
	const [failedPhoto, setFailedPhoto] = useState<string | undefined>();
	return (
		<span className={styles.avatar} aria-hidden="true">
			{getInitials(lane.name)}
			{lane.photo && lane.photo !== failedPhoto && (
				<img
					src={lane.photo}
					alt=""
					loading="lazy"
					onError={() => setFailedPhoto(lane.photo)}
				/>
			)}
		</span>
	);
};

const TaskDate = ({
	label,
	date,
	now,
	terminal,
}: {
	label: string;
	date: string | null | undefined;
	now: Date;
	terminal: boolean;
}) => {
	if (!date) return null;
	const state = terminal ? "none" : getDeadlineState(date, now);
	const dateLabel = formatKanbanDate(date);
	if (!dateLabel) return null;
	return (
		<span className={styles.taskDate}>
			<span className={styles.dateLabel}>{label}</span>
			<span
				className={[
					styles.dateValue,
					state === "overdue" ? styles.dateOverdue : "",
					state === "today" ? styles.dateToday : "",
				]
					.filter(Boolean)
					.join(" ")}
			>
				{dateLabel}
				{state === "overdue"
					? " · просрочен"
					: state === "today"
						? " · сегодня"
						: ""}
			</span>
		</span>
	);
};

const TaskCard = ({
	task,
	now,
	terminal,
	onOpenTask,
}: {
	task: KanbanTask;
	now: Date;
	terminal: boolean;
	onOpenTask: (id: string) => void;
}) => {
	const descriptionId = useId();
	return (
		<button
			type="button"
			className={styles.taskCard}
			onClick={() => onOpenTask(task.id)}
			aria-label={`Открыть задачу: ${task.title}`}
			aria-describedby={`${descriptionId}-priority ${descriptionId}-hours ${descriptionId}-dates`}
		>
			<span className={styles.taskTopLine} id={`${descriptionId}-priority`}>
				<span className={styles.projectTag} title={task.projectTitle}>
					{task.projectTitle || "Без проекта"}
				</span>
				<span
					className={`${styles.priority} ${task.priority === null ? styles.priorityMissing : ""}`}
					title={
						task.priority === null
							? "Приоритет не задан"
							: `Приоритет: ${task.priority}. Меньшее число — выше в списке.`
					}
				>
					{task.priority === null ? "Приор. —" : `Приор. ${task.priority}`}
				</span>
			</span>
			<strong className={styles.taskTitle}>{task.title}</strong>
			<span className={styles.taskHours} id={`${descriptionId}-hours`}>
				<span>Оценка</span>
				<strong>
					{task.estimateHours === null
						? "Не задана"
						: `${formatHours(task.estimateHours)} ч`}
				</strong>
			</span>
			<span className={styles.taskDates} id={`${descriptionId}-dates`}>
				<TaskDate
					label="Дедлайн"
					date={task.deadline}
					now={now}
					terminal={terminal}
				/>
				<TaskDate
					label="Редлайн"
					date={task.redline}
					now={now}
					terminal={terminal}
				/>
				{!task.deadline && !task.redline && (
					<span className={styles.noDates}>Сроки не заданы</span>
				)}
			</span>
			<span className={styles.taskBottomLine}>
				<span>#{task.id}</span>
				<span className={styles.openTask}>
					Открыть <span aria-hidden="true">↗</span>
				</span>
			</span>
		</button>
	);
};

type EmployeeGroup = {
	lane: KanbanLane;
	tasks: KanbanTask[];
	projects: number;
	hours: number | null;
	missingEstimates: number;
};

const countLabel = (value: number, forms: [string, string, string]) => {
	const lastTwo = value % 100;
	const last = value % 10;
	const label =
		lastTwo >= 11 && lastTwo <= 14
			? forms[2]
			: last === 1
				? forms[0]
				: last >= 2 && last <= 4
					? forms[1]
					: forms[2];
	return `${value} ${label}`;
};
const taskCountLabel = (count: number) =>
	countLabel(count, ["задача", "задачи", "задач"]);
const projectCountLabel = (count: number) =>
	countLabel(count, ["проект", "проекта", "проектов"]);

export const DevelopmentKanbanBoard = ({
	stages,
	lanes,
	onOpenTask,
	now = new Date(),
}: DevelopmentKanbanBoardProps) => {
	const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
		() => new Set(),
	);
	const viewportRef = useRef<HTMLDivElement>(null);
	const stageRefs = useRef(new Map<string, HTMLElement>());
	const groupsByStage = useMemo(() => {
		const result = new Map<string, EmployeeGroup[]>();
		for (const lane of lanes) {
			const byStage = new Map<string, KanbanTask[]>();
			for (const task of lane.tasks) {
				const tasks = byStage.get(task.stageId) ?? [];
				tasks.push(task);
				byStage.set(task.stageId, tasks);
			}
			for (const [stageId, tasks] of byStage) {
				const knownEstimates = tasks.filter(
					(task) => task.estimateHours !== null,
				);
				const group: EmployeeGroup = {
					lane,
					tasks,
					projects: new Set(tasks.map((task) => task.projectId).filter(Boolean))
						.size,
					hours: knownEstimates.length
						? knownEstimates.reduce(
								(sum, task) => sum + (task.estimateHours ?? 0),
								0,
							)
						: null,
					missingEstimates: tasks.length - knownEstimates.length,
				};
				const groups = result.get(stageId) ?? [];
				groups.push(group);
				result.set(stageId, groups);
			}
		}
		return result;
	}, [lanes]);
	const toggleGroup = (key: string) => {
		setCollapsedGroups((previous) => {
			const next = new Set(previous);
			if (next.has(key)) next.delete(key);
			else next.add(key);
			return next;
		});
	};
	const jumpToStage = (stageId: string) => {
		const viewport = viewportRef.current;
		const panel = stageRefs.current.get(stageId);
		if (!viewport || !panel) return;
		panel.focus({ preventScroll: true });
		const left =
			panel.getBoundingClientRect().left -
			viewport.getBoundingClientRect().left +
			viewport.scrollLeft;
		viewport.scrollTo({ left: Math.max(0, left), behavior: "auto" });
	};

	if (!stages.length) {
		return (
			<div className={styles.emptyBoard} role="status">
				Стадии задач пока недоступны.
			</div>
		);
	}

	return (
		<>
			<nav
				className={styles.stageNavigation}
				aria-label="Быстрый переход к стадии"
			>
				{stages.map((stage) => (
					<button
						key={stage.id}
						type="button"
						className={styles.stageJump}
						aria-label={`Перейти к стадии: ${stage.name}`}
						onClick={() => jumpToStage(stage.id)}
					>
						<span
							className={styles.stageJumpDot}
							style={{ backgroundColor: stage.color || "#69d7ef" }}
							aria-hidden="true"
						/>
						{stage.name}
					</button>
				))}
			</nav>
			<div
				ref={viewportRef}
				className={styles.viewport}
				role="region"
				aria-label="Канбан задач разработки по стадиям"
				tabIndex={0}
			>
				<div className={styles.board}>
					{stages.map((stage) => {
						const groups = groupsByStage.get(stage.id) ?? [];
						const taskCount = groups.reduce(
							(sum, group) => sum + group.tasks.length,
							0,
						);
						const colorStyle = {
							"--stage-color": stage.color || "#69d7ef",
							"--employee-count": Math.max(groups.length, 1),
						} as CSSProperties;
						return (
							<section
								ref={(node) => {
									if (node) stageRefs.current.set(stage.id, node);
									else stageRefs.current.delete(stage.id);
								}}
								key={stage.id}
								className={styles.column}
								style={colorStyle}
								aria-label={`Стадия: ${stage.name}`}
								tabIndex={-1}
							>
								<div className={styles.stageHeading}>
									<h2>{stage.name}</h2>
									<span
										className={styles.stageCount}
										aria-label={`${stage.name}: ${taskCountLabel(taskCount)}`}
									>
										{taskCount}
									</span>
								</div>
								<div
									className={styles.columnBody}
									role="region"
									aria-label={`Задачи стадии: ${stage.name}`}
								>
									{groups.length ? (
										groups.map((group) => {
											const { lane, tasks, projects, hours, missingEstimates } =
												group;
											const groupKey = JSON.stringify([stage.id, lane.id]);
											const collapsed = collapsedGroups.has(groupKey);
											const groupContentId = `development-kanban-group-${encodeURIComponent(groupKey)}`;
											return (
												<section
													key={lane.id}
													className={styles.employeeGroup}
													aria-label={`${lane.name} · ${stage.name}`}
												>
													<button
														type="button"
														className={styles.employeeHeading}
														onClick={() => toggleGroup(groupKey)}
														aria-expanded={!collapsed}
														aria-controls={groupContentId}
														aria-label={`${collapsed ? "Развернуть" : "Свернуть"} задачи: ${lane.name} · ${stage.name}`}
													>
														<span className={styles.employeeIdentity}>
															<EmployeeAvatar lane={lane} />
															<strong className={styles.employeeName}>
																{lane.name}
															</strong>
															<span
																className={`${styles.collapseChevron} ${collapsed ? styles.collapseChevronClosed : ""}`}
																aria-hidden="true"
															>
																⌄
															</span>
														</span>
														<span className={styles.groupSummary}>
															<span>{taskCountLabel(tasks.length)}</span>
															<span>{projectCountLabel(projects)}</span>
															<strong>
																{hours === null
																	? "Оценки не заданы"
																	: `${formatHours(hours)} ч`}
															</strong>
														</span>
														{missingEstimates > 0 && (
															<span className={styles.missingEstimates}>
																Без оценки: {missingEstimates}
															</span>
														)}
													</button>
													<div
														id={groupContentId}
														className={styles.taskList}
														role="region"
														aria-label={`Задачи сотрудника: ${lane.name} · ${stage.name}`}
														tabIndex={0}
														hidden={collapsed}
													>
														{tasks.map((task) => (
															<TaskCard
																key={task.id}
																task={task}
																now={now}
																terminal={Boolean(stage.terminal)}
																onOpenTask={onOpenTask}
															/>
														))}
													</div>
												</section>
											);
										})
									) : (
										<div className={styles.emptyColumn}>Нет задач</div>
									)}
								</div>
							</section>
						);
					})}
				</div>
			</div>
		</>
	);
};
