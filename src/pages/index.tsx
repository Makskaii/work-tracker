import { lazy } from "react";

export const Progress = lazy(
	() => import("./ReportsPage/ui/ProgressReports/Progress"),
);
export const ProjectsReports = lazy(
	() => import("./ReportsPage/ui/ProjectReports/ProjectsReports"),
);
export const UsersReports = lazy(
	() => import("./ReportsPage/ui/UserReports/UsersReports"),
);
export const ReportsPage = lazy(() => import("./ReportsPage/ReportsPage"));
export const DataPage = lazy(() => import("./DataPage/TablePage"));
