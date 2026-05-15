import { useMemo, useState } from "react";
import {
	HiMiniChevronDown,
	HiMiniChevronUp,
	HiMiniChevronUpDown,
} from "react-icons/hi2";
import { TaskCodes } from "@/components/calendar/constants/const";
import { Modal } from "@/components/modal";
import { TaskView } from "@/components/taskItem/TaskView";
import {
	type ClientProjectProps,
	type ClientTaskProps,
	type ClientTaskStatus,
	ClientTaskStatuses,
} from "@/shared/types/types";
import { classNames } from "@/shared/utils/utils";
import { TaskFilters, type TaskFilterValues } from "../TaskList/TaskFilters";
import type { ViewMode } from "./ClientProfile";
import cls from "./TaskListByProject.module.scss";

const PROJECT_STATUSES = {
	active: "Активен",
	approval: "Требует внимания",
	newProposal: "Новая заявка",
	backlog: "Беклог",
	done: "Завершен",
	empty: "Отсутствуют задачи",
} as const;

type GroupedProjectTasks = {
	projectId: string;
	projectName: string;
	projectStatus: (typeof PROJECT_STATUSES)[keyof typeof PROJECT_STATUSES];
	tasks: ClientTaskProps[];
};

type SortDirection = "asc" | "desc" | null;

type SortKey =
	| "title"
	| "status"
	| "hours"
	| "startDate"
	| "deadline"
	| "project";

type SortState = {
	key: SortKey | null;
	direction: SortDirection;
};

type PreparedTaskRow = {
	task: ClientTaskProps;
	projectId: string;
	projectName: string;
	taskStatus: ClientTaskStatus;
	hoursValue: number;
	startDateValue?: string;
	deadlineValue?: string;
};

type TaskListProps = {
	tasks: ClientTaskProps[];
	onTaskClick?: (task: ClientTaskProps) => void;
	className?: string;
	clientsProjects?: ClientProjectProps[];
	isProject?: boolean;
	view: ViewMode;
};

const DEFAULT_FILTERS: TaskFilterValues = {
	search: "",
	stage: "all",
	project: "all",
	client: "all",
	onlyWithLinked: false,
};

const compareStrings = (a?: string, b?: string) => {
	return (a ?? "").localeCompare(b ?? "", "ru", { sensitivity: "base" });
};

const compareNumbers = (a?: number, b?: number) => {
	return (a ?? 0) - (b ?? 0);
};

const compareDates = (a?: string, b?: string) => {
	const left = a ? new Date(a).getTime() : 0;
	const right = b ? new Date(b).getTime() : 0;

	return left - right;
};

const getProjectNameByTask = (
	task: ClientTaskProps,
	normalizedProjects?: ClientProjectProps[],
) => {
	const rawProjectId = task[TaskCodes.parentproject];
	const projectId = rawProjectId ? String(rawProjectId) : "unknown";

	if (projectId === "unknown") {
		return "Другое";
	}

	return (
		normalizedProjects?.find(
			(proj) =>
				String(proj.projectId) === projectId || String(proj.id) === projectId,
		)?.title ?? "Без названия"
	);
};

const prepareTaskRow = (
	task: ClientTaskProps,
	normalizedProjects?: ClientProjectProps[],
): PreparedTaskRow => {
	const rawProjectId = task[TaskCodes.parentproject];
	const projectId = rawProjectId ? String(rawProjectId) : "unknown";

	return {
		task,
		projectId,
		projectName: getProjectNameByTask(task, normalizedProjects),
		taskStatus: task.status,
		hoursValue: Number(task[TaskCodes.hours] ?? 0) || 0,
		startDateValue: task.createdTime,
		deadlineValue: task[TaskCodes.deadline] ?? undefined,
	};
};

const filterTasks = (tasks: ClientTaskProps[], filters: TaskFilterValues) => {
	return tasks.filter((task) => {
		const searchValue = filters.search.trim().toLowerCase();

		const descriptionValue = String(
			task[TaskCodes.description] ?? "",
		).toLowerCase();

		const matchesSearch =
			!searchValue ||
			task.title?.toLowerCase().includes(searchValue) ||
			descriptionValue.includes(searchValue);

		const matchesStage =
			filters.stage === "all" || task.status === filters.stage;

		const matchesProject =
			filters.project === "all" ||
			String(task[TaskCodes.parentproject] ?? "") === String(filters.project);

		const matchesClient =
			filters.client === "all" ||
			String(task[TaskCodes.client] ?? "") === String(filters.client);

		const linkedTasks = task[TaskCodes.linkedTasks];
		const matchesOnlyWithLinked =
			!filters.onlyWithLinked ||
			(Array.isArray(linkedTasks) && linkedTasks.length > 0);

		return (
			matchesSearch &&
			matchesStage &&
			matchesProject &&
			matchesClient &&
			matchesOnlyWithLinked
		);
	});
};

