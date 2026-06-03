import type { CSSProperties } from "react";
import { ProjectGanttCodes } from "./constants";
import type {
	GanttDayTick,
	GanttMonthTick,
	GanttRow,
	GanttStage,
	GanttTimeline,
	GanttWeekTick,
} from "./ganttTypes";
import { toNumber } from "./profitabilityUtils";
import type { ProfitabilityProject } from "./types";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export const parseGanttDate = (value: unknown) => {
	if (!value) return null;

	const rawValue = Array.isArray(value) ? value[0] : value;
	const rawString = String(rawValue).trim();

	if (!rawString) return null;

	const isoMatch = rawString.match(/^(\d{4})-(\d{2})-(\d{2})/);

	if (isoMatch) {
		return new Date(
			Number(isoMatch[1]),
			Number(isoMatch[2]) - 1,
			Number(isoMatch[3]),
		);
	}

	const ruMatch = rawString.match(/^(\d{2})\.(\d{2})\.(\d{4})/);

	if (ruMatch) {
		return new Date(
			Number(ruMatch[3]),
			Number(ruMatch[2]) - 1,
			Number(ruMatch[1]),
		);
	}

	const date = new Date(rawString);

	if (Number.isNaN(date.getTime())) return null;

	return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

export const addDays = (date: Date, days: number) =>
	new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

const addWeeks = (date: Date | null, weeks: unknown) => {
	if (!date) return null;

	const parsedWeeks = toNumber(weeks);

	if (parsedWeeks <= 0) return null;

	return addDays(date, Math.round(parsedWeeks * 7));
};

export const daysBetween = (start: Date, end: Date) =>
	Math.round((end.getTime() - start.getTime()) / MS_PER_DAY);

export const formatDateShort = (date: Date | null) =>
	date
		? new Intl.DateTimeFormat("ru-RU", {
				day: "2-digit",
				month: "2-digit",
			}).format(date)
		: "—";

export const formatDateFull = (date: Date | null) =>
	date ? new Intl.DateTimeFormat("ru-RU").format(date) : "—";

export const formatDeviation = (days: number | null) => {
	if (days === null) return "—";
	if (days === 0) return "0 дн.";

	return `${days > 0 ? "+" : ""}${days} дн.`;
};

export const getDateMax = (...dates: Array<Date | null>) => {
	const validDates = dates.filter((date): date is Date => Boolean(date));

	if (!validDates.length) return null;

	return new Date(Math.max(...validDates.map((date) => date.getTime())));
};

export const getDateMin = (...dates: Array<Date | null>) => {
	const validDates = dates.filter((date): date is Date => Boolean(date));

	if (!validDates.length) return null;

	return new Date(Math.min(...validDates.map((date) => date.getTime())));
};

const getStagePlanEnd = (
	planStart: Date | null,
	weeks: unknown,
	fallback: Date | null,
) => addWeeks(planStart, weeks) ?? fallback;

const shiftDependentDate = (date: Date | null, shiftDays: number) =>
	date && shiftDays !== 0 ? addDays(date, shiftDays) : date;

export const getStageStatus = (stage: GanttStage, today: Date) => {
	if (!stage.planStart || !stage.planEnd) return "Нет данных";

	if (!stage.factEnd) {
		return today > stage.planEnd
			? "Просрочен, факт не закрыт"
			: "Ожидает завершения";
	}

	const deviation = daysBetween(stage.planEnd, stage.factEnd);

	if (deviation > 0) return "Просрочен";
	if (deviation < 0) return "Завершён раньше плана";

	return "В срок";
};

export const getStageDeviation = (stage: GanttStage, today: Date) => {
	if (!stage.planEnd) return null;
	if (stage.factEnd) return daysBetween(stage.planEnd, stage.factEnd);
	if (today > stage.planEnd) return daysBetween(stage.planEnd, today);

	return null;
};

export const buildProjectGantt = (
	project: ProfitabilityProject | null,
	today: Date,
) => {
	const tzStart = parseGanttDate(project?.[ProjectGanttCodes.ganttTzStart]);
	const tzPlanEnd = getStagePlanEnd(
		tzStart,
		project?.[ProjectGanttCodes.ganttTzWeeks],
		parseGanttDate(project?.[ProjectGanttCodes.ganttTzPlanEnd]),
	);
	const tzFactEnd = parseGanttDate(project?.[ProjectGanttCodes.ganttTzFactEnd]);
	const rootShiftDays =
		tzPlanEnd && tzFactEnd ? daysBetween(tzPlanEnd, tzFactEnd) : 0;
	const tzSignDate = parseGanttDate(
		project?.[ProjectGanttCodes.ganttTzSignDate],
	);

	const developmentPlanStart =
		tzSignDate ??
		tzFactEnd ??
		tzPlanEnd ??
		shiftDependentDate(
			parseGanttDate(project?.[ProjectGanttCodes.ganttDevPlanStart]),
			rootShiftDays,
		);
	const developmentPlanEnd = getStagePlanEnd(
		developmentPlanStart,
		project?.[ProjectGanttCodes.ganttDevWeeks],
		shiftDependentDate(
			parseGanttDate(project?.[ProjectGanttCodes.ganttDevPlanEnd]),
			rootShiftDays,
		),
	);
	const developmentFactStart = parseGanttDate(
		project?.[ProjectGanttCodes.ganttDevFactStart],
	);
	const developmentFactEnd = parseGanttDate(
		project?.[ProjectGanttCodes.ganttDevFactEnd],
	);

	const educationPlanStart =
		developmentFactEnd ??
		developmentPlanEnd ??
		shiftDependentDate(
			parseGanttDate(project?.[ProjectGanttCodes.ganttEducationPlanStart]),
			rootShiftDays,
		);
	const educationPlanEnd = getStagePlanEnd(
		educationPlanStart,
		project?.[ProjectGanttCodes.ganttEducationWeeks],
		shiftDependentDate(
			parseGanttDate(project?.[ProjectGanttCodes.ganttEducationPlanEnd]),
			rootShiftDays,
		),
	);
	const educationFactStart = parseGanttDate(
		project?.[ProjectGanttCodes.ganttEducationFactStart],
	);
	const educationFactEnd = parseGanttDate(
		project?.[ProjectGanttCodes.ganttEducationFactEnd],
	);
	const closeDate = parseGanttDate(project?.[ProjectGanttCodes.ganttCloseDate]);

	const stages: GanttStage[] = [
		{
			id: "tz",
			title: "Написание ТЗ",
			description: "Подготовка технического задания",
			planStart: tzStart,
			planEnd: tzPlanEnd,
			factStart: tzStart,
			factEnd: tzFactEnd,
		},
		{
			id: "development",
			title: "Разработка",
			description: "Реализация и внутренняя проверка",
			planStart: developmentPlanStart,
			planEnd: developmentPlanEnd,
			factStart: developmentFactStart,
			factEnd: developmentFactEnd,
		},
		{
			id: "education",
			title: "Обучение / сдача",
			description: "Передача результата и обучение",
			planStart: educationPlanStart,
			planEnd: educationPlanEnd,
			factStart: educationFactStart,
			factEnd: educationFactEnd,
		},
	];

	const milestones = [
		{
			id: "tzSign" as const,
			title: "Подписание ТЗ",
			description: "Контрольная точка между ТЗ и разработкой",
			date: tzSignDate,
			color: "warning" as const,
		},
		{
			id: "close" as const,
			title: "Закрытие проекта",
			description: "Акт / закрытие",
			date: closeDate,
			color: "accent" as const,
		},
	];

	const rows: GanttRow[] = [
		{ type: "stage", stage: stages[0] },
		{ type: "milestone", milestone: milestones[0] },
		{ type: "stage", stage: stages[1] },
		{ type: "stage", stage: stages[2] },
		{ type: "milestone", milestone: milestones[1] },
	];

	const finalPlanEnd = educationPlanEnd ?? developmentPlanEnd ?? tzPlanEnd;
	const currentFinish =
		closeDate ?? educationFactEnd ?? developmentFactEnd ?? tzFactEnd ?? today;
	const projectDeviation = finalPlanEnd
		? daysBetween(finalPlanEnd, currentFinish)
		: null;
	const overdueStages = stages.filter((stage) =>
		getStageStatus(stage, today).startsWith("Просрочен"),
	).length;
	const earlyStages = stages.filter(
		(stage) => getStageStatus(stage, today) === "Завершён раньше плана",
	).length;
	const totalOverdueDays = stages.reduce((acc, stage) => {
		const deviation = getStageDeviation(stage, today);

		return acc + Math.max(deviation ?? 0, 0);
	}, 0);

	return {
		rows,
		stages,
		milestones,
		summary: {
			projectTitle: project?.title ?? "Проект не выбран",
			finalPlanEnd,
			currentFinish,
			projectDeviation,
			overdueStages,
			earlyStages,
			totalOverdueDays,
			tzSignDate,
		},
	};
};

export const getGanttTimeline = (
	rows: GanttRow[],
	today: Date,
): GanttTimeline => {
	const dates = rows.flatMap((row) => {
		if (row.type === "milestone") {
			return [row.milestone.date];
		}

		return [
			row.stage.planStart,
			row.stage.planEnd,
			row.stage.factStart,
			row.stage.factEnd,
		];
	});
	const validDates = [...dates, today].filter((date): date is Date =>
		Boolean(date),
	);
	const minDate = new Date(Math.min(...validDates.map((date) => date.getTime())));
	const maxDate = new Date(Math.max(...validDates.map((date) => date.getTime())));
	const start = addDays(minDate, -7);
	let end = addDays(maxDate, 14);

	if (daysBetween(start, end) < 56) {
		end = addDays(start, 56);
	}

	return {
		start,
		end,
		totalDays: Math.max(daysBetween(start, end), 1),
	};
};

const getTimelinePosition = (date: Date, timeline: GanttTimeline) =>
	Math.min(
		100,
		Math.max(0, (daysBetween(timeline.start, date) / timeline.totalDays) * 100),
	);

export const getSegmentStyle = (
	start: Date,
	end: Date,
	timeline: GanttTimeline,
): CSSProperties => {
	const left = getTimelinePosition(start, timeline);
	const right = getTimelinePosition(end, timeline);

	return {
		left: `${left}%`,
		width: `${Math.max(right - left, 0.6)}%`,
	};
};

export const getMilestoneStyle = (
	date: Date,
	timeline: GanttTimeline,
): CSSProperties => ({
	left: `${getTimelinePosition(date, timeline)}%`,
});

export const getMonthTicks = (timeline: GanttTimeline): GanttMonthTick[] => {
	const cursor = new Date(
		timeline.start.getFullYear(),
		timeline.start.getMonth(),
		1,
	);
	const ticks: GanttMonthTick[] = [];

	while (cursor <= timeline.end) {
		const start = cursor < timeline.start ? timeline.start : cursor;

		ticks.push({
			date: new Date(cursor),
			label: new Intl.DateTimeFormat("ru-RU", {
				month: "short",
			})
				.format(cursor)
				.replace(".", ""),
			style: {
				...getMilestoneStyle(start, timeline),
				width: "auto",
			},
		});
		cursor.setMonth(cursor.getMonth() + 1);
	}

	return ticks;
};

export const getDayTicks = (timeline: GanttTimeline): GanttDayTick[] => {
	const ticks: GanttDayTick[] = [];
	const cursor = new Date(timeline.start);

	while (cursor <= timeline.end) {
		const day = cursor.getDate();

		ticks.push({
			date: new Date(cursor),
			isMajor: day % 5 === 0,
			style: getMilestoneStyle(cursor, timeline),
		});
		cursor.setDate(cursor.getDate() + 1);
	}

	return ticks;
};

export const getWeekTicks = (timeline: GanttTimeline): GanttWeekTick[] => {
	const ticks: GanttWeekTick[] = [];
	const cursor = new Date(timeline.start);

	while (cursor <= timeline.end) {
		ticks.push({
			date: new Date(cursor),
			label: formatDateShort(cursor),
			style: getMilestoneStyle(cursor, timeline),
		});
		cursor.setDate(cursor.getDate() + 7);
	}

	return ticks;
};
