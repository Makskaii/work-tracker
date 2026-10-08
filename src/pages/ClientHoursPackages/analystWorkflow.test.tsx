import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { $backendApi } from "@/shared/config/axios/axios.config";
import { B24Context } from "@/shared/config/bitrixProvider/bitrixContext";
import type { B24Frame } from "@bitrix24/b24jssdk";
import { ClientHoursPackageModal } from "./ClientHoursPackageModal";
import { SupportReportModal } from "./SupportReportModal";
import { SupportPackageReportPanel } from "./SupportPackageReportPanel";
const api = vi.hoisted(() => ({
	previewPackageImpact: vi.fn(),
	fetchSupportReportOptions: vi.fn(),
	getSupportReportForEdit: vi.fn(),
	prepareSupportReportFields: vi.fn(),
	fetchPackageChecks: vi.fn(),
	downloadSupportPdf: vi.fn(),
}));
const { openTask, notify, fetchPdf } = vi.hoisted(() => ({
	openTask: vi.fn(),
	notify: vi.fn(),
	fetchPdf: vi.fn(),
}));
vi.mock("./supportAnalyst.api", async (importOriginal) => ({
	...(await importOriginal<typeof import("./supportAnalyst.api")>()),
	...api,
}));
vi.mock("./clientHoursPackages.api", () => ({
	fetchSupportHoursPackageReport: fetchPdf,
}));
vi.mock("@/shared/ui/NotificationPopup/notify", () => ({ notify }));
vi.mock("@/shared/hooks/useBitrixSlider", () => ({
	useBitrixSlider: () => ({ openTask }),
}));
const deferred = <T,>() => {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((done) => {
		resolve = done;
	});
	return { promise, resolve };
};
const purchase = {
	id: 7,
	date: "2026-09-01",
	hours: 30,
	remaining: 4,
	state: "Активный",
	comment: "Старый комментарий",
	amount: null,
	consumptions: [],
};
const impact = {
	packageId: 7,
	projectId: 31,
	operation: "update" as const,
	fingerprint: "current-fingerprint",
	requiresConfirmation: true,
	packages: [
		{
			id: 7,
			purchaseDate: "2026-09-01",
			before: {
				purchasedHours: 30,
				consumedHours: 26,
				remainingHours: 4,
				reportCount: 5,
			},
			after: {
				purchasedHours: 20,
				consumedHours: 20,
				remainingHours: 0,
				reportCount: 4,
			},
			affected: true,
		},
		{
			id: 8,
			purchaseDate: "2026-10-01",
			before: {
				purchasedHours: 10,
				consumedHours: 0,
				remainingHours: 10,
				reportCount: 0,
			},
			after: {
				purchasedHours: 10,
				consumedHours: 6,
				remainingHours: 4,
				reportCount: 1,
			},
			affected: true,
		},
	],
	movedHours: 6,
	movedReportCount: 1,
	unallocatedHoursBefore: 0,
	unallocatedHoursAfter: 0,
};
const reportProps = {
	projectId: 31,
	projectTitle: "Тестовый проект",
	tasks: [{ id: "1002", title: "Настройка обмена", stageId: "NEW" }],
	onClose: vi.fn(),
	onSaved: vi.fn().mockResolvedValue(undefined),
};
let make: ReturnType<typeof vi.fn>;
const frame = () =>
	({ actions: { v2: { call: { make } } } }) as unknown as B24Frame;
beforeEach(() => {
	vi.clearAllMocks();
	window.sessionStorage.clear();
	vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
	api.previewPackageImpact.mockResolvedValue(impact);
	api.fetchSupportReportOptions.mockResolvedValue({
		activities: [{ id: 392, title: "Разработка" }],
		reportTypes: [{ id: 396, title: "Оплачиваемая клиентом задача" }, { id: 397, title: "Не оплачиваемая клиентом задача" }, { id: 398, title: "Внутренняя задача (от нашей компании)" }],
	});
	api.prepareSupportReportFields.mockResolvedValue({
		entityTypeId: 1060,
		fields: { title: "Отчёт", parentId1072: 1002, ufCrm11_1775128299: 94 },
	});
	api.fetchPackageChecks.mockResolvedValue({
		checkedAt: "2026-09-29T10:00:00Z",
		blocking: false,
		issues: [],
	});
	make = vi.fn().mockImplementation(async ({ method }) =>
		method === "user.current"
			? { getData: () => ({ result: { ID: "42" } }) }
			: {
					isSuccess: true,
					getData: () => ({ result: { item: { id: 6000 } } }),
				},
	);
	reportProps.onSaved.mockReset().mockResolvedValue(undefined);
});

