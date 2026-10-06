import type { SalesProfitabilityTab } from "./types";

export type ReportNavigation = {
	selectedProjectId: string | null;
	activeTab: SalesProfitabilityTab;
	paymentsScope: "all" | "client" | "project";
	isStructureCollapsed: boolean;
};

export const DEFAULT_REPORT_NAVIGATION: ReportNavigation = {
	selectedProjectId: null,
	activeTab: "projects",
	paymentsScope: "project",
	isStructureCollapsed: false,
};

const validTabs = new Set<SalesProfitabilityTab>([
	"projects",
	"projectDetails",
	"tasks",
	"reports",
	"projectReports",
	"marginality",
]);

// A tab-local preference, scoped to the application URL. Never store form data,
// names, tokens or project contents, and validate the ID against loaded projects.
export const getReportNavigationStorageKey = (
	location: Pick<Location, "origin" | "pathname">,
	currentUserId?: number | null,
) =>
	`work-tracker:report-navigation:v1:${location.origin}${location.pathname}:${currentUserId ?? "session"}`;

export const readReportNavigation = (key: string): ReportNavigation => {
	try {
		const raw = window.sessionStorage.getItem(key);
		if (!raw) return { ...DEFAULT_REPORT_NAVIGATION };
		const value: unknown = JSON.parse(raw);
		if (!value || typeof value !== "object" || !("version" in value) || value.version !== 1) {
			return { ...DEFAULT_REPORT_NAVIGATION };
		}
		const stored = value as Record<string, unknown>;
		const projectId = stored.selectedProjectId;
		return {
			selectedProjectId:
				typeof projectId === "string" &&
				/^db-[1-9]\d*$/.test(projectId) &&
				Number.isSafeInteger(Number(projectId.slice(3)))
					? projectId
					: null,
			activeTab:
				typeof stored.activeTab === "string" && validTabs.has(stored.activeTab as SalesProfitabilityTab)
					? (stored.activeTab as SalesProfitabilityTab)
					: "projects",
			paymentsScope:
				stored.paymentsScope === "all" || stored.paymentsScope === "client"
					? stored.paymentsScope
					: "project",
			isStructureCollapsed: stored.isStructureCollapsed === true,
		};
	} catch {
		// Embedded browsers can disable storage; the report remains usable.
		return { ...DEFAULT_REPORT_NAVIGATION };
	}
};

export const writeReportNavigation = (key: string, navigation: ReportNavigation) => {
	try {
		window.sessionStorage.setItem(key, JSON.stringify({ version: 1, ...navigation }));
	} catch {
		// Storage is an optional convenience, never a requirement for saving work.
	}
};
