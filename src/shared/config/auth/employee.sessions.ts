export type EmployeeSession = {
	user: { id: number; name: string; departmentIds: number[]; isAdmin: boolean };
	rules: { action: string; subject: string }[];
	portalOrigin: string;
	csrfToken: string;
	expiresAt: string | number;
	returnTo?: string;
};

let employeeSession: EmployeeSession | null = null;
let employeeSessionRevision = 0;
let iframeTokenProvider: (() => Promise<string>) | null = null;
const expiredListeners = new Set<() => void>();

// Only the server owns OAuth credentials. This in-memory state contains display
// data and the CSRF token for the HttpOnly cookie, never access/refresh tokens.
export const employeeSessionState = {
	get: () => employeeSession,
	getRevision: () => employeeSessionRevision,
	set: (session: EmployeeSession | null) => { employeeSession = session; employeeSessionRevision += 1; },
	expire: () => {
		employeeSession = null;
		employeeSessionRevision += 1;
		for (const listener of expiredListeners) listener();
	},
	subscribeExpired: (listener: () => void) => {
		expiredListeners.add(listener);
		return () => { expiredListeners.delete(listener); };
	},
};

export const setIframeTokenProvider = (provider: (() => Promise<string>) | null) => {
	iframeTokenProvider = provider;
};
export const getIframeTokenProvider = () => iframeTokenProvider;

export const isProductionStandalone = () =>
	!import.meta.env.DEV && window.self === window.top;

export const isClientCabinetRequest = (url: string) =>
	/^\/?(?:auth\/(?!employee(?:\/|$))|client-profile(?:\/|$)|clients\/me(?:\/|$))/.test(url);
