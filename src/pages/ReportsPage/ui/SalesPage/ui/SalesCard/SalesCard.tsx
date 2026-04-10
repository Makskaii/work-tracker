import type { Deal } from "@/pages/ReportsPage/types/deals.types";
import type { User } from "@/shared/types/types";
import { SalesItem } from "./SalesItem";

export const SalesCard = ({ user, deals }: { user: User; deals: Deal[] }) => {
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "16px",
				padding: "16px",
				border: "1px solid #e5e7eb",
				borderRadius: "16px",
				background: "#ffffff",
				boxShadow: "0 4px 20px rgba(15, 23, 42, 0.06)",
			}}
		>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					paddingBottom: "12px",
					borderBottom: "1px solid #eef2f7",
				}}
			>
				<div>
					<div
						style={{
							fontSize: "18px",
							fontWeight: 600,
							color: "#111827",
						}}
					>
						{user?.title}
					</div>

					<div
						style={{
							fontSize: "13px",
							color: "#6b7280",
							marginTop: "4px",
						}}
					>
						Сделок: {deals.length}
					</div>
				</div>
			</div>

			<div
				style={{
					display: "flex",
					flexDirection: "column",
					gap: "12px",
				}}
			>
				{deals.map((item) => (
					<SalesItem key={item.id} deal={item} />
				))}
			</div>
		</div>
	);
};
