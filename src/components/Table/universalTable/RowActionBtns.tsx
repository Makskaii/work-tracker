import type { CSSProperties } from "react";
import { EntityTypeIds } from "@/shared/constants/const";

type ReportRowActionsProps = {
	reportId: string;
	taskId?: string | number | null;
	openTask?: (id: string | number, entityTypeId?: number) => void;
};

const baseButtonStyle: CSSProperties = {
	border: "1px solid var(--color-border)",
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
	background: "#063d43",
	color: "var(--color-accent)",
	border: "1px solid var(--color-accent)",
};

const taskButtonStyle: CSSProperties = {
	...baseButtonStyle,
	background: "#102036",
	color: "var(--color-text)",
	border: "1px solid var(--color-border)",
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
