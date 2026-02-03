import { RouterProvider } from "react-router";
import { router } from "./config";

export default function App() {
	return <RouterProvider router={router} />;
}
