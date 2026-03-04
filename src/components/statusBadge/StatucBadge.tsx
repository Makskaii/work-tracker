import { useOutletContext } from "react-router";
import type { ReportsContext } from "@/shared/types/types";
import { Badge } from "../buttons/Badge";

interface StatucBadgeProps {
	status: string;
}

export const StatucBadge = ({ status }: StatucBadgeProps) => {
	const { statuses } = useOutletContext<ReportsContext>();

	const getStatucColor = (status: string) => {
		return statuses.find((st) => status === st.STATUS_ID)?.COLOR;
	};

	const getStatusName = (status: string) => {
		return statuses.find((st) => status === st.STATUS_ID)?.NAME;
	};

	return <Badge color={getStatucColor(status)}>{getStatusName(status)}</Badge>;
};