const sortPreparedRows = (
	rows: PreparedTaskRow[],
	sort: SortState,
): PreparedTaskRow[] => {
	if (!sort.key || !sort.direction) {
		return rows;
	}

	const sorted = [...rows].sort((a, b) => {
		switch (sort.key) {
			case "title":
				return compareStrings(a.task.title, b.task.title);

			case "status":
				return compareStrings(a.taskStatus, b.taskStatus);

			case "hours":
				return compareNumbers(a.hoursValue, b.hoursValue);

			case "startDate":
				return compareDates(a.startDateValue, b.startDateValue);

			case "deadline":
				return compareDates(a.deadlineValue, b.deadlineValue);

			case "project":
				return compareStrings(a.projectName, b.projectName);

			default:
				return 0;
		}
	});

	return sort.direction === "desc" ? sorted.reverse() : sorted;
};

const groupPreparedRowsByProject = (
	rows: PreparedTaskRow[],
): GroupedProjectTasks[] => {
	const map = new Map<
		string,
		{
			projectName: string;
			rows: PreparedTaskRow[];
		}
	>();

	for (const row of rows) {
		if (!map.has(row.projectId)) {
			map.set(row.projectId, {
				projectName: row.projectName,
				rows: [],
			});
		}

		map.get(row.projectId)?.rows.push(row);
	}

	return Array.from(map.entries()).map(([projectId, group]) => ({
		projectId,
		projectName: group.projectName,
		projectStatus: getClientProjectStatus(group.rows.map((row) => row.task)),
		tasks: group.rows.map((row) => row.task),
	}));
};

const getClientProjectStatus = (
	tasks: ClientTaskProps[],
): (typeof PROJECT_STATUSES)[keyof typeof PROJECT_STATUSES] => {
	if (!tasks.length) {
		return PROJECT_STATUSES.empty;
	}

	if (tasks.some((task) => task.status === ClientTaskStatuses.approval)) {
		return PROJECT_STATUSES.approval;
	}

	if (tasks.some((task) => task.status === ClientTaskStatuses.inWork)) {
		return PROJECT_STATUSES.active;
	}

	if (tasks.some((task) => task.status === ClientTaskStatuses.newProposal)) {
		return PROJECT_STATUSES.newProposal;
	}

	if (tasks.some((task) => task.status === ClientTaskStatuses.backlog)) {
		return PROJECT_STATUSES.backlog;
	}

	if (tasks.some((task) => task.status === ClientTaskStatuses.done)) {
		return PROJECT_STATUSES.done;
	}

	return PROJECT_STATUSES.empty;
};

const formatDate = (value?: string | null) => {
	if (!value) return "—";

	const date = new Date(value);

	if (Number.isNaN(date.getTime())) {
		return value;
	}

	return new Intl.DateTimeFormat("ru-RU", {
		day: "2-digit",
		month: "2-digit",
		year: "2-digit",
	}).format(date);
};

const formatHours = (value?: string | number | null) => {
	if (value === undefined || value === null || value === "") return "0ч";

	const numeric = Number(value);

	if (Number.isNaN(numeric)) {
		return String(value);
	}

	return `${numeric}ч`;
};

const EmptyState = () => (
	<div className={cls.emptyState}>
		<div className={cls.emptyTitle}>Ничего не найдено</div>
		<div className={cls.emptyText}>
			Попробуйте изменить фильтры или строку поиска.
		</div>
	</div>
);

