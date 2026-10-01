import type { SupportPackageReportPeriod } from "./clientHoursPackages.api";

export const moscowToday = () =>
	new Intl.DateTimeFormat("en-CA", {
		timeZone: "Europe/Moscow",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(new Date());

export const isCalendarDate = (value: string) => {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number(value.slice(0, 4)) === 0)
		return false;
	const date = new Date(`${value}T00:00:00Z`);
	return (
		!Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
	);
};

export const validateReportPeriod = (
	period: SupportPackageReportPeriod,
	today: string,
): string | null => {
	if (!period.dateFrom || !period.dateTo) return "Укажите обе даты периода.";
	if (!isCalendarDate(period.dateFrom) || !isCalendarDate(period.dateTo))
		return "Укажите корректные даты периода.";
	if (period.dateFrom > period.dateTo)
		return "Начало периода не может быть позже окончания.";
	if (period.dateFrom > today || period.dateTo > today)
		return "Период не может быть позже сегодняшнего дня.";
	return null;
};

export const initialReportPeriod = (
	purchaseDate: string | null | undefined,
	today: string,
): SupportPackageReportPeriod => {
	const purchaseDay = purchaseDate?.slice(0, 10) ?? "";
	return {
		dateFrom:
			isCalendarDate(purchaseDay) && purchaseDay <= today ? purchaseDay : today,
		dateTo: today,
	};
};
