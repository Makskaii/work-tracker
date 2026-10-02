import {
	cleanup,
	fireEvent,
	render,
	screen,
	within,
} from "@testing-library/react";
import { createMemoryRouter, Outlet, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GroupedReportFields } from "@/shared/types/table";
import type { User } from "@/shared/types/types";
import CalendarMonth from "./CalendarMonth";
import WeekCalendar from "./CalendarWeek";
import { ActivityType, ReportCodes, ReportStageIds } from "./constants/const";
import { generateMonthDays } from "./helpers/generateMonthDays";
import type { ReportProps } from "./types/types";

const loader = vi.hoisted(() => ({
	data: [] as unknown[],
	setFilters: vi.fn(),
}));

vi.mock("@/shared/hooks/useLoadAllTasks", () => ({
	useLoadAllData: () => ({
		data: loader.data,
		loading: false,
		error: null,
		setFilters: loader.setFilters,
	}),
}));
vi.mock("@/shared/hooks/useBitrixSlider", () => ({
	useBitrixSlider: () => ({ openTask: vi.fn() }),
}));

const makeUser = (id: string, title: string, isActive = true): User => ({
	id,
	title,
	isActive,
	value: title,
	department: 23,
	position: "Разработчик",
	photo: "",
});
const users = [
	makeUser("1", "Анна"),
	makeUser("2", "Михаил"),
	makeUser("3", "Бывший сотрудник", false),
];
const makeReport = (
	id: string,
	assignedById: string,
	timeSpent: string,
	activity = ActivityType.development,
): GroupedReportFields => ({
	id,
	assignedById,
	timeSpent,
	activity,
	title: "Работа над задачей",
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
	stageId: ReportStageIds.confirmed,
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

beforeEach(() => {
	vi.useFakeTimers({ toFake: ["Date"] });
	vi.setSystemTime(new Date(2026, 8, 29, 9, 30));
	vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
	loader.data = [];
	loader.setFilters.mockClear();
});
afterEach(() => {
	cleanup();
	vi.useRealTimers();
	vi.restoreAllMocks();
});

type View = "month" | "week";
const mountCalendar = (
	view: View,
	reports: GroupedReportFields[] = [],
	selectedUserId?: string,
) => {
	loader.data = reports.map(toApiReport);
	const calendar =
		view === "month" ? (
			<CalendarMonth
				monthDays={generateMonthDays({
					selectedYear: 2026,
					selectedMonth: 8,
					reports,
				})}
				selectedYear={2026}
				getCurrentMonthName={() => "Сентябрь"}
				selectedUserId={selectedUserId}
				userIds={users.map((user) => user.id)}
			/>
		) : (
			<WeekCalendar
				selectedDate="2026-09-28"
				userId={selectedUserId}
				userIds={users.map((user) => user.id)}
			/>
		);
	const router = createMemoryRouter([
		{
			path: "/",
			element: (
				<Outlet
					context={{ users, activities: [], projects: [], clientsList: [] }}
				/>
			),
			children: [{ index: true, element: calendar }],
		},
	]);
	return render(<RouterProvider router={router} />);
};

describe.each<View>(["month", "week"])("%s calendar hour warnings", (view) => {
	it("shows a department deficit despite another employee's overtime", async () => {
		mountCalendar(view, [
			makeReport("10", "1", "12"),
			makeReport("11", "2", "4"),
		]);
		const card = await screen.findByLabelText(/28 сентября:/);
		expect(card).toHaveAttribute("data-deficit", "true");
		expect(card).toHaveAttribute("data-state", "incomplete");
		expect(within(card).getByText("16 ч")).toBeInTheDocument();
		expect(within(card).getByText("Меньше 8 ч: 1")).toBeInTheDocument();
		expect(card).toHaveAttribute(
			"title",
			expect.stringContaining("Михаил: 4 ч из 8 ч, не хватает 4 ч"),
		);
		expect(card).not.toHaveAttribute("title", expect.stringContaining("Анна:"));
	});

	it("closes the individual norm with six work hours and two absence hours", async () => {
		mountCalendar(
			view,
			[
				makeReport("10", "1", "6"),
				makeReport("11", "1", "2", ActivityType.notAtWork),
			],
			"1",
		);
		const card = await screen.findByLabelText(/28 сентября:/);
		expect(card).toHaveAttribute("data-deficit", "false");
		expect(card).toHaveAttribute("data-state", "absence");
		expect(
			within(card).queryByText(/Не хватает|Меньше 8 ч:/),
		).not.toBeInTheDocument();
	});

	it("does not mark an empty today as missing or incomplete", async () => {
		mountCalendar(view);
		const card = await screen.findByLabelText(/29 сентября:/);
		expect(card).toHaveAttribute("data-deficit", "false");
		expect(card).toHaveAttribute("data-state", "empty");
		expect(
			within(card).queryByText(/Нет отчётов|Меньше 8 ч:/),
		).not.toBeInTheDocument();
	});

	it("opens today's summary without reports while leaving the calendar card unmarked", async () => {
		mountCalendar(view);
		const card = await screen.findByLabelText(/29 сентября:/);
		const trigger =
			view === "month"
				? card
				: within(card).getByRole("button", { name: "Все отчёты за 29: 0" });
		expect(trigger).not.toBeDisabled();
		fireEvent.click(trigger);
		const summary = await screen.findByRole("region", {
			name: "Недостающие часы",
		});
		expect(within(summary).getAllByRole("listitem")).toHaveLength(2);
		expect(summary).toHaveTextContent("Анна0 ч из 8 ч −8 ч");
		expect(summary).toHaveTextContent("Михаил0 ч из 8 ч −8 ч");
		expect(summary).not.toHaveTextContent("Бывший сотрудник");
		expect(card).toHaveAttribute("data-deficit", "false");
	});

	it("lists today's deficit in the summary and counts absence hours toward the norm", async () => {
		const reports = [
			makeReport("10", "1", "2"),
			makeReport("11", "2", "6"),
			makeReport("12", "2", "2", ActivityType.notAtWork),
		].map((report) => ({ ...report, day: "2026-09-29T12:00:00" }));
		mountCalendar(view, reports);
		const card = await screen.findByLabelText(/29 сентября:/);
		expect(card).toHaveAttribute("data-deficit", "false");
		expect(within(card).queryByText(/Меньше 8 ч:/)).not.toBeInTheDocument();
		fireEvent.click(
			view === "month"
				? card
				: within(card).getByRole("button", { name: "Все отчёты за 29: 3" }),
		);
		const summary = await screen.findByRole("region", {
			name: "Недостающие часы",
		});
		expect(within(summary).getAllByRole("listitem")).toHaveLength(1);
		expect(summary).toHaveTextContent("Анна2 ч из 8 ч −6 ч");
		expect(summary).not.toHaveTextContent("Михаил");
	});

	it("does not show today's deficit summary once the selected employee reaches eight hours", async () => {
		mountCalendar(
			view,
			[
				{ ...makeReport("10", "1", "8"), day: "2026-09-29T12:00:00" },
			],
			"1",
		);
		const card = await screen.findByLabelText(/29 сентября:/);
		fireEvent.click(
			view === "month"
				? card
				: within(card).getByRole("button", { name: "Все отчёты за 29: 1" }),
		);
		expect(await screen.findByRole("dialog")).toBeInTheDocument();
		expect(
			screen.queryByRole("region", { name: "Недостающие часы" }),
		).not.toBeInTheDocument();
	});

	it("does not require reports on an inactive employee's empty day", async () => {
		mountCalendar(view, [], "3");
		const card = await screen.findByLabelText(/28 сентября:/);
		expect(card).toHaveAttribute("data-deficit", "false");
		expect(card).toHaveAttribute("data-state", "empty");
		expect(
			within(card).queryByText(/Нет отчётов|Не хватает/),
		).not.toBeInTheDocument();
	});

	it("opens a day with no reports and lists only the employees missing hours", async () => {
		mountCalendar(view);
		const card = await screen.findByLabelText(/28 сентября:/);
		expect(card).toHaveAttribute("data-state", "missing");
		expect(within(card).getByText("Меньше 8 ч: 2")).toBeInTheDocument();
		const trigger =
			view === "month"
				? card
				: within(card).getByRole("button", { name: "Все отчёты за 28: 0" });
		expect(trigger).not.toBeDisabled();
		fireEvent.click(trigger);
		const summary = await screen.findByRole("region", {
			name: "Недостающие часы",
		});
		expect(summary.closest("dialog")).toBeInTheDocument();
		expect(within(summary).getByText("Анна")).toBeInTheDocument();
		expect(within(summary).getByText("Михаил")).toBeInTheDocument();
		expect(
			within(summary).queryByText("Бывший сотрудник"),
		).not.toBeInTheDocument();
		const rows = within(summary).getAllByRole("listitem");
		expect(rows).toHaveLength(2);
		for (const row of rows) {
			expect(row).toHaveTextContent("0 ч из 8 ч −8 ч");
		}
	});
});
