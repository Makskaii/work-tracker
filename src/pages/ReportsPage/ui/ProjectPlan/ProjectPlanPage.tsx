import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { FaArrowLeft, FaSearch, FaUsers } from "react-icons/fa";
import { getUsers } from "../../api/getUsers";
import type { User } from "@/shared/types/types";
import { fetchProjectGanttEvents, fetchProjectGanttStages } from "../SalesPage/model/projectGantt.api";
import { fetchReportProjects } from "../SalesPage/model/projectReports.api";
import { PROJECT_TEAM_ROLE_LABELS, type ProjectTeamRole } from "../SalesPage/model/projectTeam";
import { getMonthTicks, getSegmentStyle, getWeekTicks, parseGanttDate } from "../SalesPage/model/ganttUtils";
import type { GanttTimeline } from "../SalesPage/model/ganttTypes";
import type { ProjectGanttEvent, ProjectGanttStage, ReportProject } from "../SalesPage/model/types";
import { getProjectMemberIds } from "../SalesPage/model/projectTeam";
import { getProjectPlannedEndDate, isProjectReportProject } from "../SalesPage/model/reportProjectForm";
import { ProjectPlanTeamView } from "./ProjectPlanTeamView";
import styles from "./ProjectPlanPage.module.scss";

type ProjectPlanItem = {
	project: ReportProject;
	planEnd: Date | null;
	planStart: Date | null;
	factEnd: Date | null;
	factStart: Date | null;
	stageCount: number;
};

type ProjectPlanStatus = "factNow" | "planNow" | "planned";

const getDateMin = (dates: Array<Date | null>) => {
	const availableDates = dates.filter((date): date is Date => Boolean(date));

	return availableDates.length
		? new Date(Math.min(...availableDates.map((date) => date.getTime())))
		: null;
};

const getDateMax = (dates: Array<Date | null>) => {
	const availableDates = dates.filter((date): date is Date => Boolean(date));

	return availableDates.length
		? new Date(Math.max(...availableDates.map((date) => date.getTime())))
		: null;
};

const buildProjectPlanItem = (
	project: ReportProject,
	stages: ProjectGanttStage[],
	events: ProjectGanttEvent[],
): ProjectPlanItem => {
	const stageIds = new Set(stages.filter((stage) => !stage.isGroup).map(({ id }) => id));
	const projectEvents = events.filter((event) => stageIds.has(event.stageId));

	const planStart = getDateMin([
		...projectEvents.map((event) => parseGanttDate(event.planStartDate)),
		parseGanttDate(project.projectStartDate),
	]);
	const planEnd = getDateMax([
		...projectEvents.map((event) => parseGanttDate(event.planEndDate)),
		parseGanttDate(getProjectPlannedEndDate(project)),
		parseGanttDate(project.deadline),
	]);
	const factStart = getDateMin(
		projectEvents.map((event) => parseGanttDate(event.factStartDate)),
	);
	const factEnd = getDateMax([
		...projectEvents.map((event) => parseGanttDate(event.factEndDate)),
		parseGanttDate(project.summaryFactCompletionDate),
	]);

	return {
		factEnd,
		factStart,
		planEnd,
		planStart,
		project,
		stageCount: stageIds.size,
	};
};

const getProjectColor = (index: number) =>
	["#66d4ea", "#ef995c", "#60cf86", "#e9708e", "#a88af4"][index % 5];

const isDateWithinRange = (date: Date, start: Date | null, end: Date | null) =>
	Boolean(start && start <= date && (!end || end >= date));

const getProjectPlanStatus = (item: ProjectPlanItem, today: Date): ProjectPlanStatus => {
	if (isDateWithinRange(today, item.factStart, item.factEnd)) {
		return "factNow";
	}

	if (!item.factStart && !item.factEnd && isDateWithinRange(today, item.planStart, item.planEnd)) {
		return "planNow";
	}

	return "planned";
};

const formatShortDate = (date: Date | null) =>
	date
		? new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit" }).format(date)
		: "без даты";

