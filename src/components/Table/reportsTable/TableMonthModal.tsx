import { useMemo, useState } from "react";
import { useOutletContext } from "react-router";
import { headers } from "@/components/calendar/CalendarMonth";
import { useBitrixSlider } from "@/shared/hooks/useBitrixSlider";
import type { GroupedReportFields } from "@/shared/types/table";
import type { ReportsContext } from "@/shared/types/types";
import { UniversalTable } from "../universalTable/UniversalTable";

export const ReportsActivitySection = ({
	reports,
	type,
	index,
}: {
	reports: GroupedReportFields[];
	type: string;
	index: number;
}) => {
	const { projects, activities, clientsList } =
		useOutletContext<ReportsContext>();
	const { openTask } = useBitrixSlider();
	const [expanded, setExpanded] = useState(index === 0 ? true : false);

	const activityName = useMemo(() => {
		return activities.find((item) => item.ID === type)?.NAME || type;
	}, [activities, type]);

	const totalHours = useMemo(() => {
		return reports.reduce((acc, item) => {
			const value = Number(String(item.timeSpent).replace(",", "."));
			return acc + (Number.isNaN(value) ? 0 : value);
		}, 0);
	}, [reports]);

	return (
		<div
			style={{
				border: "1px solid var(--color-border)",
				borderRadius: "14px",
				background: "var(--color-surface)",
				boxShadow: "0 16px 36px rgba(1, 8, 14, 0.28)",
				color: "var(--color-text)",
			}}
		>
			<button
				type="button"
				onClick={() => setExpanded((prev) => !prev)}
				style={{
					width: "100%",
					border: "none",
					background: "#102036",
					cursor: "pointer",
					padding: "0.9rem 1rem",
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					gap: "1rem",
					textAlign: "left",
					borderBottom: expanded
						? "1px solid var(--color-border)"
						: "none",
					transition: "background 0.2s ease",
				}}
			>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: "0.75rem",
						minWidth: 0,
						flex: 1,
					}}
				>
					<div
						style={{
							transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
							transition: "transform 0.2s ease",
							color: "var(--color-accent)",
							fontSize: "0.85rem",
							flexShrink: 0,
						}}
					>
						▶
					</div>

					<div
						style={{
							minWidth: 0,
							flex: 1,
							fontWeight: 700,
							fontSize: "0.96rem",
							color: "var(--color-text)",
							wordBreak: "break-word",
						}}
					>
						{activityName}
					</div>
				</div>

				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: "0.6rem",
						flexShrink: 0,
					}}
				>
					<div
						style={{
							padding: "0.25rem 0.55rem",
							borderRadius: "999px",
							background: "#063d43",
							color: "var(--color-accent)",
							fontSize: "0.8rem",
							fontWeight: 700,
							whiteSpace: "nowrap",
						}}
					>
						{reports.length}
					</div>

					<div
						style={{
							padding: "0.25rem 0.55rem",
							borderRadius: "999px",
							background: "#102036",
							color: "var(--color-text)",
							fontSize: "0.8rem",
							fontWeight: 700,
							whiteSpace: "nowrap",
						}}
					>
						{totalHours.toFixed(2)} ч.
					</div>
				</div>
			</button>

			{expanded && (
				<div
					style={{
						padding: "0.9rem",
						background: "var(--color-surface)",
					}}
				>
					<div
						style={{
							borderRadius: "12px",
							background: "var(--color-surface-soft)",
							border: "1px solid var(--color-border)",
							boxShadow: "0 12px 28px rgba(1, 8, 14, 0.24)",
							overflow: "hidden",
						}}
					>
						<UniversalTable<GroupedReportFields>
							activeItems={reports}
							headers={headers}
							additionalData={{
								projects,
								activities,
								clients: clientsList,
								openTask,
							}}
							fallbackText="Нет отчетов по активности"
						/>
					</div>
				</div>
			)}
		</div>
	);
};
