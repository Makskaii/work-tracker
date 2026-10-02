import { useMemo, useState } from "react";
import { CheckPermission } from "@/components/protectedRoute/CheckPermission";
import { EntityTypeIds } from "@/shared/constants/const";
import { useBitrixSlider } from "@/shared/hooks/useBitrixSlider";
import { DevelopmentKanbanBoard } from "./DevelopmentKanbanBoard";
import styles from "./DevelopmentKanbanPage.module.scss";
import {
	buildKanbanLanes,
	getDeadlineState,
	getSprintStatistics,
	UNASSIGNED_LANE_ID,
} from "./model";
import { useKanbanData } from "./useKanbanData";

const SPRINT_STAGE_ID = "DT1072_18:PREPARATION";
const BACKLOG_STAGE_IDS = new Set([
	"DT1072_18:UC_A9IWFS",
	"DT1072_18:NEW",
]);
const formatHours = (hours: number) =>
	new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(hours);

const KanbanWorkspace = () => {
	const { data, loading, isRefreshing, error, updatedAt, refresh } =
		useKanbanData();
	const { openTask } = useBitrixSlider();
	const [query, setQuery] = useState("");
	const [employeeId, setEmployeeId] = useState("");
	const [projectId, setProjectId] = useState("");
	const [showBacklog, setShowBacklog] = useState(false);
	const [onlyOverdue, setOnlyOverdue] = useState(false);
	const [openingError, setOpeningError] = useState<string | null>(null);
	const now = new Date();
	const peopleOptions = useMemo(
		() =>
			data
				? buildKanbanLanes(data.tasks, data.people, {
						sprintStageId: SPRINT_STAGE_ID,
					})
				: [],
		[data],
	);
	const projectOptions = useMemo(() => {
		const projects = new Map<string, string>();
		for (const task of data?.tasks ?? []) {
			if (task.projectId) projects.set(task.projectId, task.projectTitle);
		}
		return [...projects].sort((a, b) => a[1].localeCompare(b[1], "ru"));
	}, [data]);
	const stages = (data?.stages ?? []).filter(
		(stage) =>
			!stage.terminal && (showBacklog || !BACKLOG_STAGE_IDS.has(stage.id)),
	);
	const visibleStageIds = new Set(stages.map((stage) => stage.id));
	const lanes = data
		? buildKanbanLanes(
				data.tasks.filter((task) => visibleStageIds.has(task.stageId)),
				data.people,
				{
					sprintStageId: SPRINT_STAGE_ID,
					employeeId: employeeId || undefined,
					projectId: projectId || undefined,
					query,
					onlyOverdue,
					now,
				},
			)
		: [];
	const visibleTasks = lanes.flatMap((lane) => lane.tasks);
	const sprintTasks = (data?.tasks ?? []).filter(
		(task) =>
			task.stageId === SPRINT_STAGE_ID &&
			(!employeeId || (task.assigneeId ?? UNASSIGNED_LANE_ID) === employeeId) &&
			(!projectId || task.projectId === projectId),
	);
	const { sprintProjects, sprintHours, missingEstimates } = getSprintStatistics(
		sprintTasks,
		SPRINT_STAGE_ID,
	);
	const overdueCount = visibleTasks.filter(
		(task) =>
			getDeadlineState(task.deadline, now) === "overdue" ||
			getDeadlineState(task.redline ?? null, now) === "overdue",
	).length;
	const openCard = async (id: string) => {
		setOpeningError(null);
		try {
			await openTask(id, EntityTypeIds.tasks);
		} catch {
			setOpeningError("Не удалось открыть задачу. Повторите попытку.");
		}
	};
	const reload = () => {
		setOpeningError(null);
		refresh();
	};

	return (
		<div className={styles.page}>
			<header className={styles.header}>
				<div>
					<h1>Канбан разработки</h1>
					<p className={styles.subtitle}>
						Меньшее число приоритета — выше задача в списке.
					</p>
				</div>
				<div className={styles.refresh}>
					<button
						type="button"
						onClick={reload}
						disabled={loading || isRefreshing}
					>
						{isRefreshing ? "Обновляется…" : "Обновить"}
					</button>
					<span>
						{updatedAt
							? `Обновлено ${updatedAt.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Moscow" })}`
							: "Загрузка из Битрикс24"}
					</span>
				</div>
			</header>
			{data && (
				<section className={styles.summary} aria-label="Загрузка спринта">
					<div>
						<span>Всего в спринте</span>
						<strong>{sprintTasks.length} задач</strong>
					</div>
					<div>
						<span>Проектов в спринте</span>
						<strong>{sprintProjects}</strong>
					</div>
					<div>
						<span>Оценка спринта</span>
						<strong>
							{sprintHours === null
								? "Не задана"
								: `${formatHours(sprintHours)} ч`}
						</strong>
						{missingEstimates > 0 && (
							<small>Без оценки: {missingEstimates}</small>
						)}
					</div>
					<div>
						<span>Просрочено на доске</span>
						<strong className={overdueCount ? styles.danger : undefined}>
							{overdueCount}
						</strong>
					</div>
				</section>
			)}
			<section className={styles.filters} aria-label="Фильтры канбана">
				<label className={styles.search}>
					<span>Поиск</span>
					<input
						type="search"
						placeholder="Задача или проект"
						value={query}
						onChange={(event) => setQuery(event.target.value)}
					/>
				</label>
				<label>
					<span>Сотрудник</span>
					<select
						value={employeeId}
						onChange={(event) => setEmployeeId(event.target.value)}
					>
						<option value="">Все сотрудники</option>
						{peopleOptions.map((person) => (
							<option key={person.id} value={person.id}>
								{person.name}
							</option>
						))}
					</select>
				</label>
				<label>
					<span>Проект</span>
					<select
						value={projectId}
						onChange={(event) => setProjectId(event.target.value)}
					>
						<option value="">Все проекты</option>
						{projectOptions.map(([id, title]) => (
							<option key={id} value={id}>
								{title}
							</option>
						))}
					</select>
				</label>
				<label className={styles.toggle}>
					<input
						type="checkbox"
						checked={showBacklog}
						onChange={(event) => setShowBacklog(event.target.checked)}
					/>
					<span>Бэклог и несформированные</span>
				</label>
				<label className={styles.toggle}>
					<input
						type="checkbox"
						checked={onlyOverdue}
						onChange={(event) => setOnlyOverdue(event.target.checked)}
					/>
					<span>Только просроченные</span>
				</label>
			</section>
			{(error || openingError) && (
				<div role="alert" className={styles.error}>
					<span>
						{openingError ??
							(data
								? "Не удалось обновить данные. На доске сохранена предыдущая загрузка."
								: "Не удалось загрузить канбан из Битрикс24.")}
					</span>
					<button
						type="button"
						onClick={reload}
						disabled={loading || isRefreshing}
					>
						Повторить
					</button>
				</div>
			)}
			{loading && !data ? (
				<div className={styles.initialLoading}>
					Загружаем задачи, стадии и сотрудников…
				</div>
			) : (
				data && (
					<>
						<div className={styles.boardHint}>
							<span>
								На доске: {visibleTasks.length} задач. Нажмите карточку, чтобы
								открыть задачу в Битрикс24.
							</span>
							<span>
								Красное подчёркивание — срок прошёл · жёлтый — сегодня
							</span>
						</div>
						{visibleTasks.length === 0 && (
							<p className={styles.empty} role="status">
								По выбранным фильтрам задач нет.
							</p>
						)}
						<DevelopmentKanbanBoard
							stages={stages}
							lanes={lanes}
							onOpenTask={(id) => void openCard(id)}
							now={now}
						/>
					</>
				)
			)}
		</div>
	);
};

export const DevelopmentKanbanPage = () => (
	<CheckPermission permission="read" subject="post">
		<KanbanWorkspace />
	</CheckPermission>
);
