import type { CSSProperties } from "react";

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

export type GanttRow =
	| {
			type: "stage";
			stage: GanttStage;
	  }
	| {
			type: "milestone";
			milestone: GanttMilestone;
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
