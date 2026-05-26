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
				border: "1px solid var(--color-border)",
				borderRadius: "16px",
				background: "var(--color-surface)",
				boxShadow: "0 16px 36px rgba(1, 8, 14, 0.28)",
				color: "var(--color-text)",
				position: "relative",
				overflowY: "auto",
				maxHeight: "50vh",
			}}
		>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					paddingBottom: "12px",
					position: "sticky",
					padding: "1rem",
					top: 0,
					background: "var(--color-surface)",
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
								color: "var(--color-text)",
								background: "var(--color-surface)",
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
											color: "var(--color-accent)",
											background: "#063d43",
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
							color: "var(--color-text)",
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
								color: "var(--color-accent)",
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
						borderTop: "1px solid var(--color-border)",
						padding: "1rem",
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
