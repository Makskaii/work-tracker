import type { ReactNode } from "react";
import { ability } from "@/shared/config/ability/casl";
import { canAccessWorkTrackerPath } from "@/shared/config/ability/routeAccess";

export const WorkTrackerRouteGuard = ({
	pathname,
	children,
}: {
	pathname: string;
	children: ReactNode;
}) => canAccessWorkTrackerPath(ability, pathname)
	? children
	: <div>У вас нет прав на просмотр этой страницы</div>;
