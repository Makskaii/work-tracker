const STORAGE_PREFIX = "work-tracker.navigation.v1";

export const getAppNavigationKey = (
	userId: number,
	origin = window.location.origin,
	baseUrl = import.meta.env.BASE_URL,
) => `${STORAGE_PREFIX}:${origin}:${baseUrl}:user:${userId}`;

export const isAppNavigationPath = (value: unknown): value is string =>
	typeof value === "string" &&
	(/^(\/reports\/(calendar|projects|progress|developers|development|sales|profitability|projects-plan|clients|workload|project-statuses|commertial-analytics|migrate))$/.test(value) ||
		["/create-client-form", "/development-kanban", "/client-hours-packages"].includes(value) ||
		/^\/employee\/[1-9]\d*\/stats$/.test(value));

export const readAppNavigation = (
	key: string,
	isAllowed: (pathname: string) => boolean,
	storage?: Pick<Storage, "getItem">,
): string | null => {
	try {
		const saved: unknown = JSON.parse((storage ?? window.sessionStorage).getItem(key) ?? "null");
		if (!saved || typeof saved !== "object" || !("pathname" in saved)) return null;
		return isAppNavigationPath(saved.pathname) && isAllowed(saved.pathname)
			? saved.pathname : null;
	} catch {
		return null;
	}
};

export const saveAppNavigation = (
	key: string,
	pathname: string,
	storage?: Pick<Storage, "setItem">,
): void => {
	if (!isAppNavigationPath(pathname)) return;
	try {
		// Keep portal authentication query parameters and form data out of storage.
		(storage ?? window.sessionStorage).setItem(key, JSON.stringify({ pathname }));
	} catch {
		// Storage can be unavailable in embedded or private browser sessions.
	}
};
