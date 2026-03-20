import type { CSSProperties } from "react";
import cls from "./Spinner.module.scss";

export const Spinner = ({
	onlySpin = false,
	additionalStyles,
	text = "Загрузка...",
}: {
	onlySpin?: boolean;
	additionalStyles?: CSSProperties;
	text?: string;
}) => {
	return (
		<div className={cls.container}>
			{!onlySpin && <h3>{text}</h3>}
			<div
				className={cls.spinner}
				style={{
					...additionalStyles,
				}}
			></div>
		</div>
	);
};
