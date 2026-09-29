import { describe, expect, it } from "vitest";
import type { GroupedReportFields } from "@/shared/types/table";
import type { User } from "@/shared/types/types";
import { ActivityType, ReportStageIds } from "../constants/const";
import { getDayHourDeficits } from "./dayHourDeficits";

const now = new Date(2026, 8, 29, 9, 30);
const pastWeekday = new Date(2026, 8, 28, 23, 59);
const user = (
	id: string,
	isActive?: boolean,
): Pick<User, "id" | "title" | "isActive"> => ({
	id,
	title: `Employee ${id}`,
	isActive,
});
const report = (
	assignedById: string,
	timeSpent: string,
	stageId: string = ReportStageIds.confirmed,
): Pick<GroupedReportFields, "assignedById" | "timeSpent" | "stageId"> => ({
	assignedById,
	timeSpent,
	stageId,
});
const deficits = (
	reports: Parameters<typeof getDayHourDeficits>[0]["reports"] = [],
	users: Parameters<typeof getDayHourDeficits>[0]["users"] = [user("1", true)],
) => getDayHourDeficits({ date: pastWeekday, reports, users, now });

describe("daily reporting deficits", () => {
	it("shows the missing hours below eight and no warning at or above eight", () => {
		for (const hours of [0, 7.5, 8, 9]) {
			expect(deficits([report("1", String(hours))])).toEqual(
				hours < 8
					? [
							{
								userId: "1",
								title: "Employee 1",
								hours,
								missingHours: 8 - hours,
							},
						]
					: [],
			);
		}
	});

	it("does not let one employee's overtime cover another employee's deficit", () => {
		expect(
			deficits([report("1", "12"), report("2", "4")], [user("1"), user("2")]),
		).toEqual([
			{ userId: "2", title: "Employee 2", hours: 4, missingHours: 4 },
		]);
	});

	it("counts work and Not at work hours equally toward the eight-hour day", () => {
		const work = { ...report("1", "6"), activity: ActivityType.development };
		const absence = { ...report("1", "2"), activity: ActivityType.notAtWork };
		expect(deficits([work, absence])).toEqual([]);
		expect(deficits([{ ...absence, timeSpent: "8" }])).toEqual([]);
	});

	it("checks only past local weekdays, excluding today, future, weekends and padding", () => {
		for (const date of [
			null,
			new Date(2026, 8, 29, 0, 0),
			new Date(2026, 8, 29, 23, 59),
			new Date(2026, 8, 30),
			new Date(2026, 8, 26),
			new Date(2026, 8, 27),
		]) {
			expect(
				getDayHourDeficits({ date, reports: [], users: [user("1")], now }),
			).toEqual([]);
		}
		expect(
			getDayHourDeficits({
				date: pastWeekday,
				reports: [],
				users: [user("1")],
				now,
				isPadding: true,
			}),
		).toEqual([]);
	});

	it("checks active and unknown-status employees even without any reports", () => {
		expect(deficits([], [user("1", true), user("2")])).toEqual([
			{ userId: "1", title: "Employee 1", hours: 0, missingHours: 8 },
			{ userId: "2", title: "Employee 2", hours: 0, missingHours: 8 },
		]);
	});

	it("includes former employees only on days with a report, even if unconfirmed", () => {
		expect(
			deficits(
				[report("2", "3"), report("3", "8", ReportStageIds.unconfirmed)],
				[user("1", false), user("2", false), user("3", false)],
			),
		).toEqual([
			{ userId: "2", title: "Employee 2", hours: 3, missingHours: 5 },
			{ userId: "3", title: "Employee 3", hours: 0, missingHours: 8 },
		]);
	});

	it("ignores outsiders and deduplicates the selected employee scope", () => {
		expect(
			deficits([report("1", "3"), report("2", "2")], [user("1"), user("1")]),
		).toEqual([
			{ userId: "1", title: "Employee 1", hours: 3, missingHours: 5 },
		]);
		expect(deficits([report("2", "2")], [])).toEqual([]);
	});

	it("accepts decimal commas and ignores negative, invalid and infinite values", () => {
		expect(
			deficits(
				["6,5", "bad", "-2", "Infinity", "-Infinity", "1e309"].map((hours) =>
					report("1", hours),
				),
			),
		).toEqual([
			{ userId: "1", title: "Employee 1", hours: 6.5, missingHours: 1.5 },
		]);
	});

	it("does not warn about floating-point underflow and rounds displayed deficits", () => {
		expect(
			deficits(Array.from({ length: 80 }, () => report("1", "0.1"))),
		).toEqual([]);
		expect(deficits([report("1", "7.7"), report("1", "0.1")])).toEqual([
			{ userId: "1", title: "Employee 1", hours: 7.8, missingHours: 0.2 },
		]);
	});

	it("counts confirmed reports only", () => {
		expect(
			deficits([
				report("1", "3"),
				report("1", "5", ReportStageIds.unconfirmed),
				report("1", "10", "other"),
			]),
		).toEqual([
			{ userId: "1", title: "Employee 1", hours: 3, missingHours: 5 },
		]);
	});
});
