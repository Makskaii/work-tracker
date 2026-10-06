import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReportCodes } from "@/components/calendar/constants/const";
import type { ProfitabilityProject, ReportProject } from "./model/types";
import type { ReportProjectFormState } from "./model/reportProjectForm";
import { SalesProfitabilityReport } from "./SalesProfitabilityReport";

const state = vi.hoisted(() => ({
	projects: [] as unknown[],
	fetchProjects: vi.fn(),
	createProject: vi.fn(),
	updateProject: vi.fn(),
	uploadProjectFile: vi.fn(),
	fetchDetails: vi.fn(),
	navigate: vi.fn(),
	projectsError: null as string | null,
	reloadProjects: vi.fn(),
	fetchPayments: vi.fn(),
	fetchStages: vi.fn(),
	fetchEvents: vi.fn(),
}));
vi.mock("react-router", () => ({ useNavigate: () => state.navigate }));
vi.mock("@/shared/hooks/useBitrixSlider", () => ({
	useBitrixSlider: () => ({ openTask: vi.fn() }),
}));
vi.mock("./model/useCompanyProjects", () => ({
	useCompanyProjects: () => ({
		companyTitleById: new Map(),
		projects: state.projects,
		isLoadingDetails: false,
		error: state.projectsError,
		reloadProjects: state.reloadProjects,
	}),
	fetchProfitabilityProjectDetails: state.fetchDetails,
}));
vi.mock("./model/projectReports.api", async (importOriginal) => ({
	...(await importOriginal<typeof import("./model/projectReports.api")>()),
	fetchReportProjects: state.fetchProjects,
	createReportProject: state.createProject,
	updateReportProject: state.updateProject,
	uploadReportProjectFile: state.uploadProjectFile,
}));
vi.mock("./model/projectPayments.api", async (importOriginal) => ({
	...(await importOriginal<typeof import("./model/projectPayments.api")>()),
	fetchAutonomousProjectPayments: state.fetchPayments,
}));
vi.mock("./model/projectGantt.api", async (importOriginal) => ({
	...(await importOriginal<typeof import("./model/projectGantt.api")>()),
	fetchProjectGanttStages: state.fetchStages,
	fetchProjectGanttEvents: state.fetchEvents,
}));
vi.mock("./components/ProjectPlanningWorkspace", () => ({
	ProjectPlanningWorkspace: ({ project }: { project: ReportProject }) => (
		<div>План проекта {project.title}</div>
	),
}));
vi.mock("./components/DealProjectTeamCostTable", () => ({
	DealProjectTeamCostTable: () => (
		<div>Себестоимость по загруженным отчётам</div>
	),
}));
vi.mock("./components/ReportProjectModal", () => ({
	ReportProjectModal: ({ isOpen, form, onFormChange, onFileDraftChange, onSubmit, saving, projectFormError }: {
		isOpen: boolean;
		form: ReportProjectFormState;
		onFormChange: (form: ReportProjectFormState) => void;
		onFileDraftChange: (kind: "estimate", files: File[]) => void;
		onSubmit: () => void;
		saving: boolean;
		projectFormError: string | null;
	}) => isOpen ? <div>
		{projectFormError ? <p role="alert">{projectFormError}</p> : null}
		<button type="button" onClick={() => onFormChange({ ...form, title: "Новый проект", projectGoal: "Запустить CRM", clientCompanyId: "22", clientCompany: "Компания Бета" })}>Заполнить новый проект</button>
		<button type="button" onClick={() => onFormChange({ ...form, title: "Исправленный проект" })}>Изменить название проекта</button>
		<button type="button" onClick={() => onFileDraftChange("estimate", [new File(["estimate"], "estimate.pdf", { type: "application/pdf" })])}>Добавить файл проекта</button>
		<output data-testid="project-form-bitrix-id">{form.bitrixProjectId}</output>
		<button type="button" disabled={saving} onClick={onSubmit}>Сохранить новый проект</button>
	</div> : null,
}));
vi.mock("./components/ReportProjectDetailsTab", () => ({
	ReportProjectDetailsTab: () => null,
}));
vi.mock("./components/ProjectReportsTab", () => ({
	ProjectReportsTab: () => null,
}));
vi.mock("./components/TasksTab", () => ({ TasksTab: () => null }));
vi.mock("./components/ReportsTab", () => ({ ReportsTab: () => null }));
vi.mock("./components/AutonomousProjectGantt", () => ({
	DEFAULT_PAYMENT_FORM: {},
	calculatePaymentFields: vi.fn(),
	PaymentModal: () => null,
}));

