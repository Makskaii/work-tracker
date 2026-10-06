const shortWeekday = new Intl.DateTimeFormat("ru-RU", { weekday: "short" });
const longWeekday = new Intl.DateTimeFormat("ru-RU", { weekday: "long" });
const dayTitle = new Intl.DateTimeFormat("ru-RU", {
	day: "numeric",
	month: "long",
	weekday: "long",
});
const fullDate = new Intl.DateTimeFormat("ru-RU", {
	day: "numeric",
	month: "long",
	year: "numeric",
});

export const getLocalCalendarDateKey = (date: Date) =>
	`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export const formatShortWeekday = (date: Date) => shortWeekday.format(date);
export const formatLongWeekday = (date: Date) => longWeekday.format(date);
export const formatCalendarDayTitle = (date: Date) => dayTitle.format(date);
export const formatCalendarFullDate = (date: Date) => fullDate.format(date);