describe("package form safety and impact", () => {
	it("shows field errors and never submits invalid hours", () => {
		const save = vi.fn();
		render(
			<ClientHoursPackageModal
				projectId={31}
				isOpen
				mode="new-package"
				projects={[{ id: 31, title: "ТП" }]}
				purchase={null}
				onClose={vi.fn()}
				onSubmit={save}
			/>,
		);
		fireEvent.change(screen.getByLabelText("Количество часов"), {
			target: { value: "-1" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));
		expect(screen.getByText(/Укажите положительное число/)).toBeInTheDocument();
		expect(save).not.toHaveBeenCalled();
	});
	it("clears comments with null and guards rapid duplicate submits", async () => {
		const saved = deferred<void>();
		const save = vi.fn().mockReturnValue(saved.promise);
		render(
			<ClientHoursPackageModal
				projectId={31}
				isOpen
				mode="new-package"
				projects={[{ id: 31, title: "ТП" }]}
				purchase={null}
				onClose={vi.fn()}
				onSubmit={save}
			/>,
		);
		fireEvent.change(screen.getByLabelText("Количество часов"), {
			target: { value: "1,25" },
		});
		const button = screen.getByRole("button", { name: "Сохранить" });
		fireEvent.click(button);
		fireEvent.click(button);
		expect(save).toHaveBeenCalledOnce();
		expect(save).toHaveBeenCalledWith(
			expect.objectContaining({ hours: 1.25, comment: null }),
		);
		expect(screen.getByRole("button", { name: "Проверяем…" })).toBeDisabled();
		await act(async () => saved.resolve());
	});
	it("shows allocation consequences and sends the preview fingerprint only after confirmation", async () => {
		const save = vi.fn().mockResolvedValue(undefined);
		render(
			<ClientHoursPackageModal
				projectId={31}
				isOpen
				mode="edit"
				projects={[{ id: 31, title: "ТП" }]}
				purchase={purchase}
				onClose={vi.fn()}
				onSubmit={save}
			/>,
		);
		fireEvent.change(screen.getByLabelText("Количество часов"), {
			target: { value: "20" },
		});
		fireEvent.change(screen.getByLabelText("Комментарий"), {
			target: { value: "" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));
		expect(await screen.findByRole("alertdialog")).toHaveTextContent(
			"Пакет №8",
		);
		expect(screen.getByText(/Перераспределится 6 ч/)).toBeInTheDocument();
		expect(save).not.toHaveBeenCalled();
		fireEvent.click(
			screen.getByRole("button", { name: "Сохранить изменения" }),
		);
		await waitFor(() =>
			expect(save).toHaveBeenCalledWith(
				{ projectId: 31, date: "2026-09-01", hours: 20, comment: null },
				"current-fingerprint",
			),
		);
	});
	it("invalidates stale confirmation instead of silently saving against changed balances", async () => {
		const save = vi.fn().mockRejectedValue({
			response: {
				data: { message: "Данные изменились. Проверьте изменения ещё раз." },
			},
		});
		render(
			<ClientHoursPackageModal
				projectId={31}
				isOpen
				mode="edit"
				projects={[{ id: 31, title: "ТП" }]}
				purchase={purchase}
				onClose={vi.fn()}
				onSubmit={save}
			/>,
		);
		fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));
		fireEvent.click(
			await screen.findByRole("button", { name: "Сохранить изменения" }),
		);
		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Данные изменились",
		);
		expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));
		await waitFor(() =>
			expect(api.previewPackageImpact).toHaveBeenCalledTimes(2),
		);
	});
	it("previews deleting the used package and requires an explicit second click", async () => {
		api.previewPackageImpact.mockResolvedValue({
			...impact,
			operation: "delete",
		});
		const remove = vi.fn().mockResolvedValue(undefined);
		render(
			<ClientHoursPackageModal
				projectId={31}
				isOpen
				mode="edit"
				projects={[{ id: 31, title: "ТП" }]}
				purchase={purchase}
				onClose={vi.fn()}
				onSubmit={vi.fn()}
				onDelete={remove}
			/>,
		);
		fireEvent.click(screen.getByRole("button", { name: "Удалить" }));
		expect(await screen.findByRole("alertdialog")).toBeInTheDocument();
		expect(remove).not.toHaveBeenCalled();
		fireEvent.click(screen.getByRole("button", { name: "Удалить пакет" }));
		await waitFor(() =>
			expect(remove).toHaveBeenCalledExactlyOnceWith("current-fingerprint"),
		);
	});
});

