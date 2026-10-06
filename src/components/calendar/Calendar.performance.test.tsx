import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { type ReactNode, useEffect } from "react";
import { createMemoryRouter, Outlet, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EntityTypeIds } from "@/shared/constants/const";
import type { GroupedReportFields } from "@/shared/types/table";
import type { User } from "@/shared/types/types";
import { Calendar } from "./Calendar";
import WeekCalendar from "./CalendarWeek";
import { ActivityType, ReportCodes, ReportStageIds, TaskCodes } from "./constants/const";
import { getCalendarDayHourDeficits } from "./helpers/dayHourDeficits";
import { generateMonthDays } from "./helpers/generateMonthDays";
import type { ReportProps } from "./types/types";

const loader = vi.hoisted(() => ({
	reports: [] as unknown[],
	tasks: [] as unknown[],
	requests: [] as number[],
	setReportFilters: vi.fn(),
	setTaskFilters: vi.fn(),
}));

vi.mock("@/shared/hooks/useLoadAllTasks", () => ({
	useLoadAllData: (options: { initialFilters: { params: { entityTypeId: number } } }) => {
		const entityTypeId = options.initialFilters.params.entityTypeId;
		useEffect(() => {
			loader.requests.push(entityTypeId);
		}, [entityTypeId]);
		return {
			data: entityTypeId === EntityTypeIds.reports ? loader.reports : loader.tasks,
			loading: false,
			error: null,
			setFilters:
				entityTypeId === EntityTypeIds.reports
					? loader.setReportFilters
					: loader.setTaskFilters,
		};
	},
}));
vi.mock("@/shared/hooks/useBitrixSlider", () => ({
	useBitrixSlider: () => ({ openTask: vi.fn() }),
}));
vi.mock("./helpers/generateMonthDays", async (original) => {
	const actual = await original<typeof import("./helpers/generateMonthDays")>();
	return { ...actual, generateMonthDays: vi.fn(actual.generateMonthDays) };
});
vi.mock("./helpers/dayHourDeficits", async (original) => {
	const actual = await original<typeof import("./helpers/dayHourDeficits")>();
	return { ...actual, getCalendarDayHourDeficits: vi.fn(actual.getCalendarDayHourDeficits) };
});

const users: User[] = [
	["1", "Анна", true],
	["2", "Михаил", true],
	["3", "Бывший сотрудник", false],
].map(([id, title, isActive]) => ({
	id: String(id),
	title: String(title),
	value: String(title),
	isActive: Boolean(isActive),
	department: 23,
	position: "Разработчик",
	photo: "",
}));
const userIds = users.map((user) => user.id);
const context = { users, activities: [], projects: [], clientsList: [] };
const makeReport = (id: string, assignedById: string, timeSpent: string): GroupedReportFields => ({
	id,
	assignedById,
	timeSpent,
	activity: ActivityType.development,
	title: `Работа ${id}`,
	day: "2026-09-28T12:00:00",
	stageId: ReportStageIds.confirmed,
	taskId: "10",
	parentId: 10,
	project: 20,
	client: 30,
});
const toApiReport = (report: GroupedReportFields): ReportProps => ({
	id: report.id,
	title: report.title,
	assignedById: Number(report.assignedById),
	stageId: report.stageId as ReportProps["stageId"],
	begindate: report.day,
	createdTime: report.day,
	lastActivityTime: report.day,
	[ReportCodes.title]: report.title,
	[ReportCodes.timeSpent]: report.timeSpent,
	[ReportCodes.activityType]: report.activity,
	[ReportCodes.project]: report.project,
	[ReportCodes.client]: report.client,
	[ReportCodes.taskId]: report.taskId,
	[ReportCodes.parentId]: report.parentId,
});

const mountWithContext = (element: ReactNode) => {
	const router = createMemoryRouter([
		{
			path: "/",
			element: <Outlet context={context} />,
			children: [{ index: true, element }],
		},
	]);
	return render(<RouterProvider router={router} />);
};

beforeEach(() => {
	vi.useFakeTimers({ toFake: ["Date"] });
	vi.setSystemTime(new Date(2026, 8, 29, 9, 30));
	vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
	loader.reports = [];
	loader.tasks = [];
	loader.requests = [];
	vi.clearAllMocks();
});
afterEach(() => {
	cleanup();
	vi.useRealTimers();
	vi.restoreAllMocks();
});

