import { afterEach, describe, expect, it, vi } from "vitest";
import type { GroupedReportFields } from "@/shared/types/table";
import { ReportCodes, ReportStageIds } from "../constants/const";
import type { ReportProps } from "../types/types";
import { generateMonthDays } from "./generateMonthDays";
import {
	buildWeekCalendarFromGroupedReports,
	buildWeekCalendarFromReports,
} from "./generateWeek";

const makeReport = (
	id: string,
	day: string,
	timeSpent = "2",
	stageId: string = ReportStageIds.confirmed,
): GroupedReportFields => ({
	id,
	day,
	timeSpent,
	stageId,
	title: "Задача",
	assignedById: "1",
	taskId: "10",
	parentId: 10,
	project: 20,
	client: 30,
	activity: 269,
});

afterEach(() => vi.useRealTimers());

describe("calendar generation", () => {
	it("groups the period once instead of scanning every report for every day", () => {
		let dateReads = 0;
		const reports = Array.from({ length: 1000 }, (_, index) => ({
			...makeReport(String(index), "2026-10-05T12:00:00"),
			get day() {
				dateReads += 1;
				return "2026-10-05T12:00:00";
			},
		}));
		const days = generateMonthDays({
			selectedYear: 2026,
			selectedMonth: 9,
			reports,
		});
		expect(dateReads).toBe(reports.length);
		expect(days.find((day) => day.dayNumber === 5)?.totalHours).toBe(2000);
	});

	it("preserves local dates, stage totals, weekdays, today and week padding", () => {
		vi.useFakeTimers({ toFake: ["Date"] });
		vi.setSystemTime(new Date(2026, 8, 29, 9, 30));
		const confirmed = makeReport("1", "2026-09-28T00:00:00", "4");
		const unconfirmed = makeReport(
			"2",
			"2026-09-28T23:59:59",
			"3",
			ReportStageIds.unconfirmed,
		);
		const days = generateMonthDays({
			selectedYear: 2026,
			selectedMonth: 8,
			reports: [confirmed, unconfirmed],
		});
		expect(days).toHaveLength(35);
		expect(days[0]).toMatchObject({ date: null, isEmpty: true });
		expect(days[1]).toMatchObject({ dayNumber: 1, dayName: "вт" });
		expect(days.find((day) => day.dayNumber === 28)).toMatchObject({
			date: new Date(2026, 8, 28),
			dayName: "пн",
			fullDayName: "понедельник",
			totalHours: 4,
			unconfirmedHours: 3,
			reports: [confirmed, unconfirmed],
			confirmedReports: [confirmed],
			unconfirmedReports: [unconfirmed],
		});
		expect(days.find((day) => day.dayNumber === 29)?.isToday).toBe(true);
		expect(days.find((day) => day.dayNumber === 27)?.isWeekend).toBe(true);
		expect(days.at(-1)).toMatchObject({ date: null, isCurrentMonth: false });
	});

	it("uses the same week boundaries and hours for raw and normalized reports", () => {
		const reports = [
			makeReport("1", "2026-12-31T12:00:00", "4"),
			makeReport("2", "2027-01-01T12:00:00", "3"),
		];
		const rawReports = reports.map(
			(report) =>
				({
					id: report.id,
					begindate: report.day,
					[ReportCodes.timeSpent]: report.timeSpent,
				}) as ReportProps,
		);
		const range = {
			startOfTheWeek: "2026-12-28",
			endOfTheWeek: "2027-01-03",
		};
		const groupedDays = buildWeekCalendarFromGroupedReports(reports, range);
		const rawDays = buildWeekCalendarFromReports(
			rawReports,
			range,
			ReportCodes.timeSpent,
		);
		expect(groupedDays).toHaveLength(7);
		expect(groupedDays.map((day) => ({ ...day, reports: [] }))).toEqual(
			rawDays.map((day) => ({ ...day, reports: [] })),
		);
		expect(groupedDays[3].reports).toEqual([reports[0]]);
		expect(groupedDays[4]).toMatchObject({
			id: "2027-01-01",
			isCurrentMonth: false,
			totalHours: 3,
		});
	});
});
