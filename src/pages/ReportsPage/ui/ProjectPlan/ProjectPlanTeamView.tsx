import { useMemo, useState } from "react";
import type { User } from "@/shared/types/types";
import { getMonthTicks, getSegmentStyle, getWeekTicks } from "../SalesPage/model/ganttUtils";
import type { GanttTimeline } from "../SalesPage/model/ganttTypes";
import { getProjectMemberIds, getProjectTeamRole, PROJECT_TEAM_ROLE_LABELS, type ProjectTeamRole } from "../SalesPage/model/projectTeam";
import type { ReportProject } from "../SalesPage/model/types";
import styles from "./ProjectPlanPage.module.scss";

export type TeamProjectPlanItem = {
	project: ReportProject;
	planEnd: Date | null;
	planStart: Date | null;
	factEnd: Date | null;
	factStart: Date | null;
	stageCount: number;
};

type TeamMember = { user: User; role: ProjectTeamRole; assignments: TeamProjectPlanItem[] };
type PositionedAssignment = TeamProjectPlanItem & { lane: number };

const DAY_MS = 86_400_000;
const ROLE_ORDER: ProjectTeamRole[] = ["pm", "analytics", "development", "qa", "unknown"];
const PROJECT_COLORS = ["#66d4ea", "#ef995c", "#60cf86", "#e9708e", "#a88af4"];
const normalizeId = (value: string | number | null | undefined) => String(value ?? "").trim();
const getEmployeeWord = (count: number) => {
	const lastTwoDigits = count % 100;
	const lastDigit = count % 10;
	if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return "сотрудников";
	if (lastDigit === 1) return "сотрудник";
	if (lastDigit >= 2 && lastDigit <= 4) return "сотрудника";
	return "сотрудников";
};

const getInitials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
const getProjectColor = (projectId: number) => PROJECT_COLORS[Math.abs(projectId) % PROJECT_COLORS.length];
const formatMoney = (value: number | null) => value == null ? "Сумма не указана" : new Intl.NumberFormat("ru-RU", { currency: "RUB", maximumFractionDigits: 0, style: "currency" }).format(value);
const formatShortDate = (date: Date) => new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit" }).format(date);
const overlapsTimeline = (item: TeamProjectPlanItem, timeline: GanttTimeline) => Boolean(item.planStart && item.planEnd && item.planEnd >= timeline.start && item.planStart <= timeline.end);

const positionAssignments = (assignments: TeamProjectPlanItem[], timeline: GanttTimeline) => {
	const laneEnds: Date[] = [];
	const positioned = assignments
		.filter((item) => overlapsTimeline(item, timeline))
		.toSorted((first, second) => (first.planStart?.getTime() ?? 0) - (second.planStart?.getTime() ?? 0))
		.map((assignment): PositionedAssignment => {
			const start = assignment.planStart as Date;
			const end = assignment.planEnd as Date;
			let lane = laneEnds.findIndex((laneEnd) => laneEnd < start);
			if (lane === -1) lane = laneEnds.length;
			laneEnds[lane] = end;
			return { ...assignment, lane };
		});

	return { assignments: positioned, laneCount: Math.max(laneEnds.length, 1) };
};

const getMergedPlanRanges = (assignments: TeamProjectPlanItem[], timeline: GanttTimeline) => {
	const ranges = assignments
		.filter((item) => overlapsTimeline(item, timeline))
		.map((item) => ({ end: new Date(Math.min((item.planEnd as Date).getTime(), timeline.end.getTime())), start: new Date(Math.max((item.planStart as Date).getTime(), timeline.start.getTime())) }))
		.toSorted((first, second) => first.start.getTime() - second.start.getTime());

	return ranges.reduce<Array<{ start: Date; end: Date }>>((merged, range) => {
		const previous = merged.at(-1);
		if (!previous || range.start.getTime() > previous.end.getTime() + DAY_MS) merged.push(range);
		else if (range.end > previous.end) previous.end = range.end;
		return merged;
	}, []);
};