describe("calendar work reuse", () => {
	it("shares the weekly report load and enriched tasks while retaining the full period roster", async () => {
		loader.reports = [
			makeReport("1", "1", "2"),
			makeReport("2", "2", "12"),
			makeReport("3", "3", "4"),
		].map(toApiReport);
		loader.tasks = [{ id: 10, [TaskCodes.taskType]: "company paid" }];
		const onPeriodReportsChange = vi.fn();
		mountWithContext(
			<Calendar
				view="week"
				userId="1"
				userIds={userIds}
				selectedMonth={8}
				selectedYear={2026}
				selectedDate="2026-09-28"
				setGroupByActivity={vi.fn()}
				onPeriodReportsChange={onPeriodReportsChange}
			/>,
		);
		const card = await screen.findByLabelText(/28 сентября:/);
		expect(await within(card).findByText("2 ч")).toBeInTheDocument();
		expect(loader.requests.filter((id) => id === EntityTypeIds.reports)).toHaveLength(1);
		expect(loader.requests.filter((id) => id === EntityTypeIds.tasks)).toHaveLength(1);
		expect(generateMonthDays).not.toHaveBeenCalled();
		expect(onPeriodReportsChange).toHaveBeenLastCalledWith([
			expect.objectContaining({ assignedById: "1", taskType: "company paid" }),
			expect.objectContaining({ assignedById: "2", taskType: "company paid" }),
			expect.objectContaining({ assignedById: "3", taskType: "company paid" }),
		]);
		expect(loader.setReportFilters).toHaveBeenCalledWith(
			expect.objectContaining({ params: expect.objectContaining({
				filter: expect.objectContaining({ "@assignedById": userIds }),
			}) }),
		);
		fireEvent.click(within(card).getByRole("button", { name: "Все отчёты за 28: 1" }));
		const dialog = await screen.findByRole("dialog");
		expect(within(dialog).getByText("Работа 1")).toBeInTheDocument();
		expect(within(dialog).queryByText("Работа 2")).not.toBeInTheDocument();
		expect(within(dialog).queryByText("Бывший сотрудник")).not.toBeInTheDocument();
	});

	it.each(["month", "week"] as const)("reuses %s day calculations when opening the summary", async (view) => {
		loader.reports = [toApiReport(makeReport("1", "1", "2"))];
		mountWithContext(
			<Calendar
				view={view}
				userId="1"
				userIds={userIds}
				selectedMonth={8}
				selectedYear={2026}
				selectedDate="2026-09-28"
				setGroupByActivity={vi.fn()}
			/>,
		);
		const card = await screen.findByLabelText(/28 сентября:/);
		await within(card).findByText("2 ч");
		const calls = vi.mocked(getCalendarDayHourDeficits).mock.calls.length;
		fireEvent.click(view === "month"
			? card
			: within(card).getByRole("button", { name: "Все отчёты за 28: 1" }));
		expect(await screen.findByRole("dialog")).toBeInTheDocument();
		expect(getCalendarDayHourDeficits).toHaveBeenCalledTimes(calls);
	});

	it("does not start a child request when shared weekly data is loading or failed", () => {
		mountWithContext(
			<WeekCalendar selectedDate="2026-09-28" reports={[]} isLoading />,
		);
		expect(screen.getByRole("status")).toHaveTextContent("Загружаем отчёты");
		expect(loader.requests).toEqual([]);
		cleanup();
		mountWithContext(
			<WeekCalendar selectedDate="2026-09-28" reports={[]} error="failed" />,
		);
		expect(screen.getByRole("alert")).toHaveTextContent("Не удалось загрузить отчёты");
		expect(loader.requests).toEqual([]);
	});

	it("retains a former employee's recorded day in a shared weekly view", async () => {
		mountWithContext(
			<WeekCalendar
				selectedDate="2026-09-28"
				userId="3"
				userIds={userIds}
				reports={[makeReport("3", "3", "4")]}
			/>,
		);
		const card = await screen.findByLabelText(/28 сентября:/);
		expect(card).toHaveAttribute("data-deficit", "true");
		expect(within(card).getByText("Не хватает 4 ч")).toBeInTheDocument();
		expect(loader.requests).toEqual([]);
	});
});
