import dayjs from "dayjs";

/**
 * Возвращает граничные дни недели (начало и конец недели) для заданной даты.
 * Неделя начинается с понедельника и заканчивается воскресеньем.
 * Даже если дата приходится на 1-е число месяца и воскресенье, будет возвращена полная неделя.
 *
 * @param date - Дата в формате dayjs() или new Date
 * @returns Объект с началом и концом недели в формате строки 'YYYY-MM-DD'
 */
export const getWeekBorders = (
	date: dayjs.Dayjs | Date,
): { startOfTheWeek: string; endOfTheWeek: string } => {
	// Преобразуем входную дату в dayjs, если это объект Date
	const dayjsDate = dayjs.isDayjs(date) ? date : dayjs(date);

	// Получаем начало недели (понедельник)
	// dayjs по умолчанию считает воскресенье днём 0, понедельник — 1, ..., суббота — 6
	// Поэтому для понедельника используем .day(1), для воскресенья — .day(7)
	const startOfWeek = dayjsDate.day(1); // Понедельник
	const endOfWeek = dayjsDate.day(7); // Воскресенье

	return {
		startOfTheWeek: startOfWeek.format("YYYY-MM-DD"),
		endOfTheWeek: endOfWeek.format("YYYY-MM-DD"),
	};
};