const getFreeRanges = (assignments: TeamProjectPlanItem[], timeline: GanttTimeline) => {
	const free: Array<{ start: Date; end: Date }> = [];
	let cursor = timeline.start;
	getMergedPlanRanges(assignments, timeline).forEach((range) => {
		if (range.start.getTime() - cursor.getTime() >= 7 * DAY_MS) free.push({ end: new Date(range.start.getTime() - DAY_MS), start: cursor });
		cursor = new Date(Math.max(cursor.getTime(), range.end.getTime() + DAY_MS));
	});
	if (timeline.end.getTime() - cursor.getTime() >= 7 * DAY_MS) free.push({ end: timeline.end, start: cursor });
	return free;
};

const getLoadPercent = (assignments: TeamProjectPlanItem[], timeline: GanttTimeline) => {
	const occupiedDays = getMergedPlanRanges(assignments, timeline).reduce((total, range) => total + Math.max(1, Math.round((range.end.getTime() - range.start.getTime()) / DAY_MS) + 1), 0);
	return Math.min(100, Math.round((occupiedDays / Math.max(timeline.totalDays, 1)) * 100));
};

export const ProjectPlanTeamView = ({ activeRole, items, query, showFact, timeline, users }: { activeRole: ProjectTeamRole | "all"; items: TeamProjectPlanItem[]; query: string; showFact: boolean; timeline: GanttTimeline; users: User[] }) => {
	const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
	const [freeOnly, setFreeOnly] = useState(false);
	const teamMembers = useMemo(() => {
		const usersById = new Map(users.map((user) => [normalizeId(user.id), user]));
		const assignmentsByUserId = new Map<string, TeamProjectPlanItem[]>();
		items.forEach((item) => Array.from(new Set(getProjectMemberIds(item.project))).forEach((userId) => {
			if (usersById.has(userId)) assignmentsByUserId.set(userId, [...(assignmentsByUserId.get(userId) ?? []), item]);
		}));

		return Array.from(assignmentsByUserId.entries()).map(([userId, assignments]) => {
			const user = usersById.get(userId);
			return user ? { assignments, role: getProjectTeamRole(user), user } : null;
		}).filter((member): member is TeamMember => Boolean(member)).toSorted((first, second) => first.user.title.localeCompare(second.user.title, "ru"));
	}, [items, users]);

	const normalizedQuery = query.trim().toLocaleLowerCase("ru");
	const visibleMembers = teamMembers.filter((member) => {
		const assignments = selectedProjectId == null ? member.assignments : member.assignments.filter((item) => item.project.id === selectedProjectId);
		const matchesQuery = !normalizedQuery || [member.user.title, member.user.position, ...assignments.map((item) => item.project.title)].filter(Boolean).some((value) => value.toLocaleLowerCase("ru").includes(normalizedQuery));
		return assignments.length > 0 && (activeRole === "all" || member.role === activeRole) && matchesQuery && (!freeOnly || getFreeRanges(assignments, timeline).length > 0);
	});
	const monthTicks = useMemo(() => getMonthTicks(timeline), [timeline]);
	const weekTicks = useMemo(() => getWeekTicks(timeline), [timeline]);
	const today = useMemo(() => { const value = new Date(); value.setHours(0, 0, 0, 0); return value; }, []);
	const todayStyle = getSegmentStyle(today, today, timeline);

	return <>
		<div className={styles.projectStrip}>
			<button className={selectedProjectId == null ? styles.selectedProjectCard : ""} onClick={() => setSelectedProjectId(null)} type="button"><strong>Все проекты</strong><span>Вся проектная команда</span><b>{items.length}</b></button>
			{items.map((item) => <button className={selectedProjectId === item.project.id ? styles.selectedProjectCard : ""} key={item.project.id} onClick={() => setSelectedProjectId(item.project.id)} type="button"><i style={{ background: getProjectColor(item.project.id) }} /><strong>{item.project.title}</strong><b>{formatMoney(item.project.projectAmount)}</b><span>{item.project.responsible ?? "Ответственный не назначен"}</span><small>{item.stageCount} этапов · до {item.planEnd ? formatShortDate(item.planEnd) : "—"}</small></button>)}
		</div>
		<div className={styles.teamViewOptions}><label><input checked={freeOnly} onChange={(event) => setFreeOnly(event.target.checked)} type="checkbox" /> Есть свободное время</label><span><i className={styles.freeLegend} /> Свободно</span><span><i className={styles.todayLegend} /> Сегодня</span></div>
		<div className={styles.teamTable}>
			<div className={styles.teamColumnHeader}>Команда <span>{visibleMembers.length} {getEmployeeWord(visibleMembers.length)}</span></div>
			<div className={styles.timelineHeader}><div className={styles.months}>{monthTicks.map((tick) => <span key={tick.date.toISOString()} style={tick.style}>{tick.label}</span>)}</div><div className={styles.weeks}>{weekTicks.map((tick) => <span key={tick.date.toISOString()} style={tick.style}>{tick.label}</span>)}</div></div>
			{ROLE_ORDER.map((role) => {
				const members = visibleMembers.filter((member) => member.role === role);
				if (!members.length) return null;
				return <div className={styles.teamRoleGroup} key={role}><div className={styles.teamSectionHeader}>{PROJECT_TEAM_ROLE_LABELS[role]} <b>{members.length}</b></div>{members.map((member) => {
					const assignments = selectedProjectId == null ? member.assignments : member.assignments.filter((item) => item.project.id === selectedProjectId);
					const positioned = positionAssignments(assignments, timeline);
					const freeRanges = getFreeRanges(assignments, timeline);
					const load = getLoadPercent(assignments, timeline);
					const rowHeight = Math.max(92, positioned.laneCount * 38 + 42);
					return <div className={styles.teamRow} key={member.user.id}>
						<div className={styles.teamInfo}>{member.user.photo ? <img alt="" className={styles.teamAvatar} src={member.user.photo} /> : <span className={styles.teamAvatar}>{getInitials(member.user.title)}</span>}<div><strong>{member.user.title}</strong><span>{member.user.position || PROJECT_TEAM_ROLE_LABELS[member.role]}</span><small>{assignments.map((item) => item.project.title).join(" · ")}</small></div><b className={`${styles.loadBadge} ${load >= 90 ? styles.loadHigh : load >= 65 ? styles.loadMedium : styles.loadLow}`}>{load}%</b></div>
						<div className={styles.teamTrack} style={{ minHeight: rowHeight }}>{weekTicks.map((tick) => <i className={styles.weekLine} key={tick.date.toISOString()} style={tick.style} />)}<i className={styles.todayLine} style={{ left: todayStyle.left }} />{positioned.assignments.map((assignment) => <div className={styles.teamAssignment} key={assignment.project.id} style={{ top: 8 + assignment.lane * 38 }}>{assignment.planStart && assignment.planEnd ? <span className={styles.planBar} style={getSegmentStyle(assignment.planStart, assignment.planEnd, timeline)}>План · {assignment.project.title}</span> : null}{showFact && assignment.factStart && assignment.factEnd ? <span className={styles.factBar} style={getSegmentStyle(assignment.factStart, assignment.factEnd, timeline)}>Факт</span> : null}</div>)}{freeRanges.map((range) => <span className={styles.freeRange} key={range.start.toISOString()} style={{ ...getSegmentStyle(range.start, range.end, timeline), top: 12 + positioned.laneCount * 38 }}>+ свободно {formatShortDate(range.start)}–{formatShortDate(range.end)}</span>)}</div>
					</div>;
				})}</div>;
			})}
			{!visibleMembers.length ? <div className={styles.empty}>По выбранным условиям сотрудников не найдено.</div> : null}
		</div>
	</>;
};
