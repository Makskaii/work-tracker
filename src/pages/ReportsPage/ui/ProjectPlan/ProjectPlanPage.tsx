import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { FaArrowLeft, FaSearch, FaUsers } from "react-icons/fa";
import { fetchProjectGanttEvents, fetchProjectGanttStages } from "../SalesPage/model/projectGantt.api";
import { fetchReportProjects } from "../SalesPage/model/projectReports.api";
import { getMonthTicks, getSegmentStyle, getWeekTicks, parseGanttDate } from "../SalesPage/model/ganttUtils";
import type { GanttTimeline } from "../SalesPage/model/ganttTypes";
import type { ProjectGanttEvent, ProjectGanttStage, ReportProject } from "../SalesPage/model/types";
import styles from "./ProjectPlanPage.module.scss";

type ProjectPlanItem = {
	project: ReportProject;
	planEnd: Date | null;
	planStart: Date | null;
	factEnd: Date | null;
	factStart: Date | null;
	stageCount: number;
};

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
		parseGanttDate(project.summaryPlanCompletionDate),
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

export const ProjectPlanPage = () => {
	const [items, setItems] = useState<ProjectPlanItem[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [query, setQuery] = useState("");
	const [showFact, setShowFact] = useState(true);

	useEffect(() => {
		const controller = new AbortController();

		const loadPlan = async () => {
			setIsLoading(true);

			try {
				const projects = await fetchReportProjects(controller.signal);
				const loadedItems = await Promise.all(
					projects.map(async (project) => {
						const [stages, events] = await Promise.all([
							fetchProjectGanttStages(String(project.id), controller.signal),
							fetchProjectGanttEvents(String(project.id), controller.signal),
						]);

						return buildProjectPlanItem(project, stages, events);
					}),
				);

				if (!controller.signal.aborted) {
					setItems(loadedItems);
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

	const timeline = useMemo<GanttTimeline>(() => {
		const dates = visibleItems.flatMap((item) => [
			item.planStart,
			item.planEnd,
			item.factStart,
			item.factEnd,
		]);
		const validDates = dates.filter((date): date is Date => Boolean(date));
		const today = new Date();
		const earliest = validDates.length
			? new Date(Math.min(...validDates.map((date) => date.getTime())))
			: today;
		const latest = validDates.length
			? new Date(Math.max(...validDates.map((date) => date.getTime())))
			: today;
		const start = new Date(earliest.getFullYear(), earliest.getMonth(), earliest.getDate() - 7);
		const end = new Date(latest.getFullYear(), latest.getMonth(), latest.getDate() + 14);

		return {
			end,
			start,
			totalDays: Math.max(Math.round((end.getTime() - start.getTime()) / 86400000), 56),
		};
	}, [visibleItems]);

	const monthTicks = useMemo(() => getMonthTicks(timeline), [timeline]);
	const weekTicks = useMemo(() => getWeekTicks(timeline), [timeline]);
	const todayStyle = getSegmentStyle(new Date(), new Date(), timeline);

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
					<span>Проектов в плане</span>
					<strong>{items.length}</strong>
				</div>
			</header>

			<div className={styles.toolbar}>
				<div className={styles.viewTabs}>
					<button className={styles.activeTab} type="button">Проекты <b>{visibleItems.length}</b></button>
					<button type="button"><FaUsers aria-hidden="true" /> Команда</button>
				</div>
				<label className={styles.search}>
					<FaSearch aria-hidden="true" />
					<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти проект или ответственного" />
				</label>
				<div className={styles.modeControls}>
					<span><i className={styles.planLegend} /> План</span>
					<button className={showFact ? styles.factEnabled : ""} onClick={() => setShowFact((value) => !value)} type="button"><i className={styles.factLegend} /> Факт</button>
				</div>
			</div>

			<div className={styles.planTable}>
				<div className={styles.projectColumnHeader}>Проекты</div>
				<div className={styles.timelineHeader}>
					<div className={styles.months}>{monthTicks.map((tick) => <span key={tick.date.toISOString()} style={tick.style}>{tick.label}</span>)}</div>
					<div className={styles.weeks}>{weekTicks.map((tick) => <span key={tick.date.toISOString()} style={tick.style}>{tick.label}</span>)}</div>
				</div>

				{isLoading ? (
					<div className={styles.empty}>Загружаю план проектов…</div>
				) : visibleItems.length ? (
					visibleItems.map((item, index) => (
						<div className={styles.projectRow} key={item.project.id}>
							<div className={styles.projectInfo}>
								<i style={{ background: getProjectColor(index) }} />
								<div>
									<strong>{item.project.title}</strong>
									<span>{item.project.responsible ?? "Ответственный не назначен"}</span>
									<small>{item.stageCount ? `${item.stageCount} этапов` : "Нет этапов"}</small>
								</div>
							</div>
							<div className={styles.track}>
								{weekTicks.map((tick) => <i className={styles.weekLine} key={tick.date.toISOString()} style={tick.style} />)}
								<i className={styles.todayLine} style={{ left: todayStyle.left }} />
								{item.planStart && item.planEnd ? <span className={styles.planBar} style={getSegmentStyle(item.planStart, item.planEnd, timeline)}>План · {item.project.title}</span> : null}
								{showFact && item.factStart && item.factEnd ? <span className={styles.factBar} style={getSegmentStyle(item.factStart, item.factEnd, timeline)}>Факт по этапам</span> : null}
							</div>
						</div>
					))
				) : (
					<div className={styles.empty}>По этому запросу проектов не найдено.</div>
				)}
			</div>
		</section>
	);
};
