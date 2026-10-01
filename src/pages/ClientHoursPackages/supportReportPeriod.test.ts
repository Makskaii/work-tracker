import { afterEach, describe, expect, it, vi } from "vitest";
import {
	initialReportPeriod,
	isCalendarDate,
	moscowToday,
	validateReportPeriod,
} from "./supportReportPeriod";

afterEach(() => vi.useRealTimers());

describe("client report calendar period", () => {
	it("uses Moscow's date when UTC still belongs to the previous day", () => {
		vi.setSystemTime(new Date("2026-10-01T22:30:00Z"));
		expect(moscowToday()).toBe("2026-10-02");
	});
	it("starts at the purchase date and finishes today", () => {
		expect(
			initialReportPeriod("2026-09-01T00:00:00.000Z", "2026-10-01"),
		).toEqual({
			dateFrom: "2026-09-01",
			dateTo: "2026-10-01",
		});
	});
	it.each([
		null,
		undefined,
		"not a date",
		"2026-02-30",
		"2026-10-02",
	])("uses a valid initial period when purchase date is %s", (purchaseDate) => {
		expect(initialReportPeriod(purchaseDate, "2026-10-01")).toEqual({
			dateFrom: "2026-10-01",
			dateTo: "2026-10-01",
		});
	});
	it.each([
		"2026-02-29",
		"2026-04-31",
		"2026-13-01",
		"0000-01-01",
		"2026-9-1",
	])("rejects a non-calendar date %s", (value) =>
		expect(isCalendarDate(value)).toBe(false));
	it("accepts leap days only in leap years", () => {
		expect(isCalendarDate("2024-02-29")).toBe(true);
		expect(isCalendarDate("2026-02-28")).toBe(true);
	});
	it.each([
		[{ dateFrom: "", dateTo: "2026-10-01" }, "Укажите обе даты периода."],
		[{ dateFrom: "2026-09-01", dateTo: "" }, "Укажите обе даты периода."],
		[
			{ dateFrom: "2026-02-30", dateTo: "2026-10-01" },
			"Укажите корректные даты периода.",
		],
		[
			{ dateFrom: "2026-09-20", dateTo: "2026-09-19" },
			"Начало периода не может быть позже окончания.",
		],
		[
			{ dateFrom: "2026-09-01", dateTo: "2026-10-02" },
			"Период не может быть позже сегодняшнего дня.",
		],
		[
			{ dateFrom: "2026-10-02", dateTo: "2026-10-03" },
			"Период не может быть позже сегодняшнего дня.",
		],
	])("validates %j before requesting the PDF", (period, error) => {
		expect(validateReportPeriod(period, "2026-10-01")).toBe(error);
	});
	it("accepts inclusive one-day and historical periods", () => {
		expect(
			validateReportPeriod(
				{ dateFrom: "2026-10-01", dateTo: "2026-10-01" },
				"2026-10-01",
			),
		).toBeNull();
		expect(
			validateReportPeriod(
				{ dateFrom: "2026-09-01", dateTo: "2026-09-30" },
				"2026-10-01",
			),
		).toBeNull();
	});
});
