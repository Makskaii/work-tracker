export const InfoCard = ({
	label,
	value,
}: {
	label: string;
	value: string;
}) => {
	return (
		<div
			style={{
				padding: "16px",
				borderRadius: "16px",
				background: "#ffffff",
				border: "1px solid #e2e8f0",
				display: "flex",
				flexDirection: "column",
				gap: "8px",
				minWidth: 0,
			}}
		>
			<div
				style={{
					fontSize: "13px",
					color: "#64748b",
					fontWeight: 500,
				}}
			>
				{label}
			</div>

			<div
				style={{
					fontSize: "15px",
					color: "#0f172a",
					fontWeight: 600,
					wordBreak: "break-word",
				}}
			>
				{value}
			</div>
		</div>
	);
};
