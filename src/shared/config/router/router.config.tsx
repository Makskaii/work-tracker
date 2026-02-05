import { createBrowserRouter } from "react-router";
import { MainLayout } from "../../../components/layout/MainLayout";
import { ReportsPage } from "../../../pages/ReportsPage";
import { DataPage } from "../../../pages/TablePage";

export const router = createBrowserRouter(
	[
		{
			path: "/",
			element: <MainLayout />,
			children: [
				{ path: "/data", element: <DataPage /> },
				{ path: "/reports", element: <ReportsPage /> },
			],
		},
	],
	{
		basename: import.meta.env.BASE_URL,
	},
);
