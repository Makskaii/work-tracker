import { lazy } from "react";

export const Progress = lazy(() => import("./ProgressReports/Progress"));
export const ProjectsReports = lazy(
	() => import("./ProjectsReports/ProjectsReports"),
);
export const UsersReports = lazy(() => import("./UsersReports/UsersReports"));
export const ReportsPage = lazy(() => import("./ReportsPage"));
export const DataPage = lazy(() => import("./DataPage/TablePage"));
