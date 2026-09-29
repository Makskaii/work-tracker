import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { notify } from "@/shared/ui/NotificationPopup/notify";
import {
	ClientHoursPackageModal,
	type HoursPackageModalMode,
	type PurchaseFormValues,
} from "./ClientHoursPackageModal";
import styles from "./ClientHoursPackagesPage.module.scss";
import {
	createSupportHoursPackage,
	deleteSupportHoursPackage,
	fetchSupportHoursPackages,
	fetchSupportProjects,
	fetchSupportProjectTasks,
	syncSupportProjects,
	syncSupportHoursReports,
	type SupportProjectTask,
	updateSupportHoursPackage,
} from "./clientHoursPackages.api";
import type {
	ClientPackage,
	PackagePurchase,
	SupportProjectOption,
} from "./clientHoursPackages.types";
import { SupportProjectDetails } from "./SupportProjectDetails";
import { SupportReportModal } from "./SupportReportModal";
import { SupportProjectsSidebar } from "./SupportProjectsSidebar";

const selectedProjectStorageKey = "support-hours:selected-project-id";
const selectedProjectHistoryStateKey = "support-hours:selected-project-id";
let rememberedProjectId: number | null = null;

const getProjectId = (value: unknown) => {
	const projectId = Number(value);
	return Number.isSafeInteger(projectId) && projectId > 0 ? projectId : null;
};

const getStoredProjectId = () => {
	const historyProjectId = getProjectId(
		(window.history.state as Record<string, unknown> | null)?.[
			selectedProjectHistoryStateKey
		],
	);
	if (historyProjectId != null) return historyProjectId;
	if (rememberedProjectId != null) return rememberedProjectId;
	const value = window.sessionStorage.getItem(selectedProjectStorageKey);
	return getProjectId(value);
};

