import type { CSSProperties } from "react";
import cls from "./Spinner.module.scss";

export const Spinner = ({
	onlySpin = false,
	additionalStyles,
}: {
	onlySpin?: boolean;
	additionalStyles?: CSSProperties;
}) => {
	return (
		<div className={cls.container}>
			{!onlySpin && <h3>Загрузка...</h3>}
			<div
				className={cls.spinner}
				style={{
					...additionalStyles,
				}}
			></div>
		</div>
	);
};
