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
import { SalesProfitabilityReport } from "./SalesProfitabilityReport";

const state = vi.hoisted(() => ({
	projects: [] as unknown[],
	fetchProjects: vi.fn(),
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
	ReportProjectModal: () => null,
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
});
