import { Suspense } from "react";
import { createBrowserRouter } from "react-router";
import { MainLayout } from "../../../components/layout/MainLayout";
import { Spinner } from "../../../components/spinner/Spinner";
import {
	DataPage,
	Progress,
	ProjectsReports,
	ReportsPage,
	UsersReports,
} from "../../../pages";
import { NewUserReports } from "../../../pages/NewUiVersion/UserReports/UserNewReports";

export const router = createBrowserRouter(
	[
		{
			path: "/",
			element: <MainLayout />,
			children: [
				{ path: "/data", element: <DataPage /> },
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
