import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchSupportHoursPackageReport } from "./clientHoursPackages.api";

const { post } = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock("@/shared/config/axios/axios.config", () => ({
	$backendApi: { post },
}));
beforeEach(() => {
	post.mockReset();
});

describe("support package PDF endpoint", () => {
	it("requests a PDF for one package without sending period or all-package filters", async () => {
		const pdf = new Blob(["%PDF-1.4 test"], { type: "application/pdf" });
		post.mockResolvedValue({ data: pdf });
		expect(await fetchSupportHoursPackageReport(42)).toBe(pdf);
		expect(post).toHaveBeenCalledExactlyOnceWith(
			"support-hours-packages/42/report",
			{},
			{
				responseType: "blob",
				headers: { Accept: "application/pdf" },
				timeout: 120_000,
			},
		);
	});
	it("propagates a server failure so the UI can show an error", async () => {
		const error = new Error("Unable to generate PDF");
		post.mockRejectedValue(error);
		await expect(fetchSupportHoursPackageReport(42)).rejects.toBe(error);
	});
});
