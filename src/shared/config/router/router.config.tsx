import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router";
import ErrorElement from "@/components/errorElement/ErrorElement";
import { MainLayout } from "@/components/layout/MainLayout";
import { Spinner } from "@/components/spinner/Spinner";
import { ProtectedRoute, PublicOnlyRoute } from "../auth/AuthGuard";
import { ClientAuthLayout } from "../auth/ClientAuthLayout";

const ReportsPage = lazy(() => import("@/pages/ReportsPage/ReportsPage"));
const Progress = lazy(() => import("@/pages/ReportsPage/ui/ProgressReports/Progress"));
const ProjectsReports = lazy(() => import("@/pages/ReportsPage/ui/ProjectReports/ProjectsReports"));
const ReportsCalendar = lazy(() => import("@/pages/ReportsPage/ui/UserReports/ReportsCalendar"));
const DevelopmentReportFallback = lazy(() => import("@/pages/ReportsPage/ui/UserReports/DevelopmentReportFallback"));
const AnalyticsCommertialReportPage = lazy(() => import("@/pages/ReportsPage/ui/AnalyticsReports/AnalyticsReports"));
const ClientList = lazy(() => import("@/pages/ReportsPage/ui/ProjectReports/ClientsPage"));
const ClientProfile = lazy(() => import("@/pages/ClientProfilePage/ui/ProfilePage/ClientProfile"));
const ClientHoursPackagesPage = lazy(() => import("@/pages/ClientHoursPackages/ClientHoursPackagesPage").then((module) => ({ default: module.ClientHoursPackagesPage })));
const ClientLoginPage = lazy(() => import("@/pages/ClientProfilePage/ui/LoginPage/ClientLoginPage").then((module) => ({ default: module.ClientLoginPage })));
const ClientForm = lazy(() => import("@/pages/CreateClientForm/ui/CreateClientForm").then((module) => ({ default: module.ClientForm })));
const MigratePage = lazy(() => import("@/pages/MigratePage").then((module) => ({ default: module.MigratePage })));
const ProjectPlanPage = lazy(() => import("@/pages/ReportsPage/ui/ProjectPlan/ProjectPlanPage").then((module) => ({ default: module.ProjectPlanPage })));
const ProjectStatuses = lazy(() => import("@/pages/ReportsPage/ui/ProjectReports/ProjectsStatusPage/StatusPage").then((module) => ({ default: module.ProjectStatuses })));
const SalesPage = lazy(() => import("@/pages/ReportsPage/ui/SalesPage/SalesPage").then((module) => ({ default: module.SalesPage })));
const SalesProfitabilityPage = lazy(() => import("@/pages/ReportsPage/ui/SalesPage/SalesProfitabilityPage").then((module) => ({ default: module.SalesProfitabilityPage })));
const PieceStatsEmployeeHrs = lazy(() => import("@/pages/ReportsPage/ui/UserReports/EmployeePieceStatsHrs").then((module) => ({ default: module.PieceStatsEmployeeHrs })));
const NewUserReports = lazy(() => import("@/pages/ReportsPage/ui/UserReports/UserNewReports").then((module) => ({ default: module.NewUserReports })));
const WorkLoad = lazy(() => import("@/pages/ReportsPage/ui/UserReports/WorkLoadPage/WorkLoad").then((module) => ({ default: module.WorkLoad })));

const DevelopmentKanbanPage = lazy(() =>
	import("@/pages/DevelopmentKanban/DevelopmentKanbanPage").then((module) => ({
		default: module.DevelopmentKanbanPage,
	})),
);

export const router = createBrowserRouter(
	[
		{
			path: "/",
			element: <MainLayout />,
			errorElement: <ErrorElement />,

			children: [
				{
					index: true,
					element: <Navigate to="/reports/calendar" replace />,
				},
				{
					path: "/reports/sales",
					element: (
						<Suspense fallback={<Spinner />}>
							<SalesPage />
						</Suspense>
					),
				},
				{
					path: "/reports",
					element: (
						<Suspense fallback={<Spinner />}>
							<ReportsPage />
						</Suspense>
					),
					children: [
						{
							index: true,
							element: <Navigate to="calendar" replace />,
						},
						{
							path: "projects",
							element: (
								<Suspense fallback={<Spinner />}>
									<ProjectsReports />
								</Suspense>
							),
						},
						{
							path: "calendar",
							element: (
								<Suspense fallback={<Spinner />}>
									<ReportsCalendar />
								</Suspense>
							),
						},
						{
							path: "progress",
							element: (
								<Suspense fallback={<Spinner />}>
									<Progress />
								</Suspense>
							),
						},
						{
							path: "developers",
							element: (
								<Suspense fallback={<Spinner />}>
									<NewUserReports />
								</Suspense>
							),
						},
						{
							path: "development",
							element: (
								<Suspense fallback={<Spinner />}>
									<DevelopmentReportFallback />
								</Suspense>
							),
						},
						{
							path: "profitability",
							element: (
								<Suspense fallback={<Spinner />}>
									<SalesProfitabilityPage />
								</Suspense>
							),
						},
						{
							path: "projects-plan",
							element: <Suspense fallback={<Spinner />}><ProjectPlanPage /></Suspense>,
						},
						{
							path: "clients",
							element: (
								<Suspense fallback={<Spinner />}>
									<ClientList />
								</Suspense>
							),
						},
						{
							path: "workload",
							element: (
								<Suspense fallback={<Spinner />}>
									<WorkLoad />
								</Suspense>
							),
						},
						{
							path: "project-statuses",
							element: (
								<Suspense fallback={<Spinner />}>
									<ProjectStatuses />
								</Suspense>
							),
						},
						{
							path: "commertial-analytics",
							element: (
								<Suspense fallback={<Spinner />}>
									<AnalyticsCommertialReportPage />
								</Suspense>
							),
						},
						{
							path: "migrate",
							element: (
								<Suspense fallback={<Spinner />}>
									<MigratePage />
								</Suspense>
							),
						},
					],
				},
				{
					path: "/create-client-form",
					element: (
						<Suspense fallback={<Spinner />}>
							<ClientForm />
						</Suspense>
					),
				},
				{
					path: "/development-kanban",
					element: (
						<Suspense fallback={<Spinner />}>
							<DevelopmentKanbanPage />
						</Suspense>
					),
				},
				{
					path: "/client-hours-packages",
					element: <Suspense fallback={<Spinner />}><ClientHoursPackagesPage /></Suspense>,
				},
				{
					path: "/employee/:id/stats",
					element: (
						<Suspense fallback={<Spinner />}>
							<PieceStatsEmployeeHrs />
						</Suspense>
					),
				},
			],
		},
		{
			element: <ClientAuthLayout />,
			children: [
				{
					element: <PublicOnlyRoute />,
					children: [
						{
							path: "/client-profile",
							element: (
								<Suspense fallback={<Spinner />}>
									<ClientLoginPage />
								</Suspense>
							),
						},
					],
				},
				{
					element: <ProtectedRoute />,
					children: [
						{
							path: "/client-profile/:companyId",
							element: (
								<Suspense fallback={<Spinner />}>
									<ClientProfile />
								</Suspense>
							),
						},
					],
				},
			],
		},
	],
	{
		// Bitrix's registered OAuth handler is the base path without a final
		// slash. Accept both that callback and ordinary nested application URLs.
		basename: import.meta.env.BASE_URL.replace(/\/+$/, "") || "/",
	},
);
