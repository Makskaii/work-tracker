import { useMemo, useState } from "react";
import { TaskCodes } from "@/components/calendar/constants/const";
import { TaskView } from "@/components/taskItem/TaskView";
import { TASK_STAGE_IDS } from "@/pages/ReportsPage/constants/statuses";
import type { TaskProps } from "@/shared/types/types";
import type { TaskBundle } from "../ProjectPage/ClientProjectPage";
import cls from "./TaskBundleSection.module.scss";

const getBundleProgress = (tasks: TaskProps[]) => {
	if (!tasks.length) return 0;

	const doneCount = tasks.filter(
		(task) => task.stageId === "DT1072_18:UC_6JNSDG",
	).length;
	return Math.round((doneCount / tasks.length) * 100);
};

const getTaskStatusLabel = (status: string) => {
	switch (status) {
		case "DT1072_18:CLIENT":
			return "В работе";
		case "DT1072_18:UC_6JNSDG":
			return "Завершена";
		default:
			return "Новая";
	}
};

const getBundleStatusLabel = (status: string) => {
	switch (status) {
		case "DT1072_18:UC_YU7VRR":
			return "В работе";
		case "DT1072_18:UC_6JNSDG":
			return "Закончен";
		default:
			return "Новый";
	}
};
type TaskStatus = "In work" | "Done" | "Sprint" | "Backlog";

const getTaskStatus = (task: TaskProps): TaskStatus => {
	console.log({ task });
	if (task.stageId === TASK_STAGE_IDS.DONE) {
		return "Done";
	}

	const isInWOrk =
		task.stageId === TASK_STAGE_IDS.IN_WORK ||
		task.stageId === TASK_STAGE_IDS.TESTING ||
		task.stageId === TASK_STAGE_IDS.WAITING ||
		task.stageId === TASK_STAGE_IDS.DOCS;

	if (isInWOrk) {
		return "In work";
	}

	if (task.stageId === TASK_STAGE_IDS.BACKLOG) {
		return "Backlog";
	}

	return "Sprint";
};

const formatDate = (date?: string) => {
	if (!date) return "—";

	return new Date(date).toLocaleDateString("ru-RU");
};

const ProgressBar = ({ value }: { value: number }) => {
	return (
		<div className={cls.progressWrapper}>
			<div className={cls.progressTrack}>
				<div className={cls.progressFill} style={{ width: `${value}%` }} />
			</div>
			<span className={cls.progressValue}>{value}%</span>
		</div>
	);
};

const StatusBadge = ({
	status,
	type,
}: {
	status: string;
	type: "bundle" | "task";
}) => {
	const className = useMemo(() => {
		if (type === "bundle") {
			return status === "DT1072_18:UC_6JNSDG"
				? cls.badgeDone
				: cls.badgeInProgress;
		}

		switch (status) {
			case "DT1072_18:UC_6JNSDG":
				return cls.badgeDone;
			case "DT1072_18:UC_YU7VRR":
				return cls.badgeInProgress;
			default:
				return cls.badgeTodo;
		}
	}, [status, type]);

	return (
		<span className={`${cls.badge} ${className}`}>
			{type === "bundle"
				? getBundleStatusLabel(status)
				: getTaskStatusLabel(status)}
		</span>
	);
};
const BundleTaskRow = ({ task }: { task: TaskProps }) => {
	const [extended, setExtended] = useState(false);

	return (
		<div className={cls.taskRow} onClick={() => setExtended(true)}>
			{extended ? (
				<TaskView taskId={task.id} onClose={() => setExtended(false)} />
			) : (
				<>
					<div className={cls.taskMain}>
						<div className={cls.taskTitle} title={task.title}>
							{task.title}
						</div>

						<div className={cls.taskMeta}>
							{task.createdTime ? (
								<span>Создана: {formatDate(task.createdTime)}</span>
							) : null}
						</div>
					</div>

					<div
						className={cls.taskSide}
						style={{
							background:
								getTaskStatus(task) === "In work"
									? "greenyellow"
									: getTaskStatus(task) === "Done"
										? "blue"
										: getTaskStatus(task) === "Sprint"
											? "#bfdbfe"
											: "orange",
							borderRadius: "10px",
							padding: "0 1rem",
						}}
					>
						{getTaskStatus(task)}
					</div>
				</>
			)}
		</div>
	);
};

const DESCRIPTION_PREVIEW_LIMIT = 180;
const TASKS_PREVIEW_COUNT = 5;

const isDoneStage = (stageId?: string) => stageId === "DT1072_18:UC_6JNSDG";
const isActiveStage = (stageId?: string) => stageId === "DT1072_18:UC_YU7VRR";

const getSafeText = (value?: string | null) => value?.trim() ?? "";

const clampText = (text: string, limit: number) => {
	if (text.length <= limit) return text;
	return `${text.slice(0, limit).trim()}...`;
};

