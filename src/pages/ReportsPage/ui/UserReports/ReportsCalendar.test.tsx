import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, Outlet, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	ReportCodes,
	ReportStageIds,
} from "@/components/calendar/constants/const";
import { DEPARTMENT_IDS, EntityTypeIds } from "@/shared/constants/const";
import type { User } from "@/shared/types/types";
import ReportsCalendar from "./ReportsCalendar";

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@/shared/config/axios/axios.config", () => ({ $api: { get } }));
vi.mock("@/shared/hooks/useBitrixSlider", () => ({
	useBitrixSlider: () => ({ openTask: vi.fn() }),
}));

const today = new Date();
const reportDate = new Date(
	today.getFullYear(),
	today.getMonth(),
	1,
	12,
).toISOString();
const users: User[] = [
	{ id: "1", title: "Действующий без отчётов", isActive: true },
	{ id: "2", title: "Уволенный с отчётом", isActive: false },
	{ id: "3", title: "Уволенный без отчётов", isActive: false },
	{ id: "4", title: "Статус неизвестен" },
	{ id: "5", title: "Другой уволенный с отчётом", isActive: false },
].map((user) => ({
	value: user.title,
	photo: "",
	position: "Разработчик",
	department: DEPARTMENT_IDS.DEV,
	...user,
}));
const reports = [
	{
		id: "10",
		assignedById: "2",
		stageId: ReportStageIds.unconfirmed,
		[ReportCodes.timeSpent]: "0",
	},
	{
		id: "11",
		assignedById: "5",
		stageId: ReportStageIds.confirmed,
		[ReportCodes.timeSpent]: "2",
	},
].map((report) => ({
	begindate: reportDate,
	[ReportCodes.title]: "Работа по задаче",
	[ReportCodes.activityType]: 269,
	...report,
}));
const setUser = vi.fn();

beforeEach(() => {
	get.mockReset();
	setUser.mockClear();
	get.mockImplementation(async (_endpoint, { params }) => {
		const filter = params.filter ?? {};
		const items =
			params.entityTypeId === EntityTypeIds.reports
				? reports.filter(
						(report) =>
							(!filter.assignedById ||
								report.assignedById === filter.assignedById) &&
							(!filter["@assignedById"] ||
								filter["@assignedById"].includes(report.assignedById)) &&
							new Date(report.begindate) >= new Date(filter[">=begindate"]) &&
							new Date(report.begindate) <= new Date(filter["<=begindate"]),
					)
				: [];
		return { data: { result: { items }, total: items.length } };
	});
});

const mount = () => {
	const context = {
		users,
		activities: [],
		projects: [],
		clientsList: [],
		setUser,
	};
	const router = createMemoryRouter([
		{
			path: "/",
			element: <Outlet context={context} />,
			children: [{ index: true, element: <ReportsCalendar /> }],
		},
	]);
	return render(<RouterProvider router={router} />);
};

describe("calendar employee visibility", () => {
	it("keeps active/unknown users and former employees with any report, independent of selected employee", async () => {
		mount();
		const former = await screen.findByRole("button", {
			name: /Уволенный с отчётом/,
		});
		expect(
			screen.getByRole("button", { name: /Действующий без отчётов/ }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /Статус неизвестен/ }),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: /Уволенный без отчётов/ }),
		).not.toBeInTheDocument();
		fireEvent.click(former);
		await waitFor(() => expect(setUser).toHaveBeenLastCalledWith("2"));
		expect(
			screen.getByRole("button", { name: /Другой уволенный с отчётом/ }),
		).toBeInTheDocument();
		expect(
			get.mock.calls
				.filter(
					([, options]) =>
						options.params.entityTypeId === EntityTypeIds.reports,
				)
				.every(([, options]) =>
					options.params.filter["@assignedById"].includes("3"),
				),
		).toBe(true);
	});

	it("drops former employees in an empty month and restores them with historical reports", async () => {
		mount();
		fireEvent.click(
			await screen.findByRole("button", { name: /Уволенный с отчётом/ }),
		);
		await waitFor(() => expect(setUser).toHaveBeenLastCalledWith("2"));
		fireEvent.click(screen.getByRole("button", { name: "›" }));
		await waitFor(() =>
			expect(
				screen.queryByRole("button", { name: /Уволенный с отчётом/ }),
			).not.toBeInTheDocument(),
		);
		await waitFor(() => expect(setUser).toHaveBeenLastCalledWith(""));
		expect(
			screen.getByRole("button", { name: /Действующий без отчётов/ }),
		).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "‹" }));
		expect(
			await screen.findByRole("button", { name: /Уволенный с отчётом/ }),
		).toBeInTheDocument();
	});
});
