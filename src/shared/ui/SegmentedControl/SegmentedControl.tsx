import type { Period } from "@/shared/hooks/usePeriodBorders";
import styles from "./SegmentedControl.module.scss";

type SegmentedControlProps = {
	value: Period;
	onChange: (value: Period) => void;
	loading?: boolean;
	variant?: "dark" | "light";
};

const periodLabels: Record<Period, string> = {
	week: "Неделя",
	month: "Месяц",
	quarter: "Квартал",
	year: "Год",
};

export function SegmentedControl({
	value,
	onChange,
	loading,
	variant = "dark",
}: SegmentedControlProps) {
	const options: Period[] = ["week", "month", "quarter", "year"];
	const isLight = variant === "light";

	return (
		<div className={`${styles.segmented} ${isLight ? styles.segmentedLight : ""}`}>
			{options.map((option) => (
				<button
					disabled={loading}
					key={option}
					type="button"
					className={`${styles.segmentedItem} ${isLight ? styles.segmentedItemLight : ""} ${
						value === option ? styles.segmentedItemActive : ""
					}`}
					onClick={() => onChange(option)}
				>
					{periodLabels[option]}
				</button>
			))}
		</div>
	);
}
