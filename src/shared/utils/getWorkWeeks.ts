export const getWorkWeeks = (
	month: number,
	year: number,
): { startOfTheWeek: string; endOfTheWeek: string }[] => {
	const weeks: { startOfTheWeek: string; endOfTheWeek: string }[] = [];

	const firstDayOfMonth = new Date(year, month, 1);
	const lastDayOfMonth = new Date(year, month + 1, 0);

	const firstDayWeekday = firstDayOfMonth.getDay();

	const ruWeekday = firstDayWeekday === 0 ? 7 : firstDayWeekday;

	const firstMonday = new Date(firstDayOfMonth);
	if (ruWeekday !== 1) {
		const daysToMonday = ruWeekday - 1;
		firstMonday.setDate(firstDayOfMonth.getDate() - daysToMonday);
	}

	const currentDate = new Date(firstMonday);

	while (currentDate <= lastDayOfMonth || currentDate.getMonth() === month) {
		const weekStart = new Date(currentDate);
		const weekEnd = new Date(currentDate);
		weekEnd.setDate(weekEnd.getDate() + 6);

		let hasWorkDaysInMonth = false;

		for (let i = 0; i <= 4; i++) {
			const checkDate = new Date(weekStart);
			checkDate.setDate(weekStart.getDate() + i);

			if (checkDate.getMonth() === month) {
				hasWorkDaysInMonth = true;
				break;
			}
		}

		if (hasWorkDaysInMonth) {
			weeks.push({
				startOfTheWeek: formatLocalDate(weekStart),
				endOfTheWeek: formatLocalDate(weekEnd),
			});
		}

		currentDate.setDate(currentDate.getDate() + 7);
	}

	return weeks;
};

const formatLocalDate = (date: Date): string => {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
};
