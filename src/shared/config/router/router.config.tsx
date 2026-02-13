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
import { ActivityPage } from "../../../pages/ActivityPage";

export const router = createBrowserRouter(
	[
		{
			path: "/",
			element: (
				<Suspense fallback={<Spinner />}>
					<MainLayout />
				</Suspense>
			),
			children: [
				{ path: "/data", element: <DataPage /> },
				{
					path: "/reports",
					element: <ReportsPage />,
					children: [
						{
							path: "projects",
							element: <ProjectsReports />,
						},
						{
							path: "employees",
							element: <UsersReports />,
						},
						{
							path: "progress",
							element: <Progress />,
						},
					],
				},
				{ path: "/activity", element: <ActivityPage /> },
			],
		},
	],
	{
		basename: import.meta.env.BASE_URL,
	},
);
