import { beforeEach, describe, expect, it, vi } from "vitest";
import { createReportProject, updateReportProject } from "./projectReports.api";

const backend = vi.hoisted(() => ({ post: vi.fn(), patch: vi.fn() }));
vi.mock("@/shared/config/axios/axios.config", () => ({ $backendApi: backend }));
beforeEach(() => vi.resetAllMocks());

describe("project link API", () => {
	it("creates a company and project through one request and uses the authoritative returned company ID and name", async () => {
		backend.post.mockResolvedValue({ data: { id: 3, title: "Проект", bitrixProjectId: "79", clientCompanyId: "23", clientCompany: "Новая компания" } });
		const result = await createReportProject({ title: "Проект", newCompanyTitle: "Новая компания", clientCompanyId: null }, "1b1f7b64-34f1-4ac2-b88a-2a0371bf1fbd");
		expect(backend.post).toHaveBeenCalledWith("project-reports/projects", { title: "Проект", newCompanyTitle: "Новая компания", clientCompanyId: null, creationRequestId: "1b1f7b64-34f1-4ac2-b88a-2a0371bf1fbd" });
		expect(result).toMatchObject({ clientCompanyId: "23", clientCompany: "Новая компания", files: [] });
	});
	it("sends the selected company ID and the retained request ID only on create", async () => {
		backend.post.mockResolvedValue({ data: { id: 1, title: "Проект", bitrixProjectId: "77", clientCompanyId: "11" } });
		const result = await createReportProject({ title: "Проект", clientCompanyId: "11" }, "1b1f7b64-34f1-4ac2-b88a-2a0371bf1fbd");
		expect(backend.post).toHaveBeenCalledWith("project-reports/projects", { title: "Проект", clientCompanyId: "11", creationRequestId: "1b1f7b64-34f1-4ac2-b88a-2a0371bf1fbd" });
		expect(result).toMatchObject({ bitrixProjectId: "77", clientCompanyId: "11", files: [] });
	});
	it("preserves partial updates and normalizes a legacy missing company ID", async () => {
		backend.patch.mockResolvedValue({ data: { id: 2, title: "Старый проект" } });
		const result = await updateReportProject(2, { projectStatus: "completed" });
		expect(backend.patch).toHaveBeenCalledWith("project-reports/projects/2", { projectStatus: "completed" });
		expect(result.clientCompanyId).toBeNull();
	});
});
