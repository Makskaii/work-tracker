import type { CSSProperties } from "react";
import cls from "./Button.module.scss";

interface BadgeProps {
	children: React.ReactNode;
	color: "blue" | "green" | "yellow" | "gray";
	additionalStyles?: CSSProperties;
}

export const Badge = ({ children, color, additionalStyles }: BadgeProps) => {
	const badgeClass =
		color === "blue"
			? cls.blueBadge
			: color === "green"
				? cls.greenBadge
				: color === "yellow"
					? cls.yellowBadge
					: cls.grayBadge;
	return (
		<span
			className={`${cls.badge} ${badgeClass}`}
			style={{
				...additionalStyles,
			}}
		>
			{children}
		</span>
	);
};
