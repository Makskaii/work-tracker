import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProjectReportEntry, ReportProject } from "../model/types";
import { ProjectReportsTab } from "./ProjectReportsTab";

const blockers = vi.hoisted(() => ({ acquire: vi.fn(), release: vi.fn(), hook: vi.fn() }));
vi.mock("@/shared/lib/appUpdates", () => ({
	acquireAppUpdateBlocker: blockers.acquire,
	useAppUpdateBlocker: blockers.hook,
}));
vi.mock("./MultiFileDropzone", () => ({
	MultiFileDropzone: ({ onFilesChange }: { onFilesChange: (files: File[]) => void }) => (
		<button type="button" onClick={() => onFilesChange([new File(["report"], "report.txt")])}>
			Добавить файл
		</button>
	),
}));

const entry: ProjectReportEntry = {
	id: 2,
	projectId: 1,
	authorId: "7",
	authorName: "Автор отчёта",
	text: "Текст отчёта",
	reportDate: "2026-10-06",
	nextReportDate: null,
	files: [],
	createdAt: "2026-10-06",
	updatedAt: "2026-10-06",
};
const project = { id: 1, title: "Проект", files: [] } as unknown as ReportProject;
const noop = () => undefined;
const props = () => ({
	authorName: "", error: null, fileDrafts: [], isLoading: false,
	isModalOpen: false, isSaving: false, nextReportDate: "",
	onAuthorChange: noop, onCloseModal: noop, onCreate: noop,
	onDelete: vi.fn(() => Promise.resolve()), onFileDelete: noop,
	onFileDownload: noop, onFileUpload: vi.fn(() => Promise.resolve()),
	onFilesChange: noop, onNextReportDateChange: noop, onOpenModal: noop,
	onRefreshReports: () => Promise.resolve(), onTextChange: noop,
	onUpdate: vi.fn(() => Promise.resolve()), project, reports: [entry], text: "", users: [],
});
const deferred = () => {
	let resolve: (() => void) | undefined;
	let reject: ((error: Error) => void) | undefined;
	const promise = new Promise<void>((resolvePromise, rejectPromise) => {
		resolve = resolvePromise;
		reject = rejectPromise;
	});
	return { promise, resolve: () => resolve?.(), reject: () => reject?.(new Error("Failed")) };
};

beforeEach(() => {
	blockers.acquire.mockReset().mockReturnValue(blockers.release);
	blockers.release.mockReset();
	blockers.hook.mockReset();
});

const openEntry = async () => {
	// Selecting an entry awaits the report refresh before initializing its draft.
	await act(async () => {
		fireEvent.click(screen.getByText("Автор отчёта"));
	});
	await screen.findByRole("button", { name: "Редактировать" });
};

describe("report update safety", () => {
	it("keeps an update blocked through saving and uploading after the editor unmounts", async () => {
		const save = deferred();
		const upload = deferred();
		const handlers = props();
		handlers.onUpdate.mockReturnValue(save.promise);
		handlers.onFileUpload.mockReturnValue(upload.promise);
		const view = render(<ProjectReportsTab {...handlers} />);
		await openEntry();
		expect(blockers.hook).toHaveBeenCalledWith(true);
		fireEvent.click(screen.getByRole("button", { name: "Редактировать" }));
		fireEvent.click(screen.getByRole("button", { name: "Добавить файл" }));
		fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));
		expect(blockers.acquire).toHaveBeenCalledTimes(1);
		view.unmount();
		save.resolve();
		await waitFor(() => expect(handlers.onFileUpload).toHaveBeenCalledTimes(1));
		expect(blockers.release).not.toHaveBeenCalled();
		upload.resolve();
		await waitFor(() => expect(blockers.release).toHaveBeenCalledTimes(1));
	});

	it("releases a failed save but keeps the editor open for correction", async () => {
		const save = deferred();
		const handlers = props();
		handlers.onUpdate.mockReturnValue(save.promise);
		render(<ProjectReportsTab {...handlers} />);
		await openEntry();
		fireEvent.click(screen.getByRole("button", { name: "Редактировать" }));
		fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));
		save.reject();
		await screen.findByText("Не удалось сохранить отчёт");
		expect(blockers.release).toHaveBeenCalledTimes(1);
		expect(screen.getByRole("button", { name: "Сохранить" })).not.toBeDisabled();
		expect(blockers.hook).toHaveBeenLastCalledWith(true);
	});

	it("blocks a confirmed delete until it finishes even if the modal unmounts", async () => {
		const deletion = deferred();
		const handlers = props();
		handlers.onDelete.mockReturnValue(deletion.promise);
		const view = render(<ProjectReportsTab {...handlers} />);
		await openEntry();
		fireEvent.click(screen.getByRole("button", { name: "Удалить" }));
		expect(blockers.acquire).not.toHaveBeenCalled();
		fireEvent.click(screen.getByRole("button", { name: "Подтвердить удаление" }));
		expect(blockers.acquire).toHaveBeenCalledTimes(1);
		view.unmount();
		expect(blockers.release).not.toHaveBeenCalled();
		deletion.resolve();
		await waitFor(() => expect(blockers.release).toHaveBeenCalledTimes(1));
	});
});
