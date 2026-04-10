import type { Deal } from "@/pages/ReportsPage/types/deals.types";
import { SalesCodes } from "@/pages/ReportsPage/types/types";
import { convertToDate } from "@/shared/utils";

export const SalesItem = ({ deal }: { deal: Deal }) => {
	return (
		<div
			key={deal.id}
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "10px",
				padding: "14px",
				border: "1px solid #edf1f5",
				borderRadius: "12px",
				background: "#f8fafc",
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
				<div
					style={{
						fontSize: "15px",
						fontWeight: 600,
						color: "#111827",
						lineHeight: 1.4,
					}}
				>
					{deal.title}
				</div>

				{deal.opportunity ? (
					<div
						style={{
							whiteSpace: "nowrap",
							fontSize: "13px",
							fontWeight: 600,
							color: "#0f766e",
							background: "#ecfeff",
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
					color: "#4b5563",
				}}
			>
				<div>
					<span style={{ color: "#9ca3af" }}>ППО:</span>{" "}
					{deal[SalesCodes.ppoDay]
						? convertToDate(deal[SalesCodes.ppoDay])
						: "—"}
				</div>

				<div>
					<span style={{ color: "#9ca3af" }}>КП:</span>{" "}
					{deal[SalesCodes.kpday] ? convertToDate(deal[SalesCodes.kpday]) : "—"}
				</div>
			</div>
		</div>
	);
};
