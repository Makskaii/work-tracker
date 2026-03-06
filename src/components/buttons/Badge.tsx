import type { CSSProperties } from "react";
import cls from "./Button.module.scss";

interface BadgeProps {
	children: React.ReactNode;
	color?: string;
	additionalStyles?: CSSProperties;
}

export const Badge = ({ children, color, additionalStyles }: BadgeProps) => {
	return (
		<span
			className={`${cls.badge} ${cls.grayBadge}`}
			style={{
				...additionalStyles,
				background: color,
				color: "black",
				whiteSpace: "nowrap",
				borderRadius: "1rem",
			}}
		>
			{children}
		</span>
	);
};
