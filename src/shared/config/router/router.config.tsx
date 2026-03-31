import { Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router";
import ErrorElement from "@/components/errorElement/ErrorElement";
import { MainLayout } from "@/components/layout/MainLayout";
import { Spinner } from "@/components/spinner/Spinner";
import {
	Progress,
	ProjectsReports,
	ReportsCalendar,
	ReportsPage,
} from "@/pages";
import { ClientLoginPage } from "@/pages/ClientProfilePage/ui/LoginPage/ClientLoginPage";
import ClientProfile from "@/pages/ClientProfilePage/ui/ProfilePage/ClientProfile";
import { ProjectsStats } from "@/pages/ClientProfilePage/ui/ProjectPage/ClientProjectPage";
import { ClientForm } from "@/pages/CreateClientForm/ui/CreateClientForm";
import ClientList from "@/pages/ReportsPage/ui/ProjectReports/ClientsPage";
import { SalesPage } from "@/pages/ReportsPage/ui/SalesPage/SalesPage";
import { NewUserReports } from "@/pages/ReportsPage/ui/UserReports/UserNewReports";

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
							path: "sales",
							element: (
								<Suspense fallback={<Spinner />}>
									<SalesPage />
								</Suspense>
							),
						},
						{
							path: "clients",
							element: (
								<Suspense fallback={<Spinner />}>
									<ClientList />
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
			],
		},
		{
			path: "/client-profile",
			element: (
				<Suspense fallback={<Spinner />}>
					<ClientLoginPage />
				</Suspense>
			),
		},
		{
			path: "/client-profile/:clientId",
			element: (
				<Suspense fallback={<Spinner />}>
					<ClientProfile />
				</Suspense>
			),
		},
		{
			path: "/client-projects/:clientId/project/:projId",
			element: (
				<Suspense fallback={<Spinner />}>
					<ProjectsStats />
				</Suspense>
			),
		},
	],
	{
		basename: import.meta.env.BASE_URL,
	},
);