const support = {
	id: 1,
	title: "ИП Балуев ТП",
	projectType: "support",
	bitrixProjectId: "98",
	projectStatus: "not_started",
} as ReportProject;
const waterfall = {
	id: 2,
	title: "ИП Балуев",
	projectType: "waterfall",
	bitrixProjectId: "77",
	projectStatus: "in_progress",
} as ReportProject;
const catalog = (project: ReportProject) =>
	({
		id: project.bitrixProjectId,
		projectId: project.bitrixProjectId,
		title: project.title,
		tasks: [],
		reports: [],
		payments: [],
	}) as unknown as ProfitabilityProject;
const props = { activities: [], deals: [], users: [] };

beforeEach(() => {
	vi.resetAllMocks();
	state.projects = [catalog(support), catalog(waterfall)];
	state.projectsError = null;
	state.fetchPayments.mockImplementation(async (projectId: string) => [
		{
			id: Number(projectId),
			projectId,
			stageId: 0,
			amount: 1000,
			status: "paid",
			paymentDate: "2026-10-01",
		},
	]);
	state.fetchStages.mockResolvedValue([]);
	state.fetchEvents.mockResolvedValue([]);
	state.fetchProjects.mockResolvedValue([support, waterfall]);
	state.fetchDetails.mockImplementation(
		async (project: ProfitabilityProject) => ({
			...project,
			reports: [
				{
					id: "501",
					begindate: "2026-09-30",
					assignedById: "3",
					[ReportCodes.timeSpent]: "12.5",
				},
			],
		}),
	);
});
afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

