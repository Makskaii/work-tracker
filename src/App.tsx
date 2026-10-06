import { useEffect } from "react";
import { RouterProvider } from "react-router";
import { router } from "./shared/config";
import { startAppUpdateMonitor } from "./shared/lib/appUpdates";
import "./index.css";

export default function App() {
	useEffect(() => {
		if (!import.meta.env.PROD) return;
		return startAppUpdateMonitor({
			buildId: __WORK_TRACKER_BUILD_ID__,
			versionUrl: `${import.meta.env.BASE_URL}version.json`,
		});
	}, []);
	return <RouterProvider router={router} />;
}
