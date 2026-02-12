import { createBrowserRouter } from "react-router";
import { MainLayout } from "../../../components/layout/MainLayout";
import { ActivityPage } from "../../../pages/ActivityPage";
import { Progress } from "../../../pages/Progress";
import { ProjectsReports } from "../../../pages/ProjectsReports";
import { ReportsPage } from "../../../pages/ReportsPage";
import { DataPage } from "../../../pages/TablePage";
import { UsersReports } from "../../../pages/UsersReports";

export const router = createBrowserRouter(
	[
		{
			path: "/",
			element: <MainLayout />,
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
