import type { Deal } from "@/pages/ReportsPage/types/deals.types";
import { SalesCodes } from "@/pages/ReportsPage/types/types";
import { convertToDate } from "@/shared/utils";

export const SalesItem = ({
	deal,
	onTitleClick,
}: {
	deal: Deal;
	onTitleClick?: () => void;
}) => {
	return (
		<div
			key={deal.id}
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "10px",
				padding: "14px",
				border: "1px solid var(--color-border)",
				borderRadius: "12px",
				background: "var(--color-surface-soft)",
				color: "var(--color-text)",
			}}
		>
			<div
				style={{
					display: "flex",
					alignItems: "flex-start",
					justifyContent: "space-between",
					gap: "12px",
				}}
			>
				<button
					type="button"
					style={{
						padding: 0,
						border: 0,
						background: "transparent",
						fontSize: "15px",
						fontWeight: 600,
						color: "var(--color-text)",
						cursor: onTitleClick ? "pointer" : "default",
						lineHeight: 1.4,
						textAlign: "left",
					}}
					onClick={(event) => {
						if (!onTitleClick) return;

						event.stopPropagation();
						onTitleClick();
					}}
				>
					{deal.title}
				</button>

				{deal.opportunity ? (
					<div
						style={{
							whiteSpace: "nowrap",
							fontSize: "13px",
							fontWeight: 600,
							color: "var(--color-accent)",
							background: "#063d43",
							padding: "4px 8px",
							borderRadius: "999px",
						}}
					>
						{Number(deal.opportunity).toLocaleString("ru-RU")} ₽
					</div>
				) : null}
			</div>

			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
					gap: "8px 16px",
					fontSize: "13px",
					color: "var(--color-text)",
				}}
			>
				<div>
					<span style={{ color: "var(--color-text)" }}>ППО:</span>{" "}
					{deal[SalesCodes.ppoDay]
						? convertToDate(deal[SalesCodes.ppoDay])
						: "—"}
				</div>

				<div>
					<span style={{ color: "var(--color-text)" }}>КП:</span>{" "}
					{deal[SalesCodes.kpday] ? convertToDate(deal[SalesCodes.kpday]) : "—"}
				</div>
			</div>
		</div>
	);
};
