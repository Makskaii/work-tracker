import { useMemo, useState } from "react";
import type { Deal } from "@/pages/ReportsPage/types/deals.types";
import { EntityTypeIds } from "@/shared/constants/const";
import { useBitrixSlider } from "@/shared/hooks/useBitrixSlider";
import type { User } from "@/shared/types/types";
import { SalesItem } from "./SalesItem";

export const SalesCard = ({
	user,
	deals,
	isTotal = false,
}: {
	user: User;
	deals: Deal[];
	isTotal: boolean;
}) => {
	const [expanded, setExpanded] = useState(false);

	const { openTask } = useBitrixSlider();

	const opportunity = useMemo(() => {
		if (deals.length) {
			return deals.reduce((acc, deal) => {
				if (deal.opportunity) {
					acc += +deal.opportunity;
				}
				return acc;
			}, 0);
		}
	}, [deals]);

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
				}}
			>
				<div
					style={{
						width: "100%",
					}}
				>
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							width: "inherit",
						}}
					>
						<div
							style={{
								fontSize: "18px",
								fontWeight: 600,
								color: "#111827",
							}}
						>
							{user?.title}
						</div>
						{isTotal && (
							<div>
								{opportunity ? (
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
										Сумма продаж: {Number(opportunity).toLocaleString("ru-RU")}{" "}
										₽
									</div>
								) : null}
							</div>
						)}
					</div>

					<div
						style={{
							color: "#6b7280",
							marginTop: "4px",
							textAlign: "left",
							display: "flex",
							gap: "12px",
							cursor: "pointer",
						}}
						onClick={() => setExpanded((prev) => !prev)}
					>
						<div> Сделок: {deals.length}</div>

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
					</div>
				</div>
			</div>

			{expanded && (
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: "12px",
						borderTop: "1px solid #ccc",
					}}
				>
					{deals.map((item) => (
						<div
							onClick={() => openTask(item.id, EntityTypeIds.default, "common")}
						>
							<SalesItem key={item.id} deal={item} />
						</div>
					))}
				</div>
			)}
		</div>
	);
};
