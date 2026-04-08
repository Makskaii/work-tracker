import { useMemo, useState } from "react";
import { TaskCodes } from "@/components/calendar/constants/const";
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
	return (
		<div className={cls.taskRow}>
			<div className={cls.taskMain}>
				<div className={cls.taskTitle}>{task.title}</div>
			</div>

			<div className={cls.taskSide}>
				<StatusBadge status={task.stageId} type="task" />
			</div>
		</div>
	);
};

const TaskBundleCard = ({ bundle }: { bundle: TaskBundle }) => {
	const [isOpen, setIsOpen] = useState(false);

	const progress = getBundleProgress(bundle.tasks);
	const doneTasksCount = bundle.tasks.filter(
		(task) => task.stageId === "done",
	).length;

	return (
		<div className={cls.card}>
			<div className={cls.cardHeader}>
				<div className={cls.headerMain}>
					<div className={cls.titleRow}>
						<h3 className={cls.title}>{bundle.title}</h3>
						<StatusBadge status={bundle.stageId} type="bundle" />
					</div>

					{bundle[TaskCodes.description] ? (
						<p className={cls.description}>{bundle[TaskCodes.description]}</p>
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

					<button
						type="button"
						className={cls.toggleButton}
						onClick={() => setIsOpen((prev) => !prev)}
					>
						{isOpen ? "Скрыть задачи" : "Показать задачи"}
					</button>
				</div>
			</div>

			{isOpen ? (
				<div className={cls.tasksList}>
					{bundle.tasks.map((task) => (
						<BundleTaskRow key={task.id} task={task} />
					))}
				</div>
			) : null}
		</div>
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
						Активных:{" "}
						{
							bundles.filter(
								(bundle) => bundle.stageId === "DT1072_18:UC_YU7VRR",
							).length
						}
					</span>
					<span className={cls.summaryItem}>
						Завершённых:{" "}
						{
							bundles.filter(
								(bundle) => bundle.stageId === "DT1072_18:UC_6JNSDG",
							).length
						}
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
