import { describe, expect, it } from "vitest";
import { ActivityType } from "../constants/const";
import { getCalendarDayState } from "./calendarDayState";

const now = new Date(2026, 8, 29, 9, 30);
const work = { activity: ActivityType.development };
const absence = { activity: ActivityType.notAtWork };

const state = (
	date: Date | null,
	reports: { activity: number }[] = [],
	isPadding = false,
) => getCalendarDayState({ date, reports, now, isPadding });

describe("calendar day state", () => {
	it("leaves month padding blank regardless of date or reports", () => {
		expect(state(null)).toBe("blank");
		expect(state(new Date(2026, 8, 30), [absence], true)).toBe("blank");
	});

	it("keeps future days gray even when reports or absence are scheduled", () => {
		for (const reports of [[], [work], [absence]]) {
			expect(state(new Date(2026, 8, 30), reports)).toBe("future");
		}
	});

	it("compares local calendar dates rather than report times", () => {
		expect(state(new Date(2026, 8, 29, 23, 59))).toBe("missing");
		expect(state(new Date(2026, 8, 29, 23, 59), [work])).toBe("reported");
	});

	it("marks today and past weekdays without reports red", () => {
		for (const date of [new Date(2026, 8, 29), new Date(2026, 8, 28)]) {
			expect(state(date)).toBe("missing");
		}
	});

	it("keeps empty past and present weekends gray", () => {
		for (const date of [new Date(2026, 8, 26), new Date(2026, 8, 27)]) {
			expect(state(date)).toBe("weekend");
			expect(getCalendarDayState({ date, reports: [], now: date })).toBe(
				"weekend",
			);
		}
	});

	it("uses report and absence states on weekends that contain reports", () => {
		for (const date of [new Date(2026, 8, 26), new Date(2026, 8, 27)]) {
			expect(state(date, [work])).toBe("reported");
			expect(state(date, [work, absence])).toBe("absence");
		}
	});

	it("keeps the future state ahead of weekend and scheduled report states", () => {
		for (const reports of [[], [work], [absence]]) {
			expect(state(new Date(2026, 9, 3), reports)).toBe("future");
		}
	});

	it("counts any report, including unconfirmed zero-hour reports, as reported", () => {
		const unconfirmed = { ...work, stageId: "unconfirmed", timeSpent: "0" };
		expect(state(new Date(2026, 8, 29), [unconfirmed])).toBe("reported");
	});

	it("gives any absence precedence over other reports in the same scope", () => {
		expect(state(new Date(2026, 8, 28), [work, absence, work])).toBe("absence");
		expect(state(new Date(2026, 8, 28), [absence])).toBe("absence");
	});
});
