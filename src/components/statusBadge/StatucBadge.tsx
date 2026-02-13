import { Badge } from "../buttons/Badge";

interface StatucBadgeProps {
	status: string;
}

export const StatucBadge = ({ status }: StatucBadgeProps) => {
	const getStatusLabel = (status: string) => {
		switch (status) {
			case "DT1072_18:NEW":
				return "new";
			case "DT1072_18:UC_6JNSDG":
				return "done";
			case "DT1072_18:UC_5GG9S1":
				return "testing";
			default:
				return "new";
		}
	};

	const getBadgeColor = (status: string) => {
		switch (status) {
			case "DT1072_18:NEW":
				return "blue";
			case "DT1072_18:UC_6JNSDG":
				return "green";
			case "DT1072_18:UC_5GG9S1":
				return "yellow";
			default:
				return "gray";
		}
	};

	return <Badge color={getBadgeColor(status)}>{getStatusLabel(status)}</Badge>;
};
