export type AuthSession = {
	accessToken: string;
	clientId: string;
	crmClientId: number;
	clientName: string;
	email: string;
};

const AUTH_SESSION_KEY = "auth_session";

export const authStorage = {
	get(): AuthSession | null {
		const raw = sessionStorage.getItem(AUTH_SESSION_KEY);

		if (!raw) {
			return null;
		}

		try {
			return JSON.parse(raw) as AuthSession;
		} catch {
			sessionStorage.removeItem(AUTH_SESSION_KEY);
			return null;
		}
	},

	set(session: AuthSession) {
		sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
	},

	clear() {
		sessionStorage.removeItem(AUTH_SESSION_KEY);
	},
};
