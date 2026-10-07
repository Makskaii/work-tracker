import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReportCodes, TaskCodes } from "@/components/calendar/constants/const";
import { B24Context } from "@/shared/config/bitrixProvider/bitrixContext";
import type { ProfitabilityProject, ReportProject } from "./model/types";
import type { CompanyCreationMode, ReportProjectFormState } from "./model/reportProjectForm";
import { DEFAULT_REPORT_NAVIGATION, getReportNavigationStorageKey, writeReportNavigation } from "./model/reportNavigation";
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
	projectsLoading: false,
	projectsRefreshing: false,
	reloadProjects: vi.fn(),
	fetchPayments: vi.fn(),
	fetchStages: vi.fn(),
	fetchEvents: vi.fn(),
	updateBlocker: vi.fn(),
	acquireUpdateBlocker: vi.fn(),
	releaseUpdateBlocker: vi.fn(),
	catalogueOptions: vi.fn(),
	clearCache: vi.fn(),
}));
vi.mock("@/shared/config/axios/axios.config", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/shared/config/axios/axios.config")>()),
	clearBitrixReadCache: state.clearCache,
}));
vi.mock("@/shared/lib/appUpdates", () => ({
	useAppUpdateBlocker: state.updateBlocker,
	acquireAppUpdateBlocker: state.acquireUpdateBlocker,
}));
vi.mock("react-router", () => ({ useNavigate: () => state.navigate }));
vi.mock("@/shared/hooks/useBitrixSlider", () => ({
	useBitrixSlider: () => ({ openTask: vi.fn() }),
}));
vi.mock("./model/useCompanyProjects", () => ({
	useCompanyProjects: (options: unknown) => { state.catalogueOptions(options); return {
		companyTitleById: new Map(),
		projects: state.projects,
		isLoadingDetails: state.projectsLoading,
		isRefreshing: state.projectsRefreshing,
		error: state.projectsError,
		reloadProjects: state.reloadProjects,
	}; },
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
	ProjectPlanningWorkspace: ({ project, showProgress }: { project: ReportProject; showProgress?: boolean }) => (
		<div>План проекта {project.title}{showProgress ? <span>Прогресс проекта</span> : null}</div>
	),
}));
vi.mock("./components/DealProjectTeamCostTable", () => ({
	DealProjectTeamCostTable: () => (
		<div>Себестоимость по загруженным отчётам</div>
	),
}));
vi.mock("./components/ReportProjectModal", () => ({
	ReportProjectModal: ({ isOpen, form, onFormChange, onFileDraftChange, onSubmit, onClose, saving, projectFormError, companyCreationMode, onCompanyCreationModeChange, newCompanyTitle, onNewCompanyTitleChange }: {
		isOpen: boolean;
		form: ReportProjectFormState;
		onFormChange: (form: ReportProjectFormState) => void;
		onFileDraftChange: (kind: "estimate", files: File[]) => void;
		onSubmit: () => void;
		onClose: () => void;
		saving: boolean;
		projectFormError: string | null;
		companyCreationMode: CompanyCreationMode;
		onCompanyCreationModeChange: (mode: CompanyCreationMode) => void;
		newCompanyTitle: string;
		onNewCompanyTitleChange: (title: string) => void;
	}) => isOpen ? <div>
		{projectFormError ? <p role="alert">{projectFormError}</p> : null}
		<input aria-label="Куплено часов" value={form.summaryPurchasedHours} onChange={(event) => onFormChange({ ...form, summaryPurchasedHours: event.target.value })} />
		<input aria-label="Дата начала проекта" value={form.projectStartDate} onChange={(event) => onFormChange({ ...form, projectStartDate: event.target.value })} />
		<input aria-label="Дата окончания проекта" value={form.contractEndDate} onChange={(event) => onFormChange({ ...form, contractEndDate: event.target.value })} />
		<button type="button" onClick={() => onFormChange({ ...form, title: "Новый проект", projectGoal: "Запустить CRM", clientCompanyId: "22", clientCompany: "Компания Бета" })}>Заполнить новый проект</button>
		<button type="button" onClick={() => {
			onCompanyCreationModeChange("new");
			onNewCompanyTitleChange("  Новая компания  ");
			onFormChange({ ...form, title: "Новый проект", projectGoal: "Запустить CRM", clientCompanyId: "", clientCompany: "" });
		}}>Создать проект с новой компанией</button>
		<button type="button" onClick={() => onFormChange({ ...form, title: "Исправленный проект" })}>Изменить название проекта</button>
		<button type="button" onClick={() => onFileDraftChange("estimate", [new File(["estimate"], "estimate.pdf", { type: "application/pdf" })])}>Добавить файл проекта</button>
		<output data-testid="project-form-bitrix-id">{form.bitrixProjectId}</output>
		<output data-testid="project-company-draft">{JSON.stringify({ companyCreationMode, newCompanyTitle, clientCompanyId: form.clientCompanyId, clientCompany: form.clientCompany })}</output>
		<button type="button" disabled={saving} onClick={onSubmit}>Сохранить новый проект</button>
		<button type="button" onClick={onClose}>Закрыть форму проекта</button>
	</div> : null,
}));
vi.mock("./components/ReportProjectDetailsTab", () => ({
	ReportProjectDetailsTab: ({ project, form, onFormChange, onSave, bitrixProjectsError, detailsProjectError }: { project: ReportProject; form: ReportProjectFormState; onFormChange: (form: ReportProjectFormState) => void; onSave: () => void; bitrixProjectsError?: string | null; detailsProjectError?: string | null }) => <div>
		<p>Детали: {project.title}</p>
		{bitrixProjectsError ? <p role="alert">{bitrixProjectsError}</p> : null}
		{detailsProjectError ? <p role="alert">{detailsProjectError}</p> : null}
		<input aria-label="Куплено часов" value={form.summaryPurchasedHours} onChange={(event) => onFormChange({ ...form, summaryPurchasedHours: event.target.value })} />
		<input aria-label="Дата начала проекта" value={form.projectStartDate} onChange={(event) => onFormChange({ ...form, projectStartDate: event.target.value })} />
		<input aria-label="Дата окончания проекта" value={form.contractEndDate} onChange={(event) => onFormChange({ ...form, contractEndDate: event.target.value })} />
		<button type="button" onClick={onSave}>Сохранить детали</button>
		<output data-testid="saved-project-link">{JSON.stringify({ bitrixProjectId: form.bitrixProjectId, clientCompanyId: form.clientCompanyId, clientCompany: form.clientCompany })}</output>
		<button type="button" onClick={() => onFormChange({ ...form, title: "Несохранённое название" })}>Изменить детали</button>
	</div>,
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
	window.sessionStorage.clear();
	state.acquireUpdateBlocker.mockReturnValue(state.releaseUpdateBlocker);
	state.projects = [catalog(support), catalog(waterfall)];
	state.projectsError = null;
	state.projectsLoading = false;
	state.projectsRefreshing = false;
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
			tasks: [],
			payments: [],
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
	vi.unstubAllEnvs();
});

describe("Project report selection", () => {
	it("clears a restored support selection outside payments without selecting another project", async () => {
		const storageKey = getReportNavigationStorageKey({ origin: window.location.origin, pathname: import.meta.env.BASE_URL }, 42);
		writeReportNavigation(storageKey, { ...DEFAULT_REPORT_NAVIGATION, selectedProjectId: "db-1", activeTab: "projectDetails" });
		render(<B24Context.Provider value={{ b24: null, status: "ready", currentUserId: 42 }}><SalesProfitabilityReport {...props} /></B24Context.Provider>);
		await screen.findByText(/Выберите проект в списке слева/);
		expect(screen.queryByTitle(support.title)).not.toBeInTheDocument();
		expect(screen.getByTitle(waterfall.title)).toBeInTheDocument();
		expect(state.fetchDetails).not.toHaveBeenCalled();
		await waitFor(() => expect(JSON.parse(window.sessionStorage.getItem(storageKey) ?? "{}")).toMatchObject({ selectedProjectId: null, activeTab: "projects" }));
	});
	it("keeps support payments editable and clears support selection when returning to project reports", async () => {
		render(<SalesProfitabilityReport {...props} />);
		await screen.findByText(/Выберите проект в списке слева/);
		fireEvent.click(screen.getByRole("button", { name: "Список оплат" }));
		fireEvent.click(screen.getByRole("button", { name: "Все проекты" }));
		fireEvent.click(await screen.findByText(`${support.title} · Платёж`));
		expect(screen.getByRole("button", { name: "Создать платёж" })).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Детали проекта" }));
		await screen.findByText(/Выберите проект в списке слева/);
		expect(screen.queryByText(`Детали: ${support.title}`)).not.toBeInTheDocument();
		expect(state.fetchDetails).not.toHaveBeenCalled();
		expect(screen.getByTitle(waterfall.title)).toBeInTheDocument();
	});
	it.each(["create", "edit", "details"] as const)("validates bought hours and project date range before saving from %s", async (view) => {
		render(<SalesProfitabilityReport {...props} />);
		if (view === "create") {
			fireEvent.click(await screen.findByTitle("Добавить проект"));
			fireEvent.click(screen.getByRole("button", { name: "Заполнить новый проект" }));
		} else {
			fireEvent.click(await screen.findByTitle(waterfall.title));
			await screen.findByText("Себестоимость по загруженным отчётам");
			if (view === "edit") fireEvent.click(screen.getByRole("button", { name: "Изменить проект" }));
			else fireEvent.click(screen.getByRole("button", { name: "Детали проекта" }));
		}
		const saveLabel = view === "details" ? "Сохранить детали" : "Сохранить новый проект";
		fireEvent.change(screen.getByLabelText("Куплено часов"), { target: { value: "-1" } });
		fireEvent.click(screen.getByRole("button", { name: saveLabel }));
		expect(screen.getByRole("alert")).toHaveTextContent("не меньше нуля");
		expect(state.createProject).not.toHaveBeenCalled();
		expect(state.updateProject).not.toHaveBeenCalled();
		fireEvent.change(screen.getByLabelText("Куплено часов"), { target: { value: "0" } });
		fireEvent.change(screen.getByLabelText("Дата начала проекта"), { target: { value: "2026-10-08" } });
		fireEvent.change(screen.getByLabelText("Дата окончания проекта"), { target: { value: "2026-10-07" } });
		fireEvent.click(screen.getByRole("button", { name: saveLabel }));
		expect(screen.getByRole("alert")).toHaveTextContent("раньше даты начала");
		expect(state.createProject).not.toHaveBeenCalled();
		expect(state.updateProject).not.toHaveBeenCalled();
	});
	it("keeps a newly created support project out of the report list while retaining it for all payments", async () => {
		const created = { ...support, id: 3, title: "Новый проект", files: [] };
		state.createProject.mockResolvedValueOnce(created);
		render(<SalesProfitabilityReport {...props} />);
		fireEvent.click(await screen.findByTitle("Добавить проект"));
		fireEvent.click(screen.getByRole("button", { name: "Заполнить новый проект" }));
		fireEvent.click(screen.getByRole("button", { name: "Сохранить новый проект" }));
		await waitFor(() => expect(screen.queryByRole("button", { name: "Сохранить новый проект" })).not.toBeInTheDocument());
		expect(screen.queryByTitle(created.title)).not.toBeInTheDocument();
		expect(screen.queryByText(`Детали: ${created.title}`)).not.toBeInTheDocument();
		expect(screen.getByRole("button", { name: /Все проекты/ })).toHaveTextContent("1");
		fireEvent.click(screen.getByRole("button", { name: "Список оплат" }));
		fireEvent.click(screen.getByRole("button", { name: "Все проекты" }));
		expect(await screen.findByText(`${created.title} · Платёж`)).toBeInTheDocument();
		expect(screen.getByText("Проектов").parentElement).toHaveTextContent("3");
	});
	it.each([0, 40.5])("submits bought hours %s and the contract date at creation and reopens the saved values", async (hours) => {
		state.createProject.mockImplementationOnce(async (payload) => ({ ...waterfall, ...payload, id: 3, bitrixProjectId: "79", files: [] }));
		render(<SalesProfitabilityReport {...props} />);
		fireEvent.click(await screen.findByTitle("Добавить проект"));
		fireEvent.click(screen.getByRole("button", { name: "Заполнить новый проект" }));
		fireEvent.change(screen.getByLabelText("Куплено часов"), { target: { value: String(hours) } });
		fireEvent.change(screen.getByLabelText("Дата начала проекта"), { target: { value: "2026-10-07" } });
		fireEvent.change(screen.getByLabelText("Дата окончания проекта"), { target: { value: "2026-12-31" } });
		fireEvent.click(screen.getByRole("button", { name: "Сохранить новый проект" }));
		await screen.findByText("Детали: Новый проект");
		expect(state.createProject).toHaveBeenCalledWith(expect.objectContaining({ summaryPurchasedHours: hours, projectStartDate: "2026-10-07", contractEndDate: "2026-12-31" }), expect.any(String));
		await waitFor(() => expect(screen.getByLabelText("Куплено часов")).toHaveValue(String(hours)));
		expect(screen.getByLabelText("Дата окончания проекта")).toHaveValue("2026-12-31");
		fireEvent.click(screen.getByRole("button", { name: "Проекты" }));
		await screen.findByText("Себестоимость по загруженным отчётам");
		expect(screen.getByText("Куплено:").parentElement).toHaveTextContent(`${hours} ч`);
		expect(screen.getByText("31.12")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Изменить проект" }));
		expect(screen.getByLabelText("Куплено часов")).toHaveValue(String(hours));
		expect(screen.getByLabelText("Дата окончания проекта")).toHaveValue("2026-12-31");
	});
	it("keeps the local list, project dates, edit action and plan available while users and the CRM catalogue are pending", async () => {
		state.projects = [];
		state.projectsLoading = true;
		state.fetchProjects.mockResolvedValue([{ ...waterfall, contractEndDate: "2026-10-30", summaryPurchasedHours: 40 }]);
		state.fetchDetails.mockImplementation(() => new Promise<ProfitabilityProject>(() => undefined));
		render(<SalesProfitabilityReport {...props} loading />);
		await screen.findByText(/Выберите проект в списке слева/);
		expect(state.catalogueOptions).toHaveBeenLastCalledWith({ enabled: false });
		fireEvent.click(screen.getByTitle(waterfall.title));
		expect(await screen.findByRole("heading", { name: waterfall.title })).toBeInTheDocument();
		expect(screen.getByText(`План проекта ${waterfall.title}`)).toBeInTheDocument();
		expect(screen.getByText("30.10")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Изменить проект" })).toBeEnabled();
		expect(screen.getByRole("status")).toHaveTextContent("Загружаем задачи");
		expect(screen.queryByText("Себестоимость по загруженным отчётам")).not.toBeInTheDocument();
		await waitFor(() => expect(state.fetchDetails).toHaveBeenCalledTimes(1));
		expect(state.fetchDetails).toHaveBeenCalledWith(expect.objectContaining({ projectId: "77" }), expect.any(AbortSignal));
		expect(state.catalogueOptions).toHaveBeenLastCalledWith({ enabled: false });
		fireEvent.click(screen.getByRole("button", { name: "Изменить проект" }));
		expect(state.catalogueOptions).toHaveBeenLastCalledWith({ enabled: true });
	});

	it("preserves title matching for a legacy project without a numeric link", async () => {
		state.fetchProjects.mockResolvedValue([{ ...waterfall, bitrixProjectId: null }]);
		render(<SalesProfitabilityReport {...props} />);
		fireEvent.click(await screen.findByTitle(waterfall.title));
		expect(await screen.findByText("Себестоимость по загруженным отчётам")).toBeInTheDocument();
		expect(state.catalogueOptions).toHaveBeenLastCalledWith({ enabled: true });
		expect(state.fetchDetails).toHaveBeenCalledWith(expect.objectContaining({ projectId: "77" }), expect.any(AbortSignal));
	});

	it("shows an employee-loading error in statistics, keeps the plan available, and retries employees independently", async () => {
		const retryUsers = vi.fn();
		render(<SalesProfitabilityReport {...props} usersError="Сотрудники недоступны" onRetryUsers={retryUsers} />);
		fireEvent.click(await screen.findByTitle(waterfall.title));
		expect(await screen.findByRole("alert")).toHaveTextContent("Сотрудники недоступны");
		expect(screen.getByText(`План проекта ${waterfall.title}`)).toBeInTheDocument();
		expect(screen.queryByText("Себестоимость по загруженным отчётам")).not.toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Повторить загрузку сотрудников" }));
		expect(retryUsers).toHaveBeenCalledTimes(1);
	});
	it.each([0, 40])("keeps the saved purchased-hour budget %s when Bitrix tasks have a different value", async (hours) => {
		state.fetchProjects.mockResolvedValue([{ ...waterfall, summaryPurchasedHours: hours }]);
		state.fetchDetails.mockImplementation(async (project: ProfitabilityProject) => ({ ...project, tasks: [{ id: "9", [TaskCodes.hours]: 1234 }], reports: [] }));
		render(<SalesProfitabilityReport {...props} />);
		fireEvent.click(await screen.findByTitle(waterfall.title));
		await waitFor(() => expect(state.fetchDetails).toHaveBeenCalled());
		await waitFor(() => expect(screen.getByText("Куплено:").parentElement).toHaveTextContent(String(hours)));
		expect(screen.getByText("Куплено:").parentElement).not.toHaveTextContent("1234");
	});
	it("keeps initial project and tab actions unavailable until saved navigation restoration commits", async () => {
		const storageKey = getReportNavigationStorageKey({ origin: window.location.origin, pathname: import.meta.env.BASE_URL }, 42);
		writeReportNavigation(storageKey, { ...DEFAULT_REPORT_NAVIGATION, selectedProjectId: "db-2", activeTab: "projectDetails" });
		let finishLoading: ((projects: ReportProject[]) => void) | undefined;
		state.fetchProjects.mockImplementationOnce(() => new Promise<ReportProject[]>((resolve) => { finishLoading = resolve; }));
		const getStoredValue = Storage.prototype.getItem;
		let actionsAvailableDuringRestoration: { project: boolean; create: boolean; tab: boolean; plan: boolean } | undefined;
		vi.spyOn(Storage.prototype, "getItem").mockImplementation(function (this: Storage, key: string) {
			if (key === storageKey && !actionsAvailableDuringRestoration) {
				actionsAvailableDuringRestoration = {
					project: Boolean(screen.queryByTitle(waterfall.title)),
					create: Boolean(screen.queryByTitle("Добавить проект")),
					tab: !screen.getByRole("button", { name: "Проекты" }).hasAttribute("disabled"),
					plan: !screen.getByRole("button", { name: /Все проекты/ }).hasAttribute("disabled"),
				};
			}
			return getStoredValue.call(this, key);
		});
		render(<B24Context.Provider value={{ b24: null, status: "ready", currentUserId: 42 }}><SalesProfitabilityReport {...props} /></B24Context.Provider>);
		expect(screen.queryByTitle(waterfall.title)).not.toBeInTheDocument();
		expect(screen.queryByTitle("Добавить проект")).not.toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Проекты" })).toBeDisabled();
		expect(screen.getByRole("button", { name: /Все проекты/ })).toBeDisabled();
		await act(async () => { finishLoading?.([support, waterfall]); });
		expect(actionsAvailableDuringRestoration).toEqual({ project: false, create: false, tab: false, plan: false });
		expect(await screen.findByText(`Детали: ${waterfall.title}`)).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Проекты" })).toBeEnabled();
		expect(screen.getByTitle("Добавить проект")).toBeEnabled();
		expect(screen.queryByTitle(support.title)).not.toBeInTheDocument();
	});

	it("becomes ready with default navigation when production has no user-scoped storage key", async () => {
		vi.stubEnv("DEV", false);
		const storageRead = vi.spyOn(Storage.prototype, "getItem");
		render(<B24Context.Provider value={{ b24: null, status: "ready", currentUserId: null }}><SalesProfitabilityReport {...props} /></B24Context.Provider>);
		expect(await screen.findByText(/Выберите проект в списке слева/)).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Проекты" })).toBeEnabled();
		expect(screen.getByTitle("Добавить проект")).toBeEnabled();
		expect(storageRead).not.toHaveBeenCalled();
		fireEvent.click(screen.getByTitle(waterfall.title));
		expect(await screen.findByRole("heading", { name: waterfall.title })).toBeInTheDocument();
	});

	it("restores the selected project and detail tab after loading the current user's project list", async () => {
		const storageKey = getReportNavigationStorageKey({ origin: window.location.origin, pathname: import.meta.env.BASE_URL }, 42);
		const report = () => <B24Context.Provider value={{ b24: null, status: "ready", currentUserId: 42 }}><SalesProfitabilityReport {...props} /></B24Context.Provider>;
		const firstRender = render(report());
		fireEvent.click(await screen.findByTitle(waterfall.title));
		fireEvent.click(screen.getByRole("button", { name: "Детали проекта" }));
		await screen.findByText(`Детали: ${waterfall.title}`);
		await waitFor(() => expect(JSON.parse(window.sessionStorage.getItem(storageKey) ?? "{}")).toMatchObject({ selectedProjectId: "db-2", activeTab: "projectDetails" }));
		firstRender.unmount();
		state.fetchDetails.mockClear();
		let finishLoading: ((projects: ReportProject[]) => void) | undefined;
		state.fetchProjects.mockImplementationOnce(() => new Promise<ReportProject[]>((resolve) => { finishLoading = resolve; }));
		render(report());
		expect(screen.queryByText(`Детали: ${waterfall.title}`)).not.toBeInTheDocument();
		expect(JSON.parse(window.sessionStorage.getItem(storageKey) ?? "{}")).toMatchObject({ selectedProjectId: "db-2" });
		finishLoading?.([support, waterfall]);
		expect(await screen.findByText(`Детали: ${waterfall.title}`)).toBeInTheDocument();
		expect(screen.queryByText(`Детали: ${support.title}`)).not.toBeInTheDocument();
		expect(state.fetchDetails).not.toHaveBeenCalled();
	});

	it("clears an unavailable restored project without selecting another project or hiding the list", async () => {
		const storageKey = getReportNavigationStorageKey({ origin: window.location.origin, pathname: import.meta.env.BASE_URL }, 42);
		writeReportNavigation(storageKey, { ...DEFAULT_REPORT_NAVIGATION, selectedProjectId: "db-999", activeTab: "tasks" });
		render(<B24Context.Provider value={{ b24: null, status: "ready", currentUserId: 42 }}><SalesProfitabilityReport {...props} /></B24Context.Provider>);
		await screen.findByText(/Выберите проект в списке слева/);
		expect(screen.queryByTitle(support.title)).not.toBeInTheDocument();
		expect(screen.getByTitle(waterfall.title)).toBeInTheDocument();
		await waitFor(() => expect(JSON.parse(window.sessionStorage.getItem(storageKey) ?? "{}")).toMatchObject({ selectedProjectId: null, activeTab: "projects" }));
		expect(state.fetchDetails).not.toHaveBeenCalled();
	});

	it("does not reuse another signed-in user's project selection", async () => {
		const anotherUsersKey = getReportNavigationStorageKey({ origin: window.location.origin, pathname: import.meta.env.BASE_URL }, 41);
		writeReportNavigation(anotherUsersKey, { ...DEFAULT_REPORT_NAVIGATION, selectedProjectId: "db-2", activeTab: "projectDetails" });
		render(<B24Context.Provider value={{ b24: null, status: "ready", currentUserId: 42 }}><SalesProfitabilityReport {...props} /></B24Context.Provider>);
		await screen.findByText(/Выберите проект в списке слева/);
		expect(screen.queryByText(`Детали: ${waterfall.title}`)).not.toBeInTheDocument();
		expect(state.fetchDetails).not.toHaveBeenCalled();
	});

	it("keeps the saved selection when the project list cannot be loaded", async () => {
		const storageKey = getReportNavigationStorageKey({ origin: window.location.origin, pathname: import.meta.env.BASE_URL }, 42);
		writeReportNavigation(storageKey, { ...DEFAULT_REPORT_NAVIGATION, selectedProjectId: "db-2", activeTab: "projectDetails" });
		state.fetchProjects.mockRejectedValueOnce(new Error("Project list unavailable"));
		render(<B24Context.Provider value={{ b24: null, status: "ready", currentUserId: 42 }}><SalesProfitabilityReport {...props} /></B24Context.Provider>);
		await screen.findByText(/Выберите проект в списке слева/);
		expect(JSON.parse(window.sessionStorage.getItem(storageKey) ?? "{}")).toMatchObject({ selectedProjectId: "db-2", activeTab: "projectDetails" });
	});

	it("holds automatic updates while a project form is open and releases them after closing", async () => {
		render(<SalesProfitabilityReport {...props} />);
		fireEvent.click(await screen.findByTitle("Добавить проект"));
		expect(state.updateBlocker).toHaveBeenLastCalledWith(true);
		fireEvent.click(screen.getByRole("button", { name: "Закрыть форму проекта" }));
		await waitFor(() => expect(state.updateBlocker).toHaveBeenLastCalledWith(false));
	});

	it("keeps dirty project details protected even after switching to another tab", async () => {
		render(<SalesProfitabilityReport {...props} />);
		fireEvent.click(await screen.findByTitle(waterfall.title));
		await screen.findByText("Себестоимость по загруженным отчётам");
		fireEvent.click(screen.getByRole("button", { name: "Детали проекта" }));
		fireEvent.click(await screen.findByRole("button", { name: "Изменить детали" }));
		expect(state.updateBlocker).toHaveBeenLastCalledWith(true);
		fireEvent.click(screen.getByRole("button", { name: "Задачи" }));
		expect(state.updateBlocker).toHaveBeenLastCalledWith(true);
	});

	it("acquires a synchronous update blocker until a save fails or finishes", async () => {
		let rejectSave: ((error: Error) => void) | undefined;
		state.createProject.mockImplementationOnce(() => new Promise<ReportProject>((_, reject) => { rejectSave = reject; }));
		render(<SalesProfitabilityReport {...props} />);
		fireEvent.click(await screen.findByTitle("Добавить проект"));
		fireEvent.click(screen.getByRole("button", { name: "Заполнить новый проект" }));
		fireEvent.click(screen.getByRole("button", { name: "Сохранить новый проект" }));
		expect(state.acquireUpdateBlocker).toHaveBeenCalledTimes(1);
		expect(state.releaseUpdateBlocker).not.toHaveBeenCalled();
		rejectSave?.(new Error("save failed"));
		await screen.findByRole("alert");
		await waitFor(() => expect(state.releaseUpdateBlocker).toHaveBeenCalledTimes(1));
		expect(state.updateBlocker).toHaveBeenLastCalledWith(true);
	});

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
		expect((await screen.findAllByText("12.5 ч")).length).toBeGreaterThan(0);
		expect(state.fetchDetails).toHaveBeenCalledTimes(1);
		expect(state.fetchDetails).toHaveBeenCalledWith(
			expect.objectContaining({ projectId: "77" }),
			expect.any(AbortSignal),
		);
		expect(screen.queryByText("Купленные часы")).not.toBeInTheDocument();
	});

	it("shows progress for projects with an unselected type and excludes support from the report list", async () => {
		const untyped = { ...waterfall, id: 3, title: "МСК Энерго", projectType: "none" } as ReportProject;
		state.fetchProjects.mockResolvedValue([support, waterfall, untyped]);
		render(<SalesProfitabilityReport {...props} />);
		fireEvent.click(await screen.findByTitle(untyped.title));
		expect(await screen.findByRole("heading", { name: untyped.title })).toBeInTheDocument();
		expect(screen.getByText("Прогресс проекта")).toBeInTheDocument();
		expect(screen.queryByTitle(support.title)).not.toBeInTheDocument();
		expect(screen.getByRole("button", { name: /Все проекты/ })).toHaveTextContent("2");
		expect(screen.getByRole("button", { name: /^Все\s?2$/ })).toBeInTheDocument();
		expect(await screen.findByText("Плотность работ по проекту")).toBeInTheDocument();
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
		expect(state.clearCache).toHaveBeenCalledWith(["crm.item.list"]);
		await waitFor(() =>
			expect(screen.queryByRole("alert")).not.toBeInTheDocument(),
		);
		expect(
			await screen.findByRole("heading", { name: waterfall.title }),
		).toBeInTheDocument();
		expect((await screen.findAllByText("12.5 ч")).length).toBeGreaterThan(0);
		expect(state.fetchDetails).toHaveBeenCalledTimes(2);
	});

	it("shows the local project and plan while CRM reports are pending, without displaying zero metrics", async () => {
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
		).toBeInTheDocument();
		expect(screen.getByText(`План проекта ${waterfall.title}`)).toBeInTheDocument();
		expect(screen.getByRole("status")).toHaveTextContent("Загружаем задачи");
		expect(screen.queryByText("Себестоимость по загруженным отчётам")).not.toBeInTheDocument();
		expect(
			screen.queryByText("Плотность работ по проекту"),
		).not.toBeInTheDocument();
		finishLoading?.(catalog(waterfall));
		expect(await screen.findByText("Себестоимость по загруженным отчётам")).toBeInTheDocument();
	});

	it("keeps the local project list available despite a catalogue error and shows that error in the link form", async () => {
		state.projects = [];
		state.projectsError = "Не удалось загрузить проекты Битрикс24";
		render(<SalesProfitabilityReport {...props} />);
		await screen.findByText(/Выберите проект в списке слева/);
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
		fireEvent.click(screen.getByTitle(waterfall.title));
		fireEvent.click(screen.getByRole("button", { name: "Детали проекта" }));
		expect(await screen.findByRole("alert")).toHaveTextContent(
			state.projectsError,
		);
	});

	it("does not mistake a missing Bitrix project relation for zero reports", async () => {
		state.projects = [];
		state.fetchProjects.mockResolvedValue([{ ...waterfall, bitrixProjectId: null }]);
		render(<SalesProfitabilityReport {...props} />);
		fireEvent.click(await screen.findByTitle(waterfall.title));
		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Выберите связанный проект Битрикс24",
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

	it("opens the saved project immediately while the CRM catalogue is still loading, without loading unrelated metrics", async () => {
		const createdProject = { ...waterfall, id: 3, title: "Новый проект", bitrixProjectId: "79", clientCompanyId: "23", clientCompany: "Новая компания", files: [] };
		state.createProject.mockResolvedValueOnce(createdProject);
		state.reloadProjects.mockImplementation(() => { state.projectsLoading = true; });
		render(<SalesProfitabilityReport {...props} />);
		fireEvent.click(await screen.findByTitle("Добавить проект"));
		fireEvent.click(screen.getByRole("button", { name: "Создать проект с новой компанией" }));
		fireEvent.click(screen.getByRole("button", { name: "Сохранить новый проект" }));
		expect(await screen.findByText("Детали: Новый проект")).toBeInTheDocument();
		await waitFor(() => expect(screen.queryByRole("button", { name: "Сохранить новый проект" })).not.toBeInTheDocument());
		expect(JSON.parse(screen.getByTestId("saved-project-link").textContent ?? "{}")).toEqual({ bitrixProjectId: "79", clientCompanyId: "23", clientCompany: "Новая компания" });
		expect(screen.getByTitle("Новый проект")).toBeInTheDocument();
		expect(state.reloadProjects).toHaveBeenCalledTimes(1);
		expect(state.fetchProjects).toHaveBeenCalledTimes(1);
		expect(state.fetchDetails).not.toHaveBeenCalled();
		expect(state.fetchPayments).not.toHaveBeenCalled();
		expect(state.fetchStages).not.toHaveBeenCalled();
		expect(state.fetchEvents).not.toHaveBeenCalled();
		await waitFor(() => expect(state.updateBlocker).toHaveBeenLastCalledWith(false));
		expect(state.releaseUpdateBlocker).toHaveBeenCalledTimes(1);
	});

	it("preserves a newer project and tab choice made while creation is pending", async () => {
		let finishCreation: ((project: ReportProject) => void) | undefined;
		state.createProject.mockImplementationOnce(() => new Promise<ReportProject>((resolve) => { finishCreation = resolve; }));
		render(<SalesProfitabilityReport {...props} />);
		fireEvent.click(await screen.findByTitle("Добавить проект"));
		fireEvent.click(screen.getByRole("button", { name: "Заполнить новый проект" }));
		fireEvent.click(screen.getByRole("button", { name: "Сохранить новый проект" }));
		fireEvent.click(screen.getByTitle(waterfall.title));
		fireEvent.click(screen.getByRole("button", { name: "Детали проекта" }));
		expect(await screen.findByText(`Детали: ${waterfall.title}`)).toBeInTheDocument();
		finishCreation?.({ ...waterfall, id: 3, title: "Новый проект", bitrixProjectId: "79", clientCompanyId: "22", clientCompany: "Компания Бета", files: [] });
		await waitFor(() => expect(screen.queryByRole("button", { name: "Сохранить новый проект" })).not.toBeInTheDocument());
		expect(screen.getByText(`Детали: ${waterfall.title}`)).toBeInTheDocument();
		expect(screen.queryByText("Детали: Новый проект")).not.toBeInTheDocument();
		expect(screen.getByTitle("Новый проект")).toBeInTheDocument();
		expect(state.reloadProjects).toHaveBeenCalledTimes(1);
	});

	it("uses the new project's numeric link without waiting for the background catalogue refresh", async () => {
		const createdProject = { ...waterfall, id: 3, title: "Новый проект", bitrixProjectId: "79", clientCompanyId: "22", clientCompany: "Компания Бета", files: [] };
		state.createProject.mockResolvedValueOnce(createdProject);
		state.reloadProjects.mockImplementation(() => { state.projectsRefreshing = true; });
		const view = render(<SalesProfitabilityReport {...props} />);
		fireEvent.click(await screen.findByTitle("Добавить проект"));
		fireEvent.click(screen.getByRole("button", { name: "Заполнить новый проект" }));
		fireEvent.click(screen.getByRole("button", { name: "Сохранить новый проект" }));
		expect(await screen.findByText("Детали: Новый проект")).toBeInTheDocument();
		await waitFor(() => expect(screen.queryByRole("button", { name: "Сохранить новый проект" })).not.toBeInTheDocument());
		fireEvent.click(screen.getByRole("button", { name: "Проекты" }));
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
		expect(await screen.findByRole("heading", { name: createdProject.title })).toBeInTheDocument();
		await waitFor(() => expect(state.fetchDetails).toHaveBeenCalledTimes(1));
		expect(state.fetchDetails).toHaveBeenCalledWith(expect.objectContaining({ projectId: "79" }), expect.any(AbortSignal));
		state.projects = [...state.projects, catalog(createdProject)];
		state.projectsRefreshing = false;
		view.rerender(<SalesProfitabilityReport {...props} />);
		expect(await screen.findByRole("heading", { name: createdProject.title })).toBeInTheDocument();
		expect(state.fetchDetails).toHaveBeenCalledTimes(1);
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	});

	it("keeps saved details and authoritative company visible when the background catalogue refresh fails", async () => {
		const refreshError = "Не удалось обновить каталог Битрикс24";
		const createdProject = { ...waterfall, id: 3, title: "Новый проект", bitrixProjectId: "79", clientCompanyId: "23", clientCompany: "Новая компания", files: [] };
		state.createProject.mockResolvedValueOnce(createdProject);
		state.reloadProjects.mockImplementation(() => { state.projectsError = refreshError; });
		render(<SalesProfitabilityReport {...props} />);
		fireEvent.click(await screen.findByTitle("Добавить проект"));
		fireEvent.click(screen.getByRole("button", { name: "Создать проект с новой компанией" }));
		fireEvent.click(screen.getByRole("button", { name: "Сохранить новый проект" }));
		expect(await screen.findByText("Детали: Новый проект")).toBeInTheDocument();
		await waitFor(() => expect(screen.queryByRole("button", { name: "Сохранить новый проект" })).not.toBeInTheDocument());
		expect(screen.getByRole("alert")).toHaveTextContent(refreshError);
		expect(JSON.parse(screen.getByTestId("saved-project-link").textContent ?? "{}")).toEqual({ bitrixProjectId: "79", clientCompanyId: "23", clientCompany: "Новая компания" });
		expect(state.createProject).toHaveBeenCalledTimes(1);
	});

	it("does not let an unrelated catalogue refresh error hide numeric-linked project metrics", async () => {
		const refreshError = "Не удалось обновить каталог Битрикс24";
		state.projectsError = refreshError;
		render(<SalesProfitabilityReport {...props} />);
		fireEvent.click(await screen.findByTitle(waterfall.title));
		expect(await screen.findByRole("heading", { name: waterfall.title })).toBeInTheDocument();
		expect(screen.getByText(`План проекта ${waterfall.title}`)).toBeInTheDocument();
		expect(await screen.findByText("Себестоимость по загруженным отчётам")).toBeInTheDocument();
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	});

	it("does not hide saved details behind an unrelated pending metrics request", async () => {
		state.fetchDetails.mockImplementationOnce(() => new Promise<ProfitabilityProject>(() => undefined));
		render(<SalesProfitabilityReport {...props} />);
		fireEvent.click(await screen.findByTitle(waterfall.title));
		await waitFor(() => expect(state.fetchDetails).toHaveBeenCalledTimes(1));
		const metricsSignal = state.fetchDetails.mock.calls[0][1] as AbortSignal;
		fireEvent.click(screen.getByRole("button", { name: "Детали проекта" }));
		expect(await screen.findByText(`Детали: ${waterfall.title}`)).toBeInTheDocument();
		expect(metricsSignal.aborted).toBe(true);
	});

	it("retains a new company draft and the same request ID when a project save fails", async () => {
		state.createProject.mockRejectedValueOnce({ response: { data: { message: "Временная ошибка Битрикс24" } } });
		state.createProject.mockResolvedValueOnce({ ...waterfall, id: 3, title: "Новый проект", bitrixProjectId: "79", clientCompanyId: "23", clientCompany: "Новая компания", files: [] });
		render(<SalesProfitabilityReport {...props} />);
		fireEvent.click(await screen.findByTitle("Добавить проект"));
		fireEvent.click(screen.getByRole("button", { name: "Создать проект с новой компанией" }));
		fireEvent.click(screen.getByRole("button", { name: "Сохранить новый проект" }));
		expect(await screen.findByRole("alert")).toHaveTextContent("Временная ошибка Битрикс24");
		expect(JSON.parse(screen.getByTestId("project-company-draft").textContent ?? "{}")).toMatchObject({ companyCreationMode: "new", newCompanyTitle: "  Новая компания  " });
		const [firstPayload, firstRequestId] = state.createProject.mock.calls[0];
		expect(firstPayload).toMatchObject({ newCompanyTitle: "Новая компания", clientCompanyId: null, clientCompany: null });
		fireEvent.click(screen.getByRole("button", { name: "Сохранить новый проект" }));
		await waitFor(() => expect(state.createProject).toHaveBeenCalledTimes(2));
		expect(state.createProject.mock.calls[1]).toEqual([firstPayload, firstRequestId]);
		await waitFor(() => expect(state.reloadProjects).toHaveBeenCalledTimes(1));
	});

	it("starts a fresh company choice after closing and reopening the project creation form", async () => {
		render(<SalesProfitabilityReport {...props} />);
		fireEvent.click(await screen.findByTitle("Добавить проект"));
		fireEvent.click(screen.getByRole("button", { name: "Создать проект с новой компанией" }));
		fireEvent.click(screen.getByRole("button", { name: "Закрыть форму проекта" }));
		fireEvent.click(screen.getByTitle("Добавить проект"));
		expect(screen.getByTestId("project-company-draft")).toHaveTextContent('"companyCreationMode":"existing","newCompanyTitle":"","clientCompanyId":"","clientCompany":""');
	});

	it("keeps the created company after attachment failure and retries the same project via PATCH without a company creation field", async () => {
		const createdProject = { ...waterfall, id: 3, title: "Новый проект", bitrixProjectId: "79", clientCompanyId: "23", clientCompany: "Новая компания", files: [] };
		state.projects = [...state.projects, catalog(createdProject)];
		state.createProject.mockResolvedValueOnce(createdProject);
		state.updateProject.mockImplementation(async (id, payload) => ({ ...createdProject, ...payload, id }));
		state.uploadProjectFile.mockRejectedValueOnce(new Error("attachment connection failed"));
		state.uploadProjectFile.mockResolvedValueOnce({ id: 101, projectId: 3, fileKind: "estimate", originalName: "estimate.pdf" });
		render(<SalesProfitabilityReport {...props} />);
		fireEvent.click(await screen.findByTitle("Добавить проект"));
		fireEvent.click(screen.getByRole("button", { name: "Создать проект с новой компанией" }));
		fireEvent.click(screen.getByRole("button", { name: "Добавить файл проекта" }));
		fireEvent.click(screen.getByRole("button", { name: "Сохранить новый проект" }));
		expect(await screen.findByRole("alert")).toHaveTextContent("Проект сохранён. Не удалось загрузить файлы");
		expect(screen.getByTestId("project-company-draft")).toHaveTextContent('"clientCompanyId":"23","clientCompany":"Новая компания"');
		expect(screen.getByTestId("project-company-draft")).toHaveTextContent('"companyCreationMode":"existing","newCompanyTitle":""');
		fireEvent.click(screen.getByRole("button", { name: "Сохранить новый проект" }));
		await waitFor(() => expect(screen.queryByRole("button", { name: "Сохранить новый проект" })).not.toBeInTheDocument());
		expect(state.createProject).toHaveBeenCalledTimes(1);
		expect(state.updateProject.mock.calls[0][1]).toMatchObject({ clientCompanyId: "23", clientCompany: "Новая компания" });
		expect(state.updateProject.mock.calls[0][1]).not.toHaveProperty("newCompanyTitle");
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
