import type { CSSProperties } from "react";
import type { AnyObject } from "@/shared/types/types";

export const TableCell = ({
	value,
	styles,
	additionalData,
	navigateTo,
}: {
	value: string | number;
	styles?: CSSProperties;
	additionalData?: AnyObject;
	navigateTo?: () => void;
}) => {
	return (
		<div>
			<span style={{ ...styles }}>{value}</span>
			{navigateTo && (
				<button
					style={{
						height: "1rem",
					}}
					onClick={() => navigateTo()}
				>
					{additionalData?.ttile}
				</button>
			)}
		</div>
	);
};

type NavigateConfig = {
	label: string;
	onClick: (value: string | number, additionalData?: AnyObject) => void;
};

export const createActionButtonsRender =
	<T,>(buttons: NavigateConfig[]) =>
	(value: T, additionalData?: AnyObject): React.ReactNode => {
		return (
			<div
				style={{
					display: "flex",
					gap: "0.5rem",
					flexWrap: "wrap",
					flexDirection: "column",
				}}
			>
				{buttons.map((button) => (
					<button
						key={button.label}
						type="button"
						onClick={() =>
							button.onClick(value as string | number, additionalData)
						}
					>
						{button.label}
					</button>
				))}
			</div>
		);
	};
