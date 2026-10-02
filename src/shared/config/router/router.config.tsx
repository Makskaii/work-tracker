import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router";
import ErrorElement from "@/components/errorElement/ErrorElement";
import { MainLayout } from "@/components/layout/MainLayout";
import { Spinner } from "@/components/spinner/Spinner";
import {
	DevelopmentReportFallback,
	Progress,
	ProjectsReports,
	ReportsCalendar,
	ReportsPage,
} from "@/pages";
import { ClientHoursPackagesPage } from "@/pages/ClientHoursPackages/ClientHoursPackagesPage";
import { ClientLoginPage } from "@/pages/ClientProfilePage/ui/LoginPage/ClientLoginPage";
import ClientProfile from "@/pages/ClientProfilePage/ui/ProfilePage/ClientProfile";
import { ClientForm } from "@/pages/CreateClientForm/ui/CreateClientForm";
import { MigratePage } from "@/pages/MigratePage";
import AnalyticsCommertialReportPage from "@/pages/ReportsPage/ui/AnalyticsReports/AnalyticsReports";
import { ProjectPlanPage } from "@/pages/ReportsPage/ui/ProjectPlan/ProjectPlanPage";
import ClientList from "@/pages/ReportsPage/ui/ProjectReports/ClientsPage";
import { ProjectStatuses } from "@/pages/ReportsPage/ui/ProjectReports/ProjectsStatusPage/StatusPage";
import { SalesPage } from "@/pages/ReportsPage/ui/SalesPage/SalesPage";
import { SalesProfitabilityPage } from "@/pages/ReportsPage/ui/SalesPage/SalesProfitabilityPage";
import { PieceStatsEmployeeHrs } from "@/pages/ReportsPage/ui/UserReports/EmployeePieceStatsHrs";
import { NewUserReports } from "@/pages/ReportsPage/ui/UserReports/UserNewReports";
import { WorkLoad } from "@/pages/ReportsPage/ui/UserReports/WorkLoadPage/WorkLoad";
import { ProtectedRoute, PublicOnlyRoute } from "../auth/AuthGuard";
import { ClientAuthLayout } from "../auth/ClientAuthLayout";

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
							path: "sales",
							element: (
								<Suspense fallback={<Spinner />}>
									<SalesPage />
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
							element: <ProjectPlanPage />,
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
					element: <ClientHoursPackagesPage />,
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
		basename: import.meta.env.BASE_URL,
	},
);
