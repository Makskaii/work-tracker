import { useMemo, useState } from "react";
import { TaskCodes } from "@/components/calendar/constants/const";
import { Modal } from "@/components/modal";
import { TaskView } from "@/components/taskItem/TaskView";
import type { ClientProjectProps, TaskProps } from "@/shared/types/types";
import { classNames } from "@/shared/utils/utils";
import { getTaskStatus } from "../ProjectPage/ProjectTaskCard";
import { TaskFilters, type TaskFilterValues } from "./TaskFilters";
import cls from "./TaskList.module.scss";

type TaskListProps = {
	tasks: TaskProps[];
	onTaskClick?: (task: TaskProps) => void;
	className?: string;
	projects?: ClientProjectProps[];
	clientsProjects?: ClientProjectProps[];
	isProject?: boolean;
};

const DEFAULT_FILTERS: TaskFilterValues = {
	search: "",
	stage: "all",
	project: "all",
	client: "all",
	onlyWithLinked: false,
};

export const TaskList = ({
	tasks,
	className,
	projects,
	clientsProjects,
	isProject = false,
}: TaskListProps) => {
	const [filters, setFilters] = useState<TaskFilterValues>(DEFAULT_FILTERS);

	const [openTask, setOpenTask] = useState<boolean>(false);

	const [activeTask, setActiveTask] = useState<TaskProps | null>(null);

	const filteredTasks = useMemo(() => {
		return tasks.filter((task) => {
			const searchValue = filters.search.trim().toLowerCase();

			const matchesSearch =
				!searchValue ||
				task?.title.toLowerCase().includes(searchValue) ||
				task?.[TaskCodes.description]?.toLowerCase().includes(searchValue);

			const taskStage = task.stageId || task.stageId;
			const matchesStage =
				filters.stage === "all" || taskStage === filters.stage;

			const matchesProject =
				filters.project === "all" ||
				Number(task[TaskCodes.project]) === Number(filters.project);

			const matchesClient =
				filters.client === "all" ||
				String(task[TaskCodes.client]) === filters.client;

			return matchesSearch && matchesStage && matchesProject && matchesClient;
		});
	}, [tasks, filters]);

	return (
		<div className={`${cls.wrapper} ${className ?? ""}`}>
			<TaskFilters
				value={filters}
				onChange={setFilters}
				projectOptions={clientsProjects ?? []}
				total={tasks.length}
				filteredTotal={filteredTasks.length}
				isProjectPage={isProject}
			/>

			<div className={cls.tableWrap}>
				<div className={cls.table}>
					<div className={`${cls.row} ${cls.headRow}`}>
						<div className={`${cls.cell} ${cls.titleCol}`}>Название</div>

						<div className={cls.cell}>Статус</div>
						<div className={cls.cell}>Часы</div>
						<div className={cls.cell}>Взято в работу</div>
						<div className={cls.cell}>Дедлайн</div>

						{!isProject && <div className={cls.cell}>Проект</div>}
					</div>

					<div className={cls.body}>
						{filteredTasks.length ? (
							filteredTasks.map((task) => {
								return (
									<div
										key={task.id}
										className={cls.rowButton}
										onClick={() => {
											setOpenTask(true);
											setActiveTask(task);
										}}
									>
										<div className={cls.row}>
											<div className={`${cls.cell} ${cls.titleCol}`}>
												<div className={cls.titleBlock}>
													<div className={cls.titleTop}>
														<span className={cls.title}>{task.title}</span>
													</div>

													<div className={cls.metaLine}>
														{task[TaskCodes.description] ? (
															<span className={cls.descriptionPreview}>
																{task[TaskCodes.description]}
															</span>
														) : null}
													</div>
												</div>
											</div>

											<div className={cls.cell}>
												<span
													className={classNames(cls.activityBadge, {
														[cls.inWork]: getTaskStatus(task) === "In work",
														[cls.done]: getTaskStatus(task) === "Done",
														[cls.backlog]: getTaskStatus(task) === "Backlog",
														[cls.sprint]: getTaskStatus(task) === "Sprint",
													})}
												>
													{getTaskStatus(task)}
												</span>
											</div>

											<div className={cls.cell}>
												{formatHours(task[TaskCodes.estimateTime])}
											</div>

											<div className={cls.cell}>
												{formatDate(task.createdTime)}
											</div>

											<div className={cls.cell}>
												{formatDate(task.lastActivityTime || task.movedTime)}
											</div>

											{!isProject && (
												<div className={cls.cell}>
													{task[TaskCodes.project] ? (
														<span className={cls.badge}>
															{projects?.find(
																(proj) =>
																	proj.id === Number(task[TaskCodes.project]),
															)?.title ?? ""}
														</span>
													) : (
														<span className={cls.emptyValue}>—</span>
													)}
												</div>
											)}
										</div>
									</div>
								);
							})
						) : (
							<div className={cls.emptyState}>
								<div className={cls.emptyTitle}>Ничего не найдено</div>
								<div className={cls.emptyText}>
									Попробуй изменить фильтры или строку поиска.
								</div>
							</div>
						)}
					</div>
				</div>
			</div>

			<Modal isOpen={openTask} onClose={() => setOpenTask(false)} innerScroll>
				<TaskView
					taskId={activeTask?.id ?? ""}
					onClose={() => setOpenTask(false)}
				/>
			</Modal>
		</div>
	);
};

const formatDate = (value?: string) => {
	if (!value) return "—";

	const date = new Date(value);

	if (Number.isNaN(date.getTime())) {
		return value;
	}

	return new Intl.DateTimeFormat("ru-RU", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	}).format(date);
};

const formatHours = (value?: string) => {
	if (!value) return "0ч";

	const numeric = Number(value);

	if (Number.isNaN(numeric)) {
		return value;
	}

	return `${numeric}ч`;
};
