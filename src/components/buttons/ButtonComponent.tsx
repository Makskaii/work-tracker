import type { CSSProperties } from "react";
import cls from "./Button.module.scss";

interface ButtopProps {
	text: string;
	onClick?: () => void;
	additionalStyles?: CSSProperties;
}

export const Button = ({ text, onClick, additionalStyles }: ButtopProps) => {
	return (
		<button
			onClick={onClick}
			className={cls.button}
			style={{
				...additionalStyles,
			}}
			role="button"
		>
			{text}
		</button>
	);
};
