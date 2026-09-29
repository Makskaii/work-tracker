import { describe, expect, it } from "vitest";
import { formatUserFields, normalizeUserActive } from "./formatUserFilds";

describe("Bitrix ACTIVE normalization", () => {
	it.each([true, "Y", 1, "1"] as const)("maps %s to active", (value) => {
		expect(normalizeUserActive(value)).toBe(true);
	});

	it.each([
		false,
		"N",
		0,
		"0",
	] as const)("preserves %s as inactive", (value) => {
		expect(normalizeUserActive(value)).toBe(false);
	});

	it("does not guess when ACTIVE was omitted", () => {
		expect(normalizeUserActive(undefined)).toBeUndefined();
		expect(formatUserFields({ ID: "12" }).isActive).toBeUndefined();
	});

	it("propagates explicit false through user formatting", () => {
		expect(formatUserFields({ ID: "12", ACTIVE: false }).isActive).toBe(false);
	});
});