export const TaskListByProject = ({
	tasks,
	className,
	clientsProjects,
	isProject = false,
	view,
	onTaskClick,
}: TaskListProps) => {
	const [filters, setFilters] = useState<TaskFilterValues>(DEFAULT_FILTERS);
	const [openTask, setOpenTask] = useState(false);
	const [activeTask, setActiveTask] = useState<ClientTaskProps | null>(null);
	const [sort, setSort] = useState<SortState>({
		key: null,
		direction: null,
	});

	const handleSort = (key: SortKey) => {
		setSort((prev) => {
			if (prev.key !== key) {
				return { key, direction: "asc" };
			}

			if (prev.direction === "asc") {
				return { key, direction: "desc" };
			}

			if (prev.direction === "desc") {
				return { key: null, direction: null };
			}

			return { key, direction: "asc" };
		});
	};

	const filteredTasks = useMemo(() => {
		return filterTasks(tasks, filters);
	}, [tasks, filters]);

	const preparedRows = useMemo(() => {
		return filteredTasks.map((task) => prepareTaskRow(task, clientsProjects));
	}, [filteredTasks, clientsProjects]);

	const sortedRows = useMemo(() => {
		return sortPreparedRows(preparedRows, sort);
	}, [preparedRows, sort]);

	const groupedTasks = useMemo(() => {
		const grouped = groupPreparedRowsByProject(sortedRows);

		if (sort.key === "project" && sort.direction) {
			grouped.sort((a, b) => compareStrings(a.projectName, b.projectName));

			if (sort.direction === "desc") {
				grouped.reverse();
			}
		} else {
			grouped.sort((a, b) => compareStrings(a.projectName, b.projectName));
		}

		return grouped;
	}, [sortedRows, sort]);

	const renderSortIcon = (key: SortKey) => {
		if (sort.key !== key || !sort.direction) {
			return <HiMiniChevronUpDown className={cls.sortIconMuted} />;
		}

		if (sort.direction === "asc") {
			return <HiMiniChevronUp className={cls.sortIconActive} />;
		}

		return <HiMiniChevronDown className={cls.sortIconActive} />;
	};

	const openTaskModal = (task: ClientTaskProps) => {
		onTaskClick?.(task);
		setActiveTask(task);
		setOpenTask(true);
	};
	const renderTaskRow = (task: ClientTaskProps) => {
		const taskStatus = task.status;
		const projectName = getProjectNameByTask(task, clientsProjects);

		return (
			<div
				key={task.id}
				className={cls.rowButton}
				onClick={() => openTaskModal(task)}
			>
				<div className={`${cls.row} ${cls.taskRow}`}>
					<div className={`${cls.cell} ${cls.titleCol}`}>
						<div className={cls.titleBlock}>
							<div className={cls.titleTop}>
								<span className={cls.title}>{task.title}</span>
							</div>

							<div className={cls.metaLine}>
								{task[TaskCodes.description] ? (
									<span className={cls.descriptionPreview}>
										{String(task[TaskCodes.description])}
									</span>
								) : null}
							</div>
						</div>
					</div>

					<div className={cls.cell}>
						<span
							className={classNames(cls.activityBadge, {
								[cls.inWork]: taskStatus === "In work",
								[cls.done]: taskStatus === "Done",
								[cls.backlog]: taskStatus === "Backlog",
								[cls.newProposal]: taskStatus === "New proposal",
								[cls.approval]: taskStatus === "Approval",
							})}
						>
							{taskStatus}
						</span>
					</div>

					<div className={cls.cell}>{formatHours(task[TaskCodes.hours])}</div>

					<div className={cls.cell}>{formatDate(task.createdTime)}</div>

					<div className={cls.cell}>{formatDate(task[TaskCodes.deadline])}</div>

					{!isProject && (
						<div className={cls.cell}>
							{task[TaskCodes.parentproject] ? (
								<span className={cls.badge}>{projectName}</span>
							) : (
								<span className={cls.emptyValue}>—</span>
							)}
						</div>
					)}
				</div>
			</div>
		);
	};

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
						<button
							type="button"
							className={`${cls.cell} ${cls.titleCol} ${cls.headButton}`}
							onClick={() => handleSort("title")}
						>
							<span>Название</span>
							{renderSortIcon("title")}
						</button>

						<button
							type="button"
							className={`${cls.cell} ${cls.headButton}`}
							onClick={() => handleSort("status")}
						>
							<span>Статус</span>
							{renderSortIcon("status")}
						</button>

						<button
							type="button"
							className={`${cls.cell} ${cls.headButton}`}
							onClick={() => handleSort("hours")}
						>
							<span>Часы</span>
							{renderSortIcon("hours")}
						</button>

						<button
							type="button"
							className={`${cls.cell} ${cls.headButton}`}
							onClick={() => handleSort("startDate")}
						>
							<span>Взято в работу</span>
							{renderSortIcon("startDate")}
						</button>

						<button
							type="button"
							className={`${cls.cell} ${cls.headButton}`}
							onClick={() => handleSort("deadline")}
						>
							<span>Дедлайн</span>
							{renderSortIcon("deadline")}
						</button>

						{!isProject && (
							<button
								type="button"
								className={`${cls.cell} ${cls.headButton}`}
								onClick={() => handleSort("project")}
							>
								<span>Проект</span>
								{renderSortIcon("project")}
							</button>
						)}
					</div>

					<div className={cls.body}>
						{view === "projects" ? (
							groupedTasks.length ? (
								groupedTasks.map((group) => (
									<div key={group.projectId} className={cls.projectGroup}>
										<div className={`${cls.row} ${cls.projectRow}`}>
											<div className={`${cls.cell} ${cls.titleCol}`}>
												<div className={cls.projectTitleWrap}>
													<span className={cls.projectTitle}>
														{group.projectName}
													</span>

													<span
														className={classNames(cls.activityBadge, {
															[cls.inWork]:
																group.projectStatus === PROJECT_STATUSES.active,
															[cls.approval]:
																group.projectStatus ===
																PROJECT_STATUSES.approval,
															[cls.newProposal]:
																group.projectStatus ===
																PROJECT_STATUSES.newProposal,
															[cls.done]:
																group.projectStatus === PROJECT_STATUSES.done,
															[cls.backlog]:
																group.projectStatus ===
																PROJECT_STATUSES.backlog,
														})}
													>
														{group.projectStatus}
													</span>

													<span className={cls.projectCount}>
														{group.tasks.length} задач
													</span>
												</div>
											</div>
										</div>

										{group.tasks.map(renderTaskRow)}
									</div>
								))
							) : (
								<EmptyState />
							)
						) : sortedRows.length ? (
							sortedRows.map((row) => renderTaskRow(row.task))
						) : (
							<EmptyState />
						)}
					</div>
				</div>
			</div>

			<Modal
				isOpen={openTask}
				onClose={() => setOpenTask(false)}
				innerScroll
				size="covered"
			>
				<TaskView
					taskId={activeTask?.id ?? ""}
					onClose={() => setOpenTask(false)}
				/>
			</Modal>
		</div>
	);
};
