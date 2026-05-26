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
				background: "var(--color-surface-soft)",
				border: "1px solid var(--color-border)",
			}}
			onClick={() => openTask(id, EntityTypeIds.reports)}
		>
			<div
				style={{
					fontSize: "0.85rem",
					color: "rgba(238, 245, 255, 0.68)",
				}}
			>
				{formatDate(date)}
			</div>

			<div
				style={{
					fontSize: "0.85rem",
					fontWeight: 600,
					color: "var(--color-text)",
					whiteSpace: "nowrap",
				}}
			>
				{timeSpent.toFixed(1)} ч.
			</div>
		</div>
	);
};
