import { afterEach, describe, expect, it, vi } from "vitest";
import { isLocalDevelopmentPreview, isProductionStandalone } from "./employee.sessions";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("local preview authentication boundary", () => {
	it.each(["localhost", "127.0.0.1", "[::1]"])("allows the top-level DEV preview only on explicit loopback host %s", (hostname) => {
		vi.stubEnv("DEV", true);
		expect(isLocalDevelopmentPreview(hostname)).toBe(true);
	});
	it.each(["crm.evolution-soft.ru", "localhost.evil.example", "192.168.1.10", "::1"])("never bypasses employee authentication on %s, even in a DEV build", (hostname) => {
		vi.stubEnv("DEV", true);
		expect(isLocalDevelopmentPreview(hostname)).toBe(false);
	});
	it("requires a production standalone session even on localhost", () => {
		vi.stubEnv("DEV", false);
		expect(isLocalDevelopmentPreview("localhost")).toBe(false);
		expect(isProductionStandalone()).toBe(true);
	});
	it("always uses the real SDK for an iframe, including a local DEV build", () => {
		vi.stubEnv("DEV", true);
		vi.stubGlobal("window", new Proxy(window, { get: (target, property, receiver) => property === "top" ? {} : Reflect.get(target, property, receiver) }));
		expect(isLocalDevelopmentPreview("localhost")).toBe(false);
		expect(isProductionStandalone()).toBe(false);
	});
});
