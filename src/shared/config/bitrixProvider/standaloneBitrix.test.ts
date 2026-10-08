import { beforeEach, describe, expect, it, vi } from "vitest";
import { createStandaloneBitrix } from "./standaloneBitrix";

const request = vi.hoisted(() => vi.fn());
vi.mock("../axios/axios.config", () => ({ $api: { post: request } }));
beforeEach(() => request.mockReset());

describe("standalone SDK-compatible calls", () => {
	it("returns the authenticated user's native identity for report attribution", async () => {
		request.mockResolvedValue({ data: { result: { ID: "89", UF_DEPARTMENT: [26] } }, status: 200 });
		const b24 = createStandaloneBitrix();
		const result = await b24.actions.v2.call.make<{ ID: string } >({ method: "user.current" });
		expect(result.isSuccess).toBe(true);
		expect(result.getData()?.result.ID).toBe("89");
		expect(request).toHaveBeenCalledExactlyOnceWith("user.current", {});
		expect(b24.auth).toBeUndefined();
	});
	it("preserves SDK error handling for failed smart-process writes", async () => {
		request.mockResolvedValue({ data: { error: "ACCESS_DENIED", error_description: "Недостаточно прав" }, status: 200 });
		const result = await createStandaloneBitrix().actions.v2.call.make({ method: "crm.item.update", params: { entityTypeId: 1060, id: 5, fields: { title: "Работа" } } });
		expect(result.isSuccess).toBe(false);
		expect(result.getErrorMessages().join(" ")).toContain("Недостаточно прав");
		expect(result.getData()).toBeUndefined();
	});
});
