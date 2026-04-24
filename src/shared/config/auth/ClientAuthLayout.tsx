import { Outlet } from "react-router";
import { AuthProvider } from "./AuthGuard";

export const ClientAuthLayout = () => {
	return (
		<AuthProvider>
			<Outlet />
		</AuthProvider>
	);
};