describe("Project report selection", () => {
	it("allows all-project payments without implicitly selecting a project", async () => {
		render(<SalesProfitabilityReport {...props} />);
		await screen.findByText(/Выберите проект в списке слева/);
		fireEvent.click(screen.getByRole("button", { name: "Список оплат" }));
		expect(
			screen.getByRole("heading", { name: "Список оплат" }),
		).toBeInTheDocument();
		expect(
			screen.getByText(/переключитесь на «Все проекты»/),
		).toBeInTheDocument();
		expect(state.fetchPayments).not.toHaveBeenCalled();
		fireEvent.click(screen.getByRole("button", { name: "Все проекты" }));
		await waitFor(() => expect(state.fetchPayments).toHaveBeenCalledTimes(2));
		expect(
			await screen.findByText(`${support.title} · Платёж`),
		).toBeInTheDocument();
		expect(screen.getByText(`${waterfall.title} · Платёж`)).toBeInTheDocument();
		expect(screen.getByText("Проектов").parentElement).toHaveTextContent("2");
		expect(
			screen.queryByRole("heading", { name: support.title }),
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole("heading", { name: waterfall.title }),
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "Создать платёж" }),
		).not.toBeInTheDocument();
		expect(state.fetchDetails).not.toHaveBeenCalled();
		fireEvent.click(screen.getByRole("button", { name: "Компания клиента" }));
		expect(
			screen.getByText(/переключитесь на «Все проекты»/),
		).toBeInTheDocument();
		expect(
			screen.queryByText(`${support.title} · Платёж`),
		).not.toBeInTheDocument();
	});

	it("selects a payment's own project when deliberately opening it from all payments", async () => {
		render(<SalesProfitabilityReport {...props} />);
		await screen.findByText(/Выберите проект в списке слева/);
		fireEvent.click(screen.getByRole("button", { name: "Список оплат" }));
		fireEvent.click(screen.getByRole("button", { name: "Все проекты" }));
		fireEvent.click(await screen.findByText(`${waterfall.title} · Платёж`));
		fireEvent.click(screen.getByRole("button", { name: "Проекты" }));
		expect(
			await screen.findByRole("heading", { name: waterfall.title }),
		).toBeInTheDocument();
		expect(state.fetchDetails).toHaveBeenCalledWith(
			expect.objectContaining({ projectId: "77" }),
			expect.any(AbortSignal),
		);
	});

	it("does not silently select the first support project on opening", async () => {
		render(<SalesProfitabilityReport {...props} />);
		expect(
			await screen.findByText(/Выберите проект в списке слева/),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("heading", { name: support.title }),
		).not.toBeInTheDocument();
		expect(
			screen.queryByText("Плотность работ по проекту"),
		).not.toBeInTheDocument();
		expect(state.fetchDetails).not.toHaveBeenCalled();
		fireEvent.click(
			screen.getByRole("button", { name: "Открыть общий план проектов" }),
		);
		expect(state.navigate).toHaveBeenCalledWith("/reports/projects-plan");
	});

	it("loads metrics for the explicitly selected waterfall, never for the first project", async () => {
		render(<SalesProfitabilityReport {...props} />);
		fireEvent.click(await screen.findByTitle(waterfall.title));
		expect(
			await screen.findByRole("heading", { name: waterfall.title }),
		).toBeInTheDocument();
		expect(
			screen.getByText(`План проекта ${waterfall.title}`),
		).toBeInTheDocument();
		expect(screen.getByText("Финансовый вотерфол проект")).toBeInTheDocument();
		expect(screen.getAllByText("12.5 ч").length).toBeGreaterThan(0);
		expect(state.fetchDetails).toHaveBeenCalledTimes(1);
		expect(state.fetchDetails).toHaveBeenCalledWith(
			expect.objectContaining({ projectId: "77" }),
			expect.any(AbortSignal),
		);
		expect(screen.queryByText("Купленные часы")).not.toBeInTheDocument();
	});

	it("shows real support metrics without a fabricated purchased-hours chart", async () => {
		render(<SalesProfitabilityReport {...props} />);
		fireEvent.click(await screen.findByTitle(support.title));
		expect(await screen.findByText("Проект техподдержки")).toBeInTheDocument();
		expect(screen.getByText("Плотность работ по проекту")).toBeInTheDocument();
		expect(screen.queryByText("Тестовая шкала часов")).not.toBeInTheDocument();
		expect(screen.queryByText("Купленные часы")).not.toBeInTheDocument();
		expect(
			screen.queryByText("Финансовый вотерфол проект"),
		).not.toBeInTheDocument();
	});

	it("shows a failure instead of zero metrics, and retries without losing the selected project", async () => {
		state.fetchDetails.mockRejectedValueOnce(new Error("Bitrix unavailable"));
		vi.spyOn(console, "error").mockImplementation(() => undefined);
		render(<SalesProfitabilityReport {...props} />);
		fireEvent.click(await screen.findByTitle(waterfall.title));
		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Показатели недоступны",
		);
		expect(
			screen.queryByText(
				"Нет ежедневных отчётов для построения плотности работ",
			),
		).not.toBeInTheDocument();
		expect(
			screen.queryByText("Себестоимость по загруженным отчётам"),
		).not.toBeInTheDocument();
		expect(
			screen.getByText(`План проекта ${waterfall.title}`),
		).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Повторить загрузку" }));
		await waitFor(() =>
			expect(screen.queryByRole("alert")).not.toBeInTheDocument(),
		);
		expect(
			await screen.findByRole("heading", { name: waterfall.title }),
		).toBeInTheDocument();
		expect(screen.getAllByText("12.5 ч").length).toBeGreaterThan(0);
		expect(state.fetchDetails).toHaveBeenCalledTimes(2);
	});

	it("does not display automatic metrics until the selected project's reports have loaded", async () => {
		let finishLoading: ((project: ProfitabilityProject) => void) | undefined;
		state.fetchDetails.mockImplementationOnce(
			() =>
				new Promise<ProfitabilityProject>((resolve) => {
					finishLoading = resolve;
				}),
		);
		render(<SalesProfitabilityReport {...props} />);
		fireEvent.click(await screen.findByTitle(waterfall.title));
		await waitFor(() => expect(state.fetchDetails).toHaveBeenCalledTimes(1));
		expect(
			screen.queryByRole("heading", { name: waterfall.title }),
		).not.toBeInTheDocument();
		expect(
			screen.queryByText("Плотность работ по проекту"),
		).not.toBeInTheDocument();
		finishLoading?.(catalog(waterfall));
		expect(
			await screen.findByRole("heading", { name: waterfall.title }),
		).toBeInTheDocument();
	});

	it("reports an unavailable project catalog and offers a reload", async () => {
		state.projects = [];
		state.projectsError = "Не удалось загрузить проекты Битрикс24";
		render(<SalesProfitabilityReport {...props} />);
		expect(await screen.findByRole("alert")).toHaveTextContent(
			state.projectsError,
		);
		fireEvent.click(screen.getByRole("button", { name: "Повторить загрузку" }));
		expect(state.reloadProjects).toHaveBeenCalledTimes(1);
		expect(state.fetchDetails).not.toHaveBeenCalled();
	});

	it("does not mistake a missing Bitrix project relation for zero reports", async () => {
		state.projects = [];
		render(<SalesProfitabilityReport {...props} />);
		fireEvent.click(await screen.findByTitle(waterfall.title));
		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Связанный проект Битрикс24 не найден",
		);
		expect(
			screen.queryByText("Плотность работ по проекту"),
		).not.toBeInTheDocument();
		fireEvent.click(
			screen.getByRole("button", { name: "Открыть детали проекта" }),
		);
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	});

	it("retains the creation request ID on a failed retry and refreshes Bitrix after successful creation", async () => {
		state.createProject.mockRejectedValueOnce({ response: { data: { message: "Временная ошибка подключения к Битрикс24" } } });
		state.createProject.mockResolvedValueOnce({ ...waterfall, id: 3, title: "Новый проект", bitrixProjectId: "79", clientCompanyId: "22", clientCompany: "Компания Бета", files: [] });
		render(<SalesProfitabilityReport {...props} />);
		fireEvent.click(await screen.findByTitle("Добавить проект"));
		fireEvent.click(screen.getByRole("button", { name: "Заполнить новый проект" }));
		fireEvent.click(screen.getByRole("button", { name: "Сохранить новый проект" }));
		expect(await screen.findByRole("alert")).toHaveTextContent("Временная ошибка подключения к Битрикс24");
		const firstRequestId = state.createProject.mock.calls[0][1];
		expect(firstRequestId).toMatch(/^[0-9a-f-]{36}$/);
		fireEvent.click(screen.getByRole("button", { name: "Сохранить новый проект" }));
		await waitFor(() => expect(state.createProject).toHaveBeenCalledTimes(2));
		expect(state.createProject.mock.calls[1][1]).toBe(firstRequestId);
		expect(state.createProject.mock.calls[1][0]).toMatchObject({ bitrixProjectId: null, clientCompanyId: "22", projectGoal: "Запустить CRM" });
		await waitFor(() => expect(state.reloadProjects).toHaveBeenCalledTimes(1));
		await waitFor(() => expect(screen.queryByRole("button", { name: "Сохранить новый проект" })).not.toBeInTheDocument());
	});

	it("keeps a successfully created project after attachment failure and retries edits via PATCH on the same project", async () => {
		const createdProject = { ...waterfall, id: 3, title: "Новый проект", bitrixProjectId: "79", clientCompanyId: "22", clientCompany: "Компания Бета", files: [] };
		state.projects = [...state.projects, catalog(createdProject)];
		state.createProject.mockResolvedValueOnce(createdProject);
		state.updateProject.mockImplementation(async (id, payload) => ({ ...createdProject, ...payload, id }));
		state.uploadProjectFile.mockRejectedValueOnce(new Error("attachment connection failed"));
		state.uploadProjectFile.mockResolvedValueOnce({ id: 101, projectId: 3, fileKind: "estimate", originalName: "estimate.pdf" });
		render(<SalesProfitabilityReport {...props} />);
		fireEvent.click(await screen.findByTitle("Добавить проект"));
		fireEvent.click(screen.getByRole("button", { name: "Заполнить новый проект" }));
		fireEvent.click(screen.getByRole("button", { name: "Добавить файл проекта" }));
		fireEvent.click(screen.getByRole("button", { name: "Сохранить новый проект" }));
		expect(await screen.findByRole("alert")).toHaveTextContent("Проект сохранён. Не удалось загрузить файлы");
		expect(screen.getByTestId("project-form-bitrix-id")).toHaveTextContent("79");
		expect(screen.getByTitle("Новый проект")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Изменить название проекта" }));
		fireEvent.click(screen.getByRole("button", { name: "Сохранить новый проект" }));
		await waitFor(() => expect(screen.queryByRole("button", { name: "Сохранить новый проект" })).not.toBeInTheDocument());
		expect(state.createProject).toHaveBeenCalledTimes(1);
		expect(state.updateProject).toHaveBeenCalledWith(3, expect.objectContaining({ title: "Исправленный проект", bitrixProjectId: "79", clientCompanyId: "22" }));
		expect(state.uploadProjectFile).toHaveBeenCalledTimes(2);
		expect(state.uploadProjectFile.mock.calls.map(([id]) => id)).toEqual([3, 3]);
		expect(screen.getByTitle("Исправленный проект")).toBeInTheDocument();
	});
});
