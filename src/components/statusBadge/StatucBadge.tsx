import type { Status } from "@/shared/types/types";
import { Badge } from "../buttons/Badge";

interface StatucBadgeProps {
	status: string;
	statuses: Status[];
}

export const StatucBadge = ({ status, statuses }: StatucBadgeProps) => {
	const getStatucColor = (status: string) => {
		return statuses.find((st) => status === st.STATUS_ID)?.COLOR;
	};

	const getStatusName = (status: string) => {
		return statuses.find((st) => status === st.STATUS_ID)?.NAME;
	};

	return <Badge color={getStatucColor(status)}>{getStatusName(status)}</Badge>;
};
