import dayjs from "dayjs";
import { describe, expect, it } from "vitest";
import {
	formatWeekChip,
	formatWeekTitle,
	getMonthWeekRanges,
	getWeekRange,
} from "./calendarPeriod";

describe("calendar periods", () => {
	it("anchors both Monday and Sunday to the same Monday–Sunday week", () => {
		const expected = {
			startOfTheWeek: "2026-09-21",
			endOfTheWeek: "2026-09-27",
		};
		expect(getWeekRange(dayjs("2026-09-21"))).toEqual(expected);
		expect(getWeekRange(dayjs("2026-09-27T23:59:59"))).toEqual(expected);
	});

	it("includes the leading and trailing partial weeks of September", () => {
		const ranges = getMonthWeekRanges(dayjs("2026-09-29"));
		expect(ranges).toHaveLength(5);
		expect(ranges[0]).toEqual({
			startOfTheWeek: "2026-08-31",
			endOfTheWeek: "2026-09-06",
		});
		expect(ranges.at(-1)).toEqual({
			startOfTheWeek: "2026-09-28",
			endOfTheWeek: "2026-10-04",
		});
	});

	it("includes all six weeks when the month starts on Sunday", () => {
		const ranges = getMonthWeekRanges(dayjs("2026-11-15"));
		expect(ranges).toHaveLength(6);
		expect(ranges[0]?.startOfTheWeek).toBe("2026-10-26");
		expect(ranges.at(-1)?.endOfTheWeek).toBe("2026-12-06");
	});

	it("handles an exact four-week February and leap day", () => {
		expect(getMonthWeekRanges(dayjs("2021-02-15"))).toHaveLength(4);
		expect(getWeekRange(dayjs("2024-02-29"))).toEqual({
			startOfTheWeek: "2024-02-26",
			endOfTheWeek: "2024-03-03",
		});
	});

	it("formats same-month and cross-month ranges without hiding a month", () => {
		const sameMonth = getWeekRange(dayjs("2026-09-23"));
		const crossMonth = getWeekRange(dayjs("2026-09-29"));
		expect(formatWeekChip(sameMonth)).toBe("21–27 сент.");
		expect(formatWeekTitle(sameMonth)).toBe("21–27 сентября 2026");
		expect(formatWeekChip(crossMonth)).toBe("28 сент.–4 окт.");
		expect(formatWeekTitle(crossMonth)).toBe("28 сентября – 4 октября 2026");
	});

	it("shows both years for a week spanning New Year", () => {
		const range = getWeekRange(dayjs("2027-01-01"));
		expect(range).toEqual({
			startOfTheWeek: "2026-12-28",
			endOfTheWeek: "2027-01-03",
		});
		expect(formatWeekChip(range)).toBe("28 дек. 2026–3 янв. 2027");
		expect(formatWeekTitle(range)).toBe("28 декабря 2026 – 3 января 2027");
	});
});
