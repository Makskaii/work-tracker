import { useEffect, useMemo, useState } from "react";
import { ReportCodes, TaskCodes } from "@/components/calendar/constants/const";
import type { ReportProps } from "@/components/calendar/types/types";
import { Modal } from "@/components/modal";
import { Spinner } from "@/components/spinner/Spinner";
import { getItems } from "@/pages/ReportsPage/api/getTasks";
import { EntityTypeIds, TASK_SELECT_FIELDS } from "@/shared/constants/const";
import { useBitrixSlider } from "@/shared/hooks/useBitrixSlider";
import type { Status, TaskProps, User } from "@/shared/types/types";
import { convertNumberFormat } from "@/shared/utils";
import styles from "./ProjectAllTasksModal.module.scss";
import { ProjectTaskCard } from "./ProjectTaskCard";

type Props = {
	open: boolean;
	onClose: () => void;
	projectId: string;
	projectName: string;
	users: User[];
	statuses: Status[];
	reports: ReportProps[];
};

type SortMode = "updated_desc" | "updated_asc" | "title_asc" | "title_desc";

export const ProjectAllTasksModal = ({
	open,
	onClose,
	projectId,
	projectName,
	users,
	statuses,
	reports,
}: Props) => {
	const [tasks, setTasks] = useState<TaskProps[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const [search, setSearch] = useState("");
	const [selectedStatus, setSelectedStatus] = useState("all");
	const [sortMode, setSortMode] = useState<SortMode>("updated_desc");

	const { openTask } = useBitrixSlider();

	useEffect(() => {
		if (!open || !projectId) return;

		const fetchTasks = async () => {
			try {
				setLoading(true);
				setError(null);

				const response = await getItems<TaskProps>(
					EntityTypeIds.tasks,
					{
						[TaskCodes.project]: projectId,
					},
					TASK_SELECT_FIELDS,
				);

				setTasks(response.sort((a, b) => a.stageId.localeCompare(b.stageId)));
			} catch (err) {
				console.error(err);
				setError("Не удалось загрузить задачи проекта");
			} finally {
				setLoading(false);
			}
		};

		fetchTasks();
	}, [open, projectId]);

	const groupedReportTimeByTask = useMemo(() => {
		return reports.reduce(
			(acc, report) => {
				const taskId = String(
					report[ReportCodes.parentId] ?? report[ReportCodes.taskId],
				);

				if (!taskId) return acc;

				acc[taskId] =
					(acc[taskId] || 0) +
					convertNumberFormat(report[ReportCodes.timeSpent]);

				return acc;
			},
			{} as Record<string, number>,
		);
	}, [reports]);

	const filteredTasks = useMemo(() => {
		const prepared = tasks.filter((task) => {
			if (selectedStatus !== "all" && task.stageId !== selectedStatus) {
				return false;
			}

			if (!search.trim()) return true;

			return `${task.title} ${task.id}`
				.toLowerCase()
				.includes(search.toLowerCase());
		});

		const sorted = [...prepared].sort((a, b) => {
			switch (sortMode) {
				case "updated_asc":
					return (
						new Date(a.lastActivityTime).getTime() -
						new Date(b.lastActivityTime).getTime()
					);
				case "title_asc":
					return a.title.localeCompare(b.title);
				case "title_desc":
					return b.title.localeCompare(a.title);
				case "updated_desc":
				default:
					return (
						new Date(b.lastActivityTime).getTime() -
						new Date(a.lastActivityTime).getTime()
					);
			}
		});

		return sorted;
	}, [tasks, selectedStatus, search, sortMode]);

	const totalSpent = useMemo(() => {
		return filteredTasks.reduce((acc, task) => {
			return acc + (groupedReportTimeByTask[String(task.id)] || 0);
		}, 0);
	}, [filteredTasks, groupedReportTimeByTask]);

	return (
		<Modal isOpen={open} onClose={onClose} size="full" innerScroll>
			<div className={styles.wrapper}>
				<div className={styles.header}>
					<div className={styles.headerMain}>
						<div className={styles.badge}>Все задачи проекта</div>
						<h2 className={styles.title}>{projectName}</h2>
						<p className={styles.subtitle}>
							Полный список задач проекта за всё время с поиском и фильтрацией
						</p>
					</div>

					<div className={styles.stats}>
						<div className={styles.statCard}>
							<div className={styles.statValue}>{filteredTasks.length}</div>
							<div className={styles.statLabel}>Задач</div>
						</div>

						<div className={styles.statCard}>
							<div className={styles.statValue}>{totalSpent.toFixed(1)} ч</div>
							<div className={styles.statLabel}>Списано по задачам</div>
						</div>
					</div>
				</div>

				<div className={styles.filters}>
					<input
						className={styles.input}
						placeholder="Поиск по названию или ID задачи"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
					/>

					<select
						className={styles.select}
						value={selectedStatus}
						onChange={(e) => setSelectedStatus(e.target.value)}
					>
						<option value="all">Все статусы</option>
						{statuses.map((status) => (
							<option key={status.STATUS_ID} value={status.STATUS_ID}>
								{status.NAME}
							</option>
						))}
					</select>

					<select
						className={styles.select}
						value={sortMode}
						onChange={(e) => setSortMode(e.target.value as SortMode)}
					>
						<option value="updated_desc">Сначала обновлённые</option>
						<option value="updated_asc">Сначала старые</option>
						<option value="title_asc">Название А-Я</option>
						<option value="title_desc">Название Я-А</option>
					</select>

					<button
						type="button"
						className={styles.closeButton}
						onClick={onClose}
					>
						Закрыть
					</button>
				</div>

				<div className={styles.content}>
					{loading ? (
						<div className={styles.stateBox}>
							<Spinner />
							<div className={styles.stateTitle}>Загрузка задач...</div>
							<div className={styles.stateText}>
								Получаем все задачи проекта. Это может занять немного больше
								времени, чем спринтовая выборка.
							</div>
						</div>
					) : error ? (
						<div className={styles.stateBoxError}>
							<div className={styles.stateTitle}>{error}</div>
							<div className={styles.stateText}>
								Попробуй открыть окно ещё раз
							</div>
						</div>
					) : filteredTasks.length === 0 ? (
						<div className={styles.stateBox}>
							<div className={styles.stateTitle}>Задачи не найдены</div>
							<div className={styles.stateText}>
								Нет задач, подходящих под выбранные фильтры
							</div>
						</div>
					) : (
						<div className={styles.list}>
							{filteredTasks.map((task) => (
								<ProjectTaskCard
									key={task.id}
									task={task}
									estimateTime={task[TaskCodes.estimateTime]}
									timeSpent={groupedReportTimeByTask[String(task.id)] || 0}
									users={users}
									statuses={statuses}
									onClick={() => openTask(task.id)}
								/>
							))}
						</div>
					)}
				</div>
			</div>
		</Modal>
	);
};
