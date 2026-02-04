import { createBrowserRouter } from "react-router";
import { MainLayout } from "../../../components/layout/MainLayout";
import { EmptyPage } from "../../../pages/TablePage";

export const router = createBrowserRouter(
	[
		{
			path: "/",
			element: <MainLayout />,
			children: [{ path: "/emptyPage", element: <EmptyPage /> }],
		},
	],
	{
		basename: import.meta.env.BASE_URL,
	},
);
