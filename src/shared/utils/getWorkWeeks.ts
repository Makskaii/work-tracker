export const getWorkWeeks = (
	month: number,
	year: number,
): { startOfTheWeek: string; endOfTheWeek: string }[] => {
	const weeks: { startOfTheWeek: string; endOfTheWeek: string }[] = [];
	const date = new Date(year, month, 1);
	const lastDay = new Date(year, month + 1, 0).getDate();

	let startOfCurrentWeek: number | null = null;

	for (let day = 1; day <= lastDay; day++) {
		date.setDate(day);
		const dayOfWeek = date.getDay(); // 0 — воскресенье, 1 — понедельник, ..., 6 — суббота

		// Рабочие дни — с понедельника по пятницу (1-5)
		const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;

		if (isWeekday) {
			if (startOfCurrentWeek === null) {
				// Начало новой рабочей недели
				startOfCurrentWeek = day;
			}
		} else {
			// Выходной день
			if (startOfCurrentWeek !== null) {
				// Завершаем текущую рабочую неделю
				weeks.push({
					startOfTheWeek: `${year}-${String(month + 1).padStart(2, "0")}-${String(startOfCurrentWeek).padStart(2, "0")}`,
					endOfTheWeek: `${year}-${String(month + 1).padStart(2, "0")}-${String(day - 1).padStart(2, "0")}`,
				});
				startOfCurrentWeek = null;
			}
		}
	}

	// Если месяц закончился, а рабочая неделя ещё не завершена
	if (startOfCurrentWeek !== null) {
		weeks.push({
			startOfTheWeek: `${year}-${String(month + 1).padStart(2, "0")}-${String(startOfCurrentWeek).padStart(2, "0")}`,
			endOfTheWeek: `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
		});
	}

	return weeks;
};
