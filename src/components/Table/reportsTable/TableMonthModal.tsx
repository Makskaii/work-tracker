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
	const { projects, activities } = useOutletContext<ReportsContext>();
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
				border: "1px solid rgba(100, 108, 255, 0.22)",
				borderRadius: "14px",
				background: "#f8faff",
				boxShadow: "0 2px 8px rgba(100, 108, 255, 0.06)",
			}}
		>
			<button
				type="button"
				onClick={() => setExpanded((prev) => !prev)}
				style={{
					width: "100%",
					border: "none",
					background: "rgba(100, 108, 255, 0.08)",
					cursor: "pointer",
					padding: "0.9rem 1rem",
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					gap: "1rem",
					textAlign: "left",
					borderBottom: expanded
						? "1px solid rgba(100, 108, 255, 0.16)"
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
							color: "#646cff",
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
							color: "#1f2937",
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
							background: "rgba(100, 108, 255, 0.12)",
							color: "#4c54d2",
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
							background: "rgba(76, 175, 80, 0.14)",
							color: "#2e7d32",
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
						background: "#fdfdff",
					}}
				>
					<div
						style={{
							borderRadius: "12px",
							background: "#fff",
							border: "1px solid #e1e7f5",
							boxShadow: "0 2px 8px rgba(0, 0, 0, 0.03)",
							overflow: "hidden",
						}}
					>
						<UniversalTable<GroupedReportFields>
							activeItems={reports}
							headers={headers}
							additionalData={{
								projects,
								activities,
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