export const ClientHoursPackagesPage = () => {
	const [packages, setPackages] = useState<ClientPackage[]>([]);
	const packagesRef = useRef<ClientPackage[]>([]);
	const [projects, setProjects] = useState<SupportProjectOption[]>([]);
	const [loadState, setLoadState] = useState<"loading" | "ready" | "error">(
		"loading",
	);
	const [refreshVersion, setRefreshVersion] = useState(0);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
	const [refreshError, setRefreshError] = useState(false);
	const refreshPromiseRef = useRef<Promise<void> | null>(null);
	const mountedRef = useRef(true);
	const [reportEditor, setReportEditor] = useState<{
		taskId?: string;
		reportId?: string;
	} | null>(null);
	const [projectTasks, setProjectTasks] = useState<SupportProjectTask[]>([]);
	const [projectQuery, setProjectQuery] = useState("");
	const [selectedProjectId, setSelectedProjectId] = useState<number | null>(
		getStoredProjectId,
	);
	const [selectedPurchaseId, setSelectedPurchaseId] = useState<number | null>(
		null,
	);
	const selectedProjectIdRef = useRef<number | null>(selectedProjectId);
	const loadRequestIdRef = useRef(0);
	const hasInitializedProjectRef = useRef(false);
	const [modalMode, setModalMode] = useState<HoursPackageModalMode | null>(
		null,
	);
	const [modalProjectId, setModalProjectId] = useState<number | null>(null);
	const [editingPurchase, setEditingPurchase] =
		useState<PackagePurchase | null>(null);

	const loadData = useCallback(async (signal?: AbortSignal) => {
		const requestId = ++loadRequestIdRef.current;
		const [nextPackages, supportProjects] = await Promise.all([
			fetchSupportHoursPackages(signal),
			fetchSupportProjects(signal),
		]);
		if (signal?.aborted || requestId !== loadRequestIdRef.current) return;
		setPackages(nextPackages);
		packagesRef.current = nextPackages;
		setProjects(supportProjects);
	}, []);

	const reconcile = useCallback(
		(signal?: AbortSignal) => {
			if (refreshPromiseRef.current) return refreshPromiseRef.current;
			setIsRefreshing(true);
			setRefreshError(false);
			const promise = syncSupportProjects(signal)
				.then(() => syncSupportHoursReports(signal))
				.then(() => loadData(signal))
				.then(() => {
					if (signal?.aborted || !mountedRef.current) return;
					setLoadState("ready");
					setLastRefreshed(new Date());
					setRefreshVersion((value) => value + 1);
				})
				.catch((cause) => {
					if (signal?.aborted || !mountedRef.current) return;
					setRefreshError(true);
					setLoadState((state) => (state === "ready" ? "ready" : "error"));
					notify({
						message:
							"Не удалось сверить отчёты с Битрикс24. Остатки часов не обновлены.",
						type: "error",
					});
					throw cause;
				})
				.finally(() => {
					if (refreshPromiseRef.current === promise) {
						refreshPromiseRef.current = null;
						if (mountedRef.current) setIsRefreshing(false);
					}
				});
			refreshPromiseRef.current = promise;
			return promise;
		},
		[loadData],
	);
	const reconcileAfterChange = useCallback(async () => {
		// A refresh that started before a write cannot confirm the new balances.
		await refreshPromiseRef.current?.catch(() => undefined);
		await reconcile();
	}, [reconcile]);

	useEffect(() => {
		mountedRef.current = true;
		const controller = new AbortController();
		void reconcile(controller.signal).catch(() => undefined);
		return () => {
			mountedRef.current = false;
			controller.abort();
			refreshPromiseRef.current = null;
		};
	}, [reconcile]);
	useEffect(() => {
		const refresh = () => {
			if (
				document.visibilityState === "hidden" ||
				modalMode ||
				reportEditor ||
				!lastRefreshed ||
				Date.now() - lastRefreshed.getTime() < 1500
			)
				return;
			void reconcile().catch(() => undefined);
		};
		window.addEventListener("focus", refresh);
		document.addEventListener("visibilitychange", refresh);
		return () => {
			window.removeEventListener("focus", refresh);
			document.removeEventListener("visibilitychange", refresh);
		};
	}, [reconcile, modalMode, reportEditor, lastRefreshed]);

	useEffect(() => {
		if (selectedProjectId == null) return;
		window.sessionStorage.setItem(
			selectedProjectStorageKey,
			String(selectedProjectId),
		);
	}, [selectedProjectId]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: successful reconciliation also refreshes task names and statuses for the same project.
	useEffect(() => {
		if (selectedProjectId == null) {
			setProjectTasks([]);
			return;
		}
		const controller = new AbortController();
		setProjectTasks([]);
		fetchSupportProjectTasks(selectedProjectId, controller.signal)
			.then((tasks) => {
				if (!controller.signal.aborted) setProjectTasks(tasks);
			})
			.catch(() => {
				if (!controller.signal.aborted)
					notify({
						message: "Не удалось загрузить задачи техпод-проекта",
						type: "error",
					});
			});
		return () => controller.abort();
	}, [selectedProjectId, refreshVersion]);

	useEffect(() => {
		if (!projects.length) return;
		if (hasInitializedProjectRef.current) return;
		hasInitializedProjectRef.current = true;
		setSelectedProjectId((currentProjectId) => {
			const initialProjectId = selectedProjectIdRef.current ?? currentProjectId;
			if (
				initialProjectId != null &&
				projects.some((project) => project.id === initialProjectId)
			) {
				selectedProjectIdRef.current = initialProjectId;
				return initialProjectId;
			}
			const firstProjectId = projects[0]?.id ?? null;
			selectedProjectIdRef.current = firstProjectId;
			return firstProjectId;
		});
	}, [projects]);

	const rememberProject = (projectId: number, resetPurchase = true) => {
		rememberedProjectId = projectId;
		selectedProjectIdRef.current = projectId;
		window.sessionStorage.setItem(selectedProjectStorageKey, String(projectId));
		const currentHistoryState = window.history.state;
		window.history.replaceState(
			{
				...(currentHistoryState && typeof currentHistoryState === "object"
					? currentHistoryState
					: {}),
				[selectedProjectHistoryStateKey]: projectId,
			},
			"",
		);
		setSelectedProjectId(projectId);
		if (resetPurchase) setSelectedPurchaseId(null);
	};

	const selectPurchase = (projectId: number, purchaseId: number | null) => {
		rememberProject(projectId, false);
		setSelectedPurchaseId(purchaseId);
	};

	const selectedProject = useMemo(() => {
		const projectId = selectedProjectId ?? selectedProjectIdRef.current;
		return projects.find((project) => project.id === projectId) ?? null;
	}, [projects, selectedProjectId]);
	const selectedProjectPackages = useMemo(
		() => packages.find((item) => item.id === selectedProjectId) ?? null,
		[packages, selectedProjectId],
	);

	const closeModal = () => {
		setModalMode(null);
		setModalProjectId(null);
		setEditingPurchase(null);
	};

	const openModal = (
		mode: HoursPackageModalMode,
		projectId: number | null,
		purchase: PackagePurchase | null = null,
	) => {
		setModalMode(mode);
		setModalProjectId(projectId);
		setEditingPurchase(purchase);
	};

	const savePurchase = async (
		{ projectId, date, hours, comment }: PurchaseFormValues,
		fingerprint?: string,
	) => {
		const selectedId = Number(projectId);
		rememberProject(selectedId, false);
		if (modalMode === "edit" && editingPurchase)
			await updateSupportHoursPackage(
				editingPurchase.id,
				{ purchasedHours: hours, purchaseDate: date, comment },
				fingerprint,
			);
		else
			await createSupportHoursPackage({
				projectId: selectedId,
				purchasedHours: hours,
				purchaseDate: date,
				comment,
			});
		closeModal();
		notify({
			message:
				modalMode === "edit" ? "Пакет обновлён" : "Покупка часов добавлена",
			type: "success",
		});
		try {
			await reconcileAfterChange();
		} catch {
			notify({
				message:
					"Пакет сохранён. Нажмите «Обновить данные», чтобы увидеть новые остатки.",
				type: "error",
			});
		}
		setRefreshVersion((value) => value + 1);
	};
	const deletePurchase = async (fingerprint: string) => {
		if (!editingPurchase) return;
		await deleteSupportHoursPackage(editingPurchase.id, fingerprint);
		if (editingPurchase.id === selectedPurchaseId) setSelectedPurchaseId(null);
		closeModal();
		notify({ message: "Пакет удалён", type: "success" });
		try {
			await reconcileAfterChange();
		} catch {
			notify({
				message:
					"Пакет удалён. Нажмите «Обновить данные», чтобы увидеть новые остатки.",
				type: "error",
			});
		}
		setRefreshVersion((value) => value + 1);
	};

	return (
		<section className={styles.page}>
			{loadState === "ready" && (
				<div className={styles.refreshBar}>
					<span>
						{isRefreshing
							? "Сверяем данные с Битрикс24…"
							: lastRefreshed
								? `Последняя сверка: ${lastRefreshed.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Moscow" })}`
								: ""}
					</span>
					{refreshError && (
						<span className={styles.formError} role="alert">
							Сверка не завершена. Показаны данные последней успешной загрузки.
						</span>
					)}
					<button
						className={styles.inlineAction}
						type="button"
						disabled={isRefreshing}
						onClick={() => void reconcile().catch(() => undefined)}
					>
						Обновить данные
					</button>
				</div>
			)}
			{loadState !== "ready" ? (
				<div
					className={styles.projectDetails}
					role={loadState === "error" ? "alert" : "status"}
				>
					<p>
						{loadState === "loading"
							? "Сверяем отчёты и остатки часов с Битрикс24…"
							: "Не удалось обновить отчёты. Повторите попытку, чтобы получить актуальный остаток часов."}
					</p>
					{loadState === "error" && (
						<button
							type="button"
							className={styles.addPackageButton}
							onClick={() => {
								setLoadState("loading");
								void reconcile().catch(() => undefined);
							}}
						>
							Повторить загрузку
						</button>
					)}
				</div>
			) : (
				<div className={styles.workspace}>
					<SupportProjectsSidebar
						packages={packages}
						projects={projects}
						query={projectQuery}
						selectedProjectId={selectedProjectId}
						selectedPurchaseId={selectedPurchaseId}
						onQueryChange={setProjectQuery}
						onSelectPurchase={selectPurchase}
					/>
					<SupportProjectDetails
						project={selectedProject}
						refreshKey={refreshVersion}
						onCardClosed={() => reconcileAfterChange().catch(() => undefined)}
						onAddReport={(taskId) => setReportEditor({ taskId })}
						onEditReport={(reportId) => setReportEditor({ reportId })}
						projectPackages={selectedProjectPackages}
						projectTasks={projectTasks}
						selectedPurchaseId={selectedPurchaseId}
						onAddPackage={() => openModal("new-package", selectedProjectId)}
						onEditPackage={(purchase) =>
							openModal("edit", selectedProjectId, purchase)
						}
					/>
				</div>
			)}
			{reportEditor && selectedProject && (
				<SupportReportModal
					key={`${selectedProject.id}:${reportEditor.reportId ?? "new"}:${reportEditor.taskId ?? ""}`}
					projectId={selectedProject.id}
					projectTitle={selectedProject.title}
					tasks={projectTasks}
					initialTaskId={reportEditor.taskId}
					reportId={reportEditor.reportId}
					onClose={() => setReportEditor(null)}
					onSaved={async () => {
						const before = packagesRef.current.find(
							(item) => item.id === selectedProject.id,
						)?.remainingHours;
						await reconcileAfterChange();
						const after = packagesRef.current.find(
							(item) => item.id === selectedProject.id,
						)?.remainingHours;
						notify({
							message:
								before != null && after != null && before !== after
									? `Отчёт сохранён. Остаток проекта: ${before} → ${after} ч.`
									: "Отчёт сохранён. Списания и остатки пересчитаны.",
							type: "success",
						});
					}}
				/>
			)}
			<ClientHoursPackageModal
				projects={projects}
				projectId={modalProjectId}
				isOpen={modalMode !== null}
				mode={modalMode ?? "purchase"}
				onClose={closeModal}
				onDelete={deletePurchase}
				onSubmit={savePurchase}
				purchase={editingPurchase}
			/>
		</section>
	);
};
