import type { DayHourDeficit } from "./helpers/dayHourDeficits";
import cls from "./DayHoursWarning.module.scss";

const formatHours = (hours: number) =>
	`${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(hours)} ч`;

export const describeDayHourDeficits = (deficits: readonly DayHourDeficit[]) =>
	deficits
		.map(
			(employee) =>
				`${employee.title}: ${formatHours(employee.hours)} из 8 ч, не хватает ${formatHours(employee.missingHours)}`,
		)
		.join("; ");

export const DayHoursWarning = ({
	deficits,
	isIndividual = false,
}: {
	deficits: readonly DayHourDeficit[];
	isIndividual?: boolean;
}) => {
	if (!deficits.length) return null;
	return (
		<div className={cls.warning} title={describeDayHourDeficits(deficits)}>
			{isIndividual
				? `Не хватает ${formatHours(deficits[0].missingHours)}`
				: `Меньше 8 ч: ${deficits.length}`}
		</div>
	);
};

export const DayHoursSummary = ({
	deficits,
}: {
	deficits: readonly DayHourDeficit[];
}) => {
	if (!deficits.length) return null;
	return (
		<section className={cls.summary} aria-label="Недостающие часы">
			<h4>Не закрыта норма 8 часов</h4>
			<p>Учитываются подтверждённые отчёты, включая Not at work.</p>
			<ul>
				{deficits.map((employee) => (
					<li key={employee.userId}>
						<span>{employee.title}</span>
						<span>
							{formatHours(employee.hours)} из 8 ч{" "}
							<strong>−{formatHours(employee.missingHours)}</strong>
						</span>
					</li>
				))}
			</ul>
		</section>
	);
};
