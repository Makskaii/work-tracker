import type { ReactNode } from "react";
import { ability } from "../../shared/config/ability/casl";

export const CheckPermission = ({
	permission,
	children,
}: {
	permission: string;
	children: ReactNode;
}) => {
	if (ability.can(permission, "post")) {
		return children;
	}

	return <div>У вас нет прав на просмотр этой страницы</div>;
};
