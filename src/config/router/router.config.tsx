import { createBrowserRouter } from "react-router";
import { EmptyPage } from "../../pages/emptyPage";

export const router = createBrowserRouter(
	[
		{
			path: "/",
			element: <EmptyPage />,
		},
	],
	{
		basename: import.meta.env.BASE_URL,
	},
);
