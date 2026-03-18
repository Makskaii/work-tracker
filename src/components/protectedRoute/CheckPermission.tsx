import type { ReactNode } from "react";
import { ability } from "../../shared/config/ability/casl";

export const CheckPermission = ({
	permission,
	children,
	subject,
}: {
	permission: string;
	children: ReactNode;
	subject: string;
}) => {
	if (ability && ability.can(permission, subject)) {
		return children;
	}

	return <div>У вас нет прав на просмотр этой страницы</div>;
};
