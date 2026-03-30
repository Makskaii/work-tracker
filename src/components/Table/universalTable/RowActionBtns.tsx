import type { CSSProperties } from "react";
import { EntityTypeIds } from "@/shared/constants/const";

type ReportRowActionsProps = {
	reportId: string;
	taskId?: string | number | null;
	openTask?: (id: string | number, entityTypeId?: number) => void;
};

const baseButtonStyle: CSSProperties = {
	border: "none",
	borderRadius: "8px",
	padding: "0.4rem 0.7rem",
	fontSize: "0.82rem",
	fontWeight: 600,
	cursor: "pointer",
	whiteSpace: "nowrap",
	transition: "transform 0.15s ease, opacity 0.15s ease",
};

const reportButtonStyle: CSSProperties = {
	...baseButtonStyle,
	background: "rgba(100, 108, 255, 0.12)",
	color: "#4c54d2",
	border: "1px solid rgba(100, 108, 255, 0.22)",
};

const taskButtonStyle: CSSProperties = {
	...baseButtonStyle,
	background: "rgba(76, 175, 80, 0.12)",
	color: "#2e7d32",
	border: "1px solid rgba(76, 175, 80, 0.24)",
};

export const ReportRowActions = ({
	reportId,
	taskId,
	openTask,
}: ReportRowActionsProps) => {
	return (
		<div
			style={{
				display: "flex",
				gap: "0.5rem",
				flexWrap: "wrap",
				alignItems: "center",
				flexDirection: "column",
			}}
		>
			<button
				type="button"
				style={reportButtonStyle}
				onClick={(event) => {
					event.stopPropagation();
					openTask?.(reportId, EntityTypeIds.reports);
				}}
			>
				Открыть отчёт
			</button>

			{taskId ? (
				<button
					type="button"
					style={taskButtonStyle}
					onClick={(event) => {
						event.stopPropagation();
						openTask?.(taskId, EntityTypeIds.tasks);
					}}
				>
					Открыть задачу
				</button>
			) : null}
		</div>
	);
};
