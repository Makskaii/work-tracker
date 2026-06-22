import type { CSSProperties } from "react";
import type { CustomGanttEvent } from "./types";

export type GanttStage = {
	id: "tz" | "development" | "education";
	title: string;
	description: string;
	planStart: Date | null;
	planEnd: Date | null;
	factStart: Date | null;
	factEnd: Date | null;
};

export type GanttMilestone = {
	id: "tzSign" | "close";
	title: string;
	description: string;
	date: Date | null;
	color: "warning" | "accent";
};

export type GanttCustomEventRow = {
	event: CustomGanttEvent;
	title: string;
	description: string;
	planStart: Date | null;
	planEnd: Date | null;
	factStart: Date | null;
	factEnd: Date | null;
	displayDate: Date | null;
	displayStart: Date | null;
	displayEnd: Date | null;
};

export type GanttRow =
	| {
			type: "stage";
			stage: GanttStage;
	  }
	| {
			type: "milestone";
			milestone: GanttMilestone;
	  }
	| {
			type: "customEvent";
			customEvent: GanttCustomEventRow;
	  };

export type GanttTimeline = {
	start: Date;
	end: Date;
	totalDays: number;
};

export type GanttMonthTick = {
	date: Date;
	label: string;
	style: CSSProperties;
};

export type GanttDayTick = {
	date: Date;
	isMajor: boolean;
	style: CSSProperties;
};

export type GanttWeekTick = {
	date: Date;
	label: string;
	style: CSSProperties;
};
