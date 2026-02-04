import { RouterProvider } from "react-router";
import { router } from "./shared/config";
import "./index.css";

export default function App() {
	return <RouterProvider router={router} />;
}