const TaskBundleCard = ({ bundle }: { bundle: TaskBundle }) => {
	const [isOpen, setIsOpen] = useState(false);
	const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
	const [showAllTasks, setShowAllTasks] = useState(false);

	const progress = getBundleProgress(bundle.tasks);

	const doneTasksCount = useMemo(() => {
		return bundle.tasks.filter((task) => isDoneStage(task.stageId)).length;
	}, [bundle.tasks]);

	const description = getSafeText(bundle[TaskCodes.description]);
	const hasLongDescription = description.length > DESCRIPTION_PREVIEW_LIMIT;

	const visibleDescription = isDescriptionExpanded
		? description
		: clampText(description, DESCRIPTION_PREVIEW_LIMIT);

	const hasManyTasks = bundle.tasks.length > TASKS_PREVIEW_COUNT;
	const visibleTasks = showAllTasks
		? bundle.tasks
		: bundle.tasks.slice(0, TASKS_PREVIEW_COUNT);

	return (
		<article className={cls.card}>
			<div className={cls.cardHeader}>
				<div className={cls.headerMain}>
					<div className={cls.titleRow}>
						<div className={cls.titleBlock}>
							<h3 className={cls.title} title={bundle.title}>
								{bundle.title}
							</h3>
						</div>

						<div className={cls.titleBadge}>
							<StatusBadge status={bundle.stageId} type="bundle" />
						</div>
					</div>

					{description ? (
						<div className={cls.descriptionBlock}>
							<p
								className={`${cls.description} ${
									isDescriptionExpanded ? cls.descriptionExpanded : ""
								}`}
							>
								{visibleDescription}
							</p>

							{hasLongDescription ? (
								<button
									type="button"
									className={cls.inlineButton}
									onClick={() => setIsDescriptionExpanded((prev) => !prev)}
								>
									{isDescriptionExpanded
										? "Скрыть описание"
										: "Показать описание"}
								</button>
							) : null}
						</div>
					) : null}

					<div className={cls.metaGrid}>
						<div className={cls.metaItem}>
							<span className={cls.metaLabel}>Создан</span>
							<span className={cls.metaValue}>
								{formatDate(bundle.createdTime)}
							</span>
						</div>

						<div className={cls.metaItem}>
							<span className={cls.metaLabel}>Дедлайн</span>
							<span className={cls.metaValue}>{formatDate("2026-02-02")}</span>
						</div>

						<div className={cls.metaItem}>
							<span className={cls.metaLabel}>Всего задач</span>
							<span className={cls.metaValue}>{bundle.tasks.length}</span>
						</div>

						<div className={cls.metaItem}>
							<span className={cls.metaLabel}>Завершено</span>
							<span className={cls.metaValue}>
								{doneTasksCount} / {bundle.tasks.length}
							</span>
						</div>
					</div>
				</div>

				<div className={cls.headerAside}>
					<div className={cls.progressBlock}>
						<div className={cls.progressTitle}>Готовность</div>
						<ProgressBar value={progress} />
						<div className={cls.progressMeta}>
							Завершено {doneTasksCount} из {bundle.tasks.length}
						</div>
					</div>

					<div className={cls.cardActions}>
						<button
							type="button"
							className={cls.toggleButton}
							onClick={() => setIsOpen((prev) => !prev)}
						>
							{isOpen ? "Скрыть задачи" : "Показать задачи"}
						</button>
					</div>
				</div>
			</div>

			{isOpen ? (
				<div className={cls.tasksSection}>
					<div className={cls.tasksSectionHeader}>
						<div className={cls.tasksSectionTitle}>Задачи бандла</div>

						{hasManyTasks ? (
							<button
								type="button"
								className={cls.inlineButton}
								onClick={() => setShowAllTasks((prev) => !prev)}
							>
								{showAllTasks
									? "Показать меньше"
									: `Показать все (${bundle.tasks.length})`}
							</button>
						) : null}
					</div>

					<div
						className={`${cls.tasksList} ${
							showAllTasks ? cls.tasksListScrollable : ""
						}`}
					>
						{visibleTasks.map((task) => (
							<BundleTaskRow key={task.id} task={task} />
						))}
					</div>
				</div>
			) : null}
		</article>
	);
};

export const TaskBundleSection = ({ bundles }: { bundles: TaskBundle[] }) => {
	if (!bundles.length) {
		return (
			<div className={cls.emptyState}>
				<div className={cls.emptyTitle}>Нет бандлов задач для отображения</div>
				<div className={cls.emptyText}>
					Создайте бандлы задач, чтобы отслеживать прогресс и управлять
					отдельными задачами
				</div>
			</div>
		);
	}

	const activeBundlesCount = bundles.filter((bundle) =>
		isActiveStage(bundle.stageId),
	).length;

	const doneBundlesCount = bundles.filter((bundle) =>
		isDoneStage(bundle.stageId),
	).length;

	return (
		<section className={cls.section}>
			<div className={cls.sectionHeader}>
				<div>
					<h2 className={cls.sectionTitle}>Бандлы задач</h2>
					<p className={cls.sectionDescription}>
						Группы связанных задач в рамках проекта
					</p>
				</div>

				<div className={cls.summary}>
					<span className={cls.summaryItem}>
						Всего бандлов: {bundles.length}
					</span>
					<span className={cls.summaryItem}>
						Активных: {activeBundlesCount}
					</span>
					<span className={cls.summaryItem}>
						Завершённых: {doneBundlesCount}
					</span>
				</div>
			</div>

			<div className={cls.list}>
				{bundles.map((bundle) => (
					<TaskBundleCard key={bundle.id} bundle={bundle} />
				))}
			</div>
		</section>
	);
};
