import {
	createContext,
	type ReactNode,
	useContext,
	useMemo,
	useState,
} from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { type AuthSession, authStorage } from "./auth.sessions";

export const ProtectedRoute = () => {
	const location = useLocation();
	const session = authStorage.get();

	if (!session?.accessToken) {
		return <Navigate to="/client-profile" replace state={{ from: location }} />;
	}

	return <Outlet />;
};

export const PublicOnlyRoute = () => {
	const session = authStorage.get();

	if (session?.accessToken) {
		const redirectTo = session.crmClientId
			? `/client-profile/${session.crmClientId}`
			: "/";

		return <Navigate to={redirectTo} replace />;
	}

	return <Outlet />;
};

type AuthContextValue = {
	session: AuthSession | null;
	isAuth: boolean;
	login: (session: AuthSession) => void;
	logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
	const [session, setSession] = useState<AuthSession | null>(() =>
		authStorage.get(),
	);

	const login = (session: AuthSession) => {
		authStorage.set(session);
		setSession(session);
	};

	const logout = () => {
		authStorage.clear();
		setSession(null);
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: <ss>
	const value = useMemo(
		() => ({
			session,
			isAuth: Boolean(session?.accessToken),
			login,
			logout,
		}),
		[session],
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
	const context = useContext(AuthContext);

	if (!context) {
		throw new Error("useAuth must be used inside AuthProvider");
	}

	return context;
};
