import { Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router";
import ErrorElement from "@/components/errorElement/ErrorElement";
import { MainLayout } from "@/components/layout/MainLayout";
import { Spinner } from "@/components/spinner/Spinner";
import {
	Progress,
	ProjectsReports,
	ReportsCalendar,
	UsersReports,
} from "@/pages";
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
					element: <Navigate to="/reports/employees" replace />,
				},
				{
					path: "/reports",
					element: (
						<Suspense fallback={<Spinner />}>
							<ReportsCalendar />
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
							path: "employees",
							element: (
								<Suspense fallback={<Spinner />}>
									<UsersReports />
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
							path: "new-reports",
							element: (
								<Suspense fallback={<Spinner />}>
									<NewUserReports />
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