export const ProjectPlanPage = () => {
	const [items, setItems] = useState<ProjectPlanItem[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [query, setQuery] = useState("");
	const [showFact, setShowFact] = useState(true);
	const [users, setUsers] = useState<User[]>([]);
	const [viewMode, setViewMode] = useState<"projects" | "team">("projects");
	const [teamRole, setTeamRole] = useState<ProjectTeamRole | "all">("all");
	const today = useMemo(() => {
		const value = new Date();
		value.setHours(0, 0, 0, 0);

		return value;
	}, []);

	useEffect(() => {
		const controller = new AbortController();

		const loadPlan = async () => {
			setIsLoading(true);

			try {
				const [projects, bitrixUsers] = await Promise.all([
					fetchReportProjects(controller.signal),
					getUsers(controller.signal),
				]);
				const loadedItems = await Promise.all(
					projects.filter(isProjectReportProject).map(async (project) => {
						const [stages, events] = await Promise.all([
							fetchProjectGanttStages(String(project.id), controller.signal),
							fetchProjectGanttEvents(String(project.id), controller.signal),
						]);

						return buildProjectPlanItem(project, stages, events);
					}),
				);

				if (!controller.signal.aborted) {
					setItems(loadedItems);
					setUsers(
						bitrixUsers.map((user) => ({
							department: user.UF_DEPARTMENT[0],
							id: user.ID,
							photo: user.PERSONAL_PHOTO,
							position: user.WORK_POSITION,
							title: `${user.NAME} ${user.LAST_NAME}`.trim(),
							value: `${user.NAME} ${user.LAST_NAME}`.trim(),
						})),
					);
				}
			} catch (error) {
				if (!controller.signal.aborted) {
					console.error("Failed to load project plan", error);
				}
			} finally {
				if (!controller.signal.aborted) {
					setIsLoading(false);
				}
			}
		};

		loadPlan();

		return () => controller.abort();
	}, []);

	const visibleItems = useMemo(() => {
		const normalizedQuery = query.trim().toLocaleLowerCase("ru");

		if (!normalizedQuery) return items;

		return items.filter(({ project }) =>
			[project.title, project.clientCompany, project.responsible]
				.filter(Boolean)
				.some((value) => value?.toLocaleLowerCase("ru").includes(normalizedQuery)),
		);
	}, [items, query]);
	const groupedItems = useMemo(() => {
		const groups: Record<ProjectPlanStatus, ProjectPlanItem[]> = {
			factNow: [],
			planNow: [],
			planned: [],
		};

		visibleItems.forEach((item) => {
			groups[getProjectPlanStatus(item, today)].push(item);
		});
		groups.planned.sort(
			(first, second) =>
				(first.planStart?.getTime() ?? Number.MAX_SAFE_INTEGER) -
				(second.planStart?.getTime() ?? Number.MAX_SAFE_INTEGER),
		);

		return groups;
	}, [today, visibleItems]);
	const teamStats = useMemo(() => {
		const knownUserIds = new Set(users.map((user) => String(user.id)));
		const teamIds = new Set(items.flatMap((item) => getProjectMemberIds(item.project)).filter((id) => knownUserIds.has(id)));
		const busyIds = new Set(items.filter((item) => isDateWithinRange(today, item.planStart, item.planEnd)).flatMap((item) => getProjectMemberIds(item.project)));

		return {
			free: Array.from(teamIds).filter((id) => !busyIds.has(id)).length,
			total: teamIds.size,
		};
	}, [items, today, users]);

	const timelineItems = viewMode === "team" ? items : visibleItems;
	const timeline = useMemo<GanttTimeline>(() => {
		if (viewMode === "team") {
			const start = new Date(today);
			start.setDate(start.getDate() - 28);
			const end = new Date(today);
			end.setDate(end.getDate() + 112);

			return { end, start, totalDays: 140 };
		}

		const dates = timelineItems.flatMap((item) => [
			item.planStart,
			item.planEnd,
			item.factStart,
			item.factEnd,
		]);
		const validDates = dates.filter((date): date is Date => Boolean(date));
		const fallbackDate = new Date();
		const earliest = validDates.length
			? new Date(Math.min(...validDates.map((date) => date.getTime())))
			: fallbackDate;
		const latest = validDates.length
			? new Date(Math.max(...validDates.map((date) => date.getTime())))
			: fallbackDate;
		const start = new Date(earliest.getFullYear(), earliest.getMonth(), earliest.getDate() - 7);
		const end = new Date(latest.getFullYear(), latest.getMonth(), latest.getDate() + 14);

		return {
			end,
			start,
			totalDays: Math.max(Math.round((end.getTime() - start.getTime()) / 86400000), 56),
		};
	}, [timelineItems, today, viewMode]);

	const monthTicks = useMemo(() => getMonthTicks(timeline), [timeline]);
	const weekTicks = useMemo(() => getWeekTicks(timeline), [timeline]);
	const todayStyle = getSegmentStyle(today, today, timeline);
	const currentItems = [...groupedItems.factNow, ...groupedItems.planNow];
	const getStatusBadge = (item: ProjectPlanItem) => {
		const status = getProjectPlanStatus(item, today);

		if (status === "factNow") return { className: styles.factNow, label: "Факт сейчас" };
		if (status === "planNow") return { className: styles.planNow, label: "В плане сейчас" };

		return { className: styles.planned, label: `Старт ${formatShortDate(item.planStart)}` };
	};
	const renderProjectRow = (item: ProjectPlanItem, index: number) => {
		const status = getStatusBadge(item);

		return (
			<div className={styles.projectRow} key={item.project.id}>
				<div className={styles.projectInfo}>
					<i style={{ background: getProjectColor(index) }} />
					<div>
						<strong>{item.project.title}</strong>
						<span>{item.project.responsible ?? "Ответственный не назначен"}</span>
						<small>{item.stageCount ? `${item.stageCount} этапов` : "Нет этапов"}</small>
					</div>
					<b className={`${styles.statusBadge} ${status.className}`}>{status.label}</b>
				</div>
				<div className={styles.track}>
					{weekTicks.map((tick) => <i className={styles.weekLine} key={tick.date.toISOString()} style={tick.style} />)}
					<i className={styles.todayLine} style={{ left: todayStyle.left }} />
					{item.planStart && item.planEnd ? <span className={styles.planBar} style={getSegmentStyle(item.planStart, item.planEnd, timeline)}>План · {item.project.title}</span> : null}
					{showFact && item.factStart && item.factEnd ? <span className={styles.factBar} style={getSegmentStyle(item.factStart, item.factEnd, timeline)}>Факт по этапам</span> : null}
				</div>
			</div>
		);
	};

	return (
		<section className={styles.page}>
			<header className={styles.header}>
				<Link className={styles.backButton} to="/reports/profitability">
					<FaArrowLeft aria-hidden="true" />
					Вернуться к отчёту
				</Link>
				<div className={styles.heading}>
					<h1>План проектов</h1>
					<p>Общий план и факт по актуальным проектам.</p>
				</div>
				<div className={styles.summary}>
					<span>{viewMode === "team" ? "Свободны сейчас" : "Проектов в плане"}</span>
					<strong>{viewMode === "team" ? `${teamStats.free} из ${teamStats.total}` : items.length}</strong>
					{viewMode === "team" ? <small>сотрудников проектной команды</small> : null}
				</div>
			</header>

			<div className={styles.toolbar}>
				<div className={styles.viewTabs}>
					<button className={viewMode === "projects" ? styles.activeTab : ""} onClick={() => setViewMode("projects")} type="button">Проекты <b>{items.length}</b></button>
					<button className={viewMode === "team" ? styles.activeTab : ""} onClick={() => setViewMode("team")} type="button"><FaUsers aria-hidden="true" /> Команда</button>
				</div>
				<label className={styles.search}>
					<FaSearch aria-hidden="true" />
					<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={viewMode === "team" ? "Найти сотрудника или проект" : "Найти проект или ответственного"} />
				</label>
				{viewMode === "team" ? <div className={styles.teamFilters}><button className={teamRole === "all" ? styles.activeTeamFilter : ""} onClick={() => setTeamRole("all")} type="button">Все</button>{(["analytics", "development", "qa", "pm"] as ProjectTeamRole[]).map((role) => <button className={teamRole === role ? styles.activeTeamFilter : ""} key={role} onClick={() => setTeamRole(role)} type="button">{PROJECT_TEAM_ROLE_LABELS[role]}</button>)}</div> : null}
				<div className={styles.modeControls}>
					<span><i className={styles.planLegend} /> План</span>
					<button className={showFact ? styles.factEnabled : ""} onClick={() => setShowFact((value) => !value)} type="button"><i className={styles.factLegend} /> Факт</button>
				</div>
			</div>

			{isLoading ? (
				<div className={styles.empty}>Загружаю план проектов…</div>
			) : viewMode === "team" ? (
				<ProjectPlanTeamView activeRole={teamRole} items={items} query={query} showFact={showFact} timeline={timeline} users={users} />
			) : <div className={styles.planTable}>
				<div className={styles.projectColumnHeader}>Проекты</div>
				<div className={styles.timelineHeader}>
					<div className={styles.months}>{monthTicks.map((tick) => <span key={tick.date.toISOString()} style={tick.style}>{tick.label}</span>)}</div>
					<div className={styles.weeks}>{weekTicks.map((tick) => <span key={tick.date.toISOString()} style={tick.style}>{tick.label}</span>)}</div>
				</div>

				{visibleItems.length ? (
					<>
						{currentItems.length ? <div className={styles.sectionHeader}>Сейчас в работе <b>{currentItems.length}</b></div> : null}
						{groupedItems.factNow.map((item, index) => renderProjectRow(item, index))}
						{groupedItems.planNow.map((item, index) => renderProjectRow(item, groupedItems.factNow.length + index))}
						{groupedItems.planned.length ? <div className={styles.sectionHeader}>Запланировано дальше <b>{groupedItems.planned.length}</b></div> : null}
						{groupedItems.planned.map((item, index) => renderProjectRow(item, currentItems.length + index))}
					</>
				) : (
					<div className={styles.empty}>По этому запросу проектов не найдено.</div>
				)}
			</div>}
		</section>
	);
};
