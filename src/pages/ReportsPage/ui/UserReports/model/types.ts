export type ViewCalendar = "month" | "week";

export type EmployeeMetrics = {
	hours: Map<string, number>;
	notAtWork: Map<string, number>;
	totalHours: number;
	hasLoaded: boolean;
};
