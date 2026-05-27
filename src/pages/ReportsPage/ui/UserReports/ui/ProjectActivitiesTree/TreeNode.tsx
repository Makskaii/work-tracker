import type { CSSProperties, ReactNode } from "react";

type TreeNodeProps = {
	title: ReactNode;
	value?: ReactNode;
	isExpanded?: boolean;
	onToggle?: () => void;
	children?: ReactNode;
	level?: 0 | 1 | 2 | 3;
	styles?: CSSProperties;
};

export const TreeNode = ({
	title,
	value,
	isExpanded = false,
	onToggle,
	children,
	level = 0,
	styles,
}: TreeNodeProps) => {
	const paddingLeftMap = {
		0: "1rem",
		1: "1rem",
		2: "0.8rem",
		3: "0.65rem",
	};

	const hasToggle = Boolean(onToggle);

	return (
		<div
			style={{
				border: "1px solid var(--color-border)",
				borderRadius: "12px",
				background: "var(--color-surface-soft)",
				overflow: "hidden",
				...styles,
			}}
		>
			<div
				role={hasToggle ? "button" : undefined}
				tabIndex={hasToggle ? 0 : undefined}
				onClick={onToggle}
				onKeyDown={(event) => {
					if (!hasToggle) return;

					if (event.key === "Enter" || event.key === " ") {
						event.preventDefault();
						onToggle?.();
					}
				}}
				style={{
					border: "none",
					background: "transparent",
					cursor: hasToggle ? "pointer" : "default",
					padding: `0.85rem 1rem 0.85rem ${paddingLeftMap[level]}`,
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					gap: "0.75rem",
					textAlign: "left",
				}}
			>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: "0.65rem",
						minWidth: 0,
					}}
				>
					{hasToggle && (
						<div
							style={{
								transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
								transition: "transform 0.2s ease",
								color: "rgba(238, 245, 255, 0.65)",
								fontSize: "0.85rem",
								flexShrink: 0,
							}}
						>
							▶
						</div>
					)}

					<div
						style={{
							minWidth: 0,
							wordBreak: "break-word",
						}}
					>
						{title}
					</div>
				</div>

				{value && (
					<div
						style={{
							whiteSpace: "nowrap",
							fontWeight: 600,
							color: "var(--color-text)",
							flexShrink: 0,
						}}
					>
						{value}
					</div>
				)}
			</div>

			{isExpanded && children && (
				<div
					style={{
						padding: "0 0.75rem 0.75rem 0.75rem",
						display: "flex",
						flexDirection: "column",
						gap: "0.5rem",
					}}
				>
					{children}
				</div>
			)}
		</div>
	);
};