const fillReport = async () => {
	await screen.findByRole("option", { name: "Разработка" });
	fireEvent.change(screen.getByLabelText("Выполненная работа"), {
		target: { value: "Исправлено обновление задач" },
	});
	fireEvent.change(screen.getByLabelText("Часы"), { target: { value: "2,5" } });
	fireEvent.change(screen.getByLabelText("Вид работы"), {
		target: { value: "392" },
	});
	fireEvent.change(screen.getByLabelText("Тип активности"), { target: { value: "396" } });
};
describe("report creation and editing", () => {
	it("requires an explicit report type and keeps it independent of package inclusion", async () => {
		render(<B24Context.Provider value={{ b24: frame() }}><SupportReportModal {...reportProps} /></B24Context.Provider>);
		await fillReport();
		fireEvent.change(screen.getByLabelText("Тип активности"), { target: { value: "" } });
		fireEvent.click(screen.getByRole("button", { name: "Сохранить отчёт" }));
		expect(api.prepareSupportReportFields).not.toHaveBeenCalled();
		expect(make).not.toHaveBeenCalled();
		fireEvent.change(screen.getByRole("combobox", { name: /Тип активности/ }), { target: { value: "398" } });
		fireEvent.click(screen.getByLabelText(/Учитывать в пакете/));
		fireEvent.click(screen.getByRole("button", { name: "Сохранить отчёт" }));
		await waitFor(() => expect(reportProps.onSaved).toHaveBeenCalledOnce());
		expect(api.prepareSupportReportFields).toHaveBeenCalledWith(31, expect.objectContaining({ reportTypeId: 398, includeInPackage: false }));
	});
	it("loads the existing report type without replacing it from the package checkbox", async () => {
		api.getSupportReportForEdit.mockResolvedValue({ taskId: null, description: "Работа", hours: 2, reportDate: "2026-09-28", includeInPackage: false, activityId: 392, reportTypeId: 397 });
		render(<B24Context.Provider value={{ b24: frame() }}><SupportReportModal {...reportProps} reportId="5430" /></B24Context.Provider>);
		await screen.findByRole("option", { name: "Разработка" });
		expect(screen.getByLabelText("Тип активности")).toHaveValue("397");
		fireEvent.click(screen.getByLabelText(/Учитывать в пакете/));
		fireEvent.click(screen.getByRole("button", { name: "Сохранить отчёт" }));
		await waitFor(() => expect(reportProps.onSaved).toHaveBeenCalledOnce());
		expect(api.prepareSupportReportFields).toHaveBeenCalledWith(31, expect.objectContaining({ reportId: 5430, reportTypeId: 397, includeInPackage: true }));
	});
	it("prefills the task and creates the report under the authenticated Bitrix user", async () => {
		render(
			<B24Context.Provider value={{ b24: frame() }}>
				<SupportReportModal {...reportProps} initialTaskId="1002" />
			</B24Context.Provider>,
		);
		await fillReport();
		expect(screen.getByLabelText("Задача")).toHaveValue("1002");
		fireEvent.click(screen.getByLabelText(/Учитывать в пакете/));
		fireEvent.click(screen.getByRole("button", { name: "Сохранить отчёт" }));
		await waitFor(() => expect(reportProps.onSaved).toHaveBeenCalledOnce());
		expect(api.prepareSupportReportFields).toHaveBeenCalledWith(
			31,
			expect.objectContaining({
				taskId: 1002,
				description: "Исправлено обновление задач",
				hours: 2.5,
				activityId: 392,
				includeInPackage: false,
			}),
		);
		expect(make).toHaveBeenLastCalledWith({
			method: "crm.item.add",
			params: {
				entityTypeId: 1060,
				fields: expect.objectContaining({
					assignedById: 42,
					parentId1072: 1002,
				}),
			},
		});
	});
	it("preserves an existing report author and supports removing its task link", async () => {
		api.getSupportReportForEdit.mockResolvedValue({
			taskId: 1002,
			description: "Первый вариант",
			hours: 2,
			reportDate: "2026-09-28",
			includeInPackage: true,
			activityId: 392,
		});
		render(
			<B24Context.Provider value={{ b24: frame() }}>
				<SupportReportModal {...reportProps} reportId="5403" />
			</B24Context.Provider>,
		);
		await fillReport();
		fireEvent.change(screen.getByLabelText("Задача"), {
			target: { value: "" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Сохранить отчёт" }));
		await waitFor(() => expect(reportProps.onSaved).toHaveBeenCalledOnce());
		expect(api.prepareSupportReportFields).toHaveBeenCalledWith(
			31,
			expect.objectContaining({ taskId: null, reportId: 5403 }),
		);
		expect(make).toHaveBeenCalledExactlyOnceWith({
			method: "crm.item.update",
			params: {
				entityTypeId: 1060,
				id: 5403,
				fields: expect.not.objectContaining({
					assignedById: expect.anything(),
				}),
			},
		});
	});
	it("does not offer a second create when saving succeeded but balance refresh failed", async () => {
		reportProps.onSaved.mockRejectedValue(new Error("Sync offline"));
		render(
			<B24Context.Provider value={{ b24: frame() }}>
				<SupportReportModal {...reportProps} />
			</B24Context.Provider>,
		);
		await fillReport();
		fireEvent.click(screen.getByRole("button", { name: "Сохранить отчёт" }));
		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Отчёт сохранён, но остатки не удалось обновить",
		);
		expect(
			screen.getByRole("button", { name: "Сохранить отчёт" }),
		).toBeDisabled();
		expect(
			make.mock.calls.filter(([input]) => input.method === "crm.item.add"),
		).toHaveLength(1);
	});
	it("does not enable saving when the original report could not be loaded", async () => {
		api.getSupportReportForEdit.mockRejectedValueOnce(new Error("Unavailable"));
		render(
			<B24Context.Provider value={{ b24: frame() }}>
				<SupportReportModal {...reportProps} reportId="5403" />
			</B24Context.Provider>,
		);
		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Не удалось загрузить данные отчёта",
		);
		expect(
			screen.getByRole("button", { name: "Сохранить отчёт" }),
		).toBeDisabled();
		expect(make).not.toHaveBeenCalled();
	});
	it("locks an uncertain create but allows fixing a definite Bitrix rejection", async () => {
		make.mockImplementation(async ({ method }) => {
			if (method === "user.current")
				return { getData: () => ({ result: { ID: "42" } }) };
			throw new Error("Connection interrupted");
		});
		const first = render(
			<B24Context.Provider value={{ b24: frame() }}>
				<SupportReportModal {...reportProps} />
			</B24Context.Provider>,
		);
		await fillReport();
		fireEvent.click(screen.getByRole("button", { name: "Сохранить отчёт" }));
		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Проверьте отчёты в Битрикс24",
		);
		expect(
			screen.getByRole("button", { name: "Сохранить отчёт" }),
		).toBeDisabled();
		first.unmount();
		make.mockImplementation(async ({ method }) =>
			method === "user.current"
				? { getData: () => ({ result: { ID: "42" } }) }
				: { isSuccess: false },
		);
		render(
			<B24Context.Provider value={{ b24: frame() }}>
				<SupportReportModal {...reportProps} />
			</B24Context.Provider>,
		);
		await fillReport();
		fireEvent.click(screen.getByRole("button", { name: "Сохранить отчёт" }));
		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Проверьте данные и свои права",
		);
		expect(
			screen.getByRole("button", { name: "Сохранить отчёт" }),
		).toBeEnabled();
	});
	it("never impersonates the webhook owner when the authenticated frame is unavailable", async () => {
		render(<SupportReportModal {...reportProps} />);
		await fillReport();
		expect(
			screen.getByRole("button", { name: "Сохранить отчёт" }),
		).toBeDisabled();
		expect(screen.getByRole("alert")).toHaveTextContent("внутри Битрикс24");
		expect(make).not.toHaveBeenCalled();
	});
});

