type RouteAbility = { can: (action: string, subject: string) => boolean };

export const canAccessWorkTrackerPath = (
	ability: RouteAbility,
	pathname: string,
): boolean => {
	if (!pathname.startsWith("/")) return false;
	// Match React Router's default case-insensitive paths and optional final slash.
	const path = pathname.toLowerCase().replace(/\/+$/, "") || "/";
	if (path === "/create-client-form" || path === "/client-profile") {
		return ability.can("create-client", "client") ||
			(path === "/client-profile" && ability.can("read", "post"));
	}
	const employee = path.match(/^\/employee\/([1-9]\d*)\/stats$/);
	if (employee) return ability.can("read", `employee-${employee[1]}`);
	if (path === "/reports/sales") {
		return ability.can("read", "post") || ability.can("read", "sales-report");
	}
	if (
		/^\/reports(?:\/(?:calendar|projects|progress|developers|development|profitability|projects-plan|clients|workload|project-statuses|commertial-analytics|migrate))?$/.test(path) ||
		["/", "/development-kanban", "/client-hours-packages"].includes(path)
	) {
		return ability.can("read", "post");
	}
	return false;
};
