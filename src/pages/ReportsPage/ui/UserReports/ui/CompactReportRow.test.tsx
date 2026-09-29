import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { GroupedReportFields } from "@/shared/types/table";
import { CompactReportRow } from "./CompactReportRow";

const report: GroupedReportFields = {
	id: "42",
	title: "Исправлено сохранение",
	timeSpent: "2",
	taskId: "1",
	parentId: 1,
	day: "2026-09-29",
	project: 33,
	client: 7401,
	activity: 269,
	assignedById: "1",
	stageId: "DT1060_15:PREPARATION",
	reportTaskType: 396,
};
const users = [
	{
		id: "1",
		title: "Анна Иванова",
		value: "anna",
		position: "Разработчик",
		photo: "/avatar.jpg",
		department: 1,
	},
];

describe("CompactReportRow", () => {
	it("shows description, hours, an identified avatar and opens the exact report", () => {
		const open = vi.fn();
		render(
			<CompactReportRow
				report={report}
				users={users}
				activities={[]}
				onOpenReport={open}
			/>,
		);
		expect(screen.getByText("Исправлено сохранение")).toBeInTheDocument();
		expect(screen.getByText("2 ч")).toBeInTheDocument();
		expect(screen.getByAltText("Анна Иванова")).toBeInTheDocument();
		expect(screen.queryByText("Development")).not.toBeInTheDocument();
		expect(screen.queryByText("Clients paid")).not.toBeInTheDocument();
		fireEvent.click(screen.getByRole("button"));
		expect(open).toHaveBeenCalledWith("42");
	});
	it("always labels absence and falls back to initials on broken photo", () => {
		render(
			<CompactReportRow
				report={{ ...report, activity: 404, title: "Отпуск" }}
				users={users}
				activities={[]}
				onOpenReport={vi.fn()}
			/>,
		);
		expect(screen.getByText("Not at work")).toBeInTheDocument();
		fireEvent.error(screen.getByAltText("Анна Иванова"));
		expect(screen.getByText("АИ")).toBeInTheDocument();
	});
});
