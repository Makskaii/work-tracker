import dayjs from "dayjs";
/**
 * Возвращает граничные дни спринта (начало и конец) для заданной даты.
 * Спринт начинается во вторник и заканчивается в понедельник следующей недели.
 *
 * @param date - Дата в формате dayjs() или new Date
 * @returns Объект с началом и концом спринта в формате строки 'YYYY-MM-DD'
 */
export const getSprintWeekBorders = (
	date: dayjs.Dayjs | Date,
): { startOfTheWeek: string; endOfTheWeek: string } => {
	const dayjsDate = dayjs.isDayjs(date) ? date : dayjs(date);

	//  (0 - воскресенье, 1 - понедельник, ..., 6 - суббота)
	const currentDay = dayjsDate.day();

	// начало спринта (ближайший вторник)
	// Если сегодня вторник или позже, берём текущий вторник
	// Если сегодня раньше вторника (воскресенье, понедельник), берём прошлый вторник
	let startOfSprint;
	if (currentDay >= 2) {
		// 2 - это вторник
		// Если сегодня вторник или позже, берём текущий вторник
		startOfSprint = dayjsDate.day(2);
	} else {
		startOfSprint = dayjsDate.day(-5);
	}

	const endOfSprint = startOfSprint.add(6, "day");

	return {
		startOfTheWeek: startOfSprint.format("YYYY-MM-DD"),
		endOfTheWeek: endOfSprint.format("YYYY-MM-DD"),
	};
};
