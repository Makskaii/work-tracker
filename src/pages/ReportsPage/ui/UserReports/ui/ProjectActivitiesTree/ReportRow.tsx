import { EntityTypeIds } from "@/shared/constants/const";
import { useBitrixSlider } from "@/shared/hooks/useBitrixSlider";

type ReportRowProps = {
	date: string;
	timeSpent: number;
	id: string;
};

const formatDate = (value: string) => {
	const date = new Date(value);

	if (Number.isNaN(date.getTime())) return value;

	return date.toLocaleDateString();
};

export const ReportRow = ({ date, timeSpent, id }: ReportRowProps) => {
	const { openTask } = useBitrixSlider();

	return (
		<div
			style={{
				display: "flex",
				justifyContent: "space-between",
				alignItems: "center",
				gap: "0.75rem",
				padding: "0.45rem 0.65rem",
				borderRadius: "8px",
				background: "#ffffff",
				border: "1px solid #f1f5f9",
			}}
			onClick={() => openTask(id, EntityTypeIds.reports)}
		>
			<div
				style={{
					fontSize: "0.85rem",
					color: "#4b5563",
				}}
			>
				{formatDate(date)}
			</div>

			<div
				style={{
					fontSize: "0.85rem",
					fontWeight: 600,
					color: "#111827",
					whiteSpace: "nowrap",
				}}
			>
				{timeSpent.toFixed(1)} ч.
			</div>
		</div>
	);
};