describe("current client PDF without package checks", () => {
	it("downloads without invoking mutating package checks or source-card controls", async () => {
		api.fetchPackageChecks.mockRejectedValueOnce(new Error("Package checks unavailable"));
		fetchPdf.mockResolvedValue(new Blob(["client cabinet PDF"]));
		render(<SupportPackageReportPanel packageId={7} hasPackages />);
		fireEvent.click(screen.getByRole("button", { name: "Скачать отчёт" }));
		await waitFor(() => expect(api.downloadSupportPdf).toHaveBeenCalledExactlyOnceWith(
			expect.any(Blob), "support-package-7.pdf",
		));
		expect(fetchPdf).toHaveBeenCalledExactlyOnceWith(7);
		expect(api.fetchPackageChecks).not.toHaveBeenCalled();
		expect(openTask).not.toHaveBeenCalled();
		expect(screen.queryByRole("button", { name: "Открыть карточку" })).not.toBeInTheDocument();
	});
	it("surfaces canonical validation failures without downloading and restores the export action", async () => {
		fetchPdf.mockRejectedValueOnce({ response: { data: { message: "Укажите купленные часы в кабинете клиента перед формированием отчёта" } } });
		render(<SupportPackageReportPanel packageId={7} hasPackages />);
		fireEvent.click(screen.getByRole("button", { name: "Скачать отчёт" }));
		await waitFor(() => expect(notify).toHaveBeenCalledWith({
			message: "Укажите купленные часы в кабинете клиента перед формированием отчёта",
			type: "error",
		}));
		expect(api.downloadSupportPdf).not.toHaveBeenCalled();
		expect(api.fetchPackageChecks).not.toHaveBeenCalled();
		expect(screen.getByRole("button", { name: "Скачать отчёт" })).toBeEnabled();
	});
	it("does not load or save archives on mount, package changes or current PDF download", async () => {
		const get = vi.spyOn($backendApi, "get");
		const post = vi.spyOn($backendApi, "post");
		try {
			fetchPdf.mockResolvedValue(new Blob(["current PDF"]));
			const view = render(
				<SupportPackageReportPanel packageId={7} hasPackages />,
			);
			expect(
				screen.queryByRole("button", { name: /Зафиксировать версию/ }),
			).not.toBeInTheDocument();
			expect(screen.queryByText(/Сохранённые версии/)).not.toBeInTheDocument();
			view.rerender(
				<SupportPackageReportPanel packageId={8} refreshKey={2} hasPackages />,
			);
			expect(get).not.toHaveBeenCalled();
			expect(post).not.toHaveBeenCalled();
			fireEvent.click(screen.getByRole("button", { name: "Скачать отчёт" }));
			await waitFor(() =>
				expect(api.downloadSupportPdf).toHaveBeenCalledWith(
					expect.any(Blob),
					"support-package-8.pdf",
				),
			);
			expect(api.fetchPackageChecks).not.toHaveBeenCalled();
			expect(fetchPdf).toHaveBeenCalledExactlyOnceWith(8);
			expect(get).not.toHaveBeenCalled();
			expect(post).not.toHaveBeenCalled();
		} finally {
			get.mockRestore();
			post.mockRestore();
		}
	});
	it("ignores a late PDF for the previous package and allows the current export afterward", async () => {
		const late = deferred<Blob>();
		fetchPdf.mockReturnValueOnce(late.promise);
		const view = render(<SupportPackageReportPanel packageId={7} hasPackages />);
		fireEvent.click(screen.getByRole("button", { name: "Скачать отчёт" }));
		view.rerender(<SupportPackageReportPanel packageId={8} hasPackages />);
		await act(async () => late.resolve(new Blob(["old client PDF"])));
		expect(api.downloadSupportPdf).not.toHaveBeenCalled();
		expect(api.fetchPackageChecks).not.toHaveBeenCalled();
		expect(screen.getByRole("button", { name: "Скачать отчёт" })).toBeEnabled();
		fetchPdf.mockResolvedValueOnce(new Blob(["current client PDF"]));
		fireEvent.click(screen.getByRole("button", { name: "Скачать отчёт" }));
		await waitFor(() => expect(api.downloadSupportPdf).toHaveBeenCalledExactlyOnceWith(
			expect.any(Blob), "support-package-8.pdf",
		));
		expect(fetchPdf).toHaveBeenNthCalledWith(1, 7);
		expect(fetchPdf).toHaveBeenNthCalledWith(2, 8);
	});
});
