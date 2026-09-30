import { useB24 } from "@/shared/config/bitrixProvider/bitrixContext";
import { supportErrorMessage } from "./supportAnalyst.api";
import { commitSupportTransfer, previewSupportTransfer, resumeSupportTransfer, pendingTransferFromError } from "./supportTransfer.api";
import type { SupportTransferDraft } from "./supportTransfer.model";
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
import { fetchSupportProjectWorkspace, type SupportProjectWorkspace } from "./supportWorkspace.api";

const selectedProjectStorageKey = "support-hours:selected-project-id";
const selectedProjectHistoryStateKey = "support-hours:selected-project-id";
const backgroundRefreshIntervalMs = 60_000;
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

const isInactiveSupportProjectError = (cause: unknown) => {
	if (!cause || typeof cause !== "object") return false;
	const response = (cause as {
		response?: { status?: number; data?: { message?: unknown } };
	}).response;
	return response?.status === 400 && response.data?.message ===
		"Проект больше не относится к техподдержке. Обновите данные";
};

export const ClientHoursPackagesPage = () => {
  const { b24 } = useB24();
  const [pendingTransfer, setPendingTransfer] = useState<{projectId: number; id: string} | null>(null);
  const [transferBusy, setTransferBusy] = useState(false);
  const transferKeyRef = useRef<{fingerprint: string; id: string} | null>(null);
  const getTransferToken = useCallback(async () => {
    if (!b24) throw new Error("Откройте приложение внутри Битрикс24, чтобы переносить работы со своими правами");
    const auth = b24.auth.getAuthData();
    const current = !auth || auth.expires * 1000 <= Date.now() + 60_000 ? await b24.auth.refreshAuth() : auth;
    if (!current.access_token) throw new Error("Обновите сессию Битрикс24");
    return current.access_token;
  }, [b24]);
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
	const [projectWorkspace, setProjectWorkspace] = useState<SupportProjectWorkspace | null>(null);
	const workspaceSnapshotRef = useRef<SupportProjectWorkspace | null>(null);
	const [workspaceLoading, setWorkspaceLoading] = useState(false);
	const [workspaceError, setWorkspaceError] = useState<string | null>(null);
	const workspaceRequestIdRef = useRef(0);
	const workspacePromiseRef = useRef<{ projectId: number; signal?: AbortSignal; promise: Promise<SupportProjectWorkspace> } | null>(null);
	const [projectQuery, setProjectQuery] = useState("");
	const [selectedProjectId, setSelectedProjectId] = useState<number | null>(
		getStoredProjectId,
	);
	const [selectedPurchaseId, setSelectedPurchaseId] = useState<number | null>(
		null,
	);
	const selectedProjectIdRef = useRef<number | null>(selectedProjectId);
	const loadRequestIdRef = useRef(0);
	const [modalMode, setModalMode] = useState<HoursPackageModalMode | null>(
		null,
	);
	const [modalProjectId, setModalProjectId] = useState<number | null>(null);
	const [editingPurchase, setEditingPurchase] =
		useState<PackagePurchase | null>(null);

	const rememberProject = useCallback((projectId: number | null, resetPurchase = true) => {
		if (selectedProjectIdRef.current !== projectId) {
			// A late response for the previous project must not restore its workspace.
			workspaceRequestIdRef.current += 1;
			workspacePromiseRef.current = null;
			workspaceSnapshotRef.current = null;
			setProjectWorkspace(null);
			setProjectTasks([]);
			setWorkspaceLoading(false);
			setWorkspaceError(null);
			setReportEditor(null);
			setModalMode(null);
			setModalProjectId(null);
			setEditingPurchase(null);
		}
		rememberedProjectId = projectId;
		selectedProjectIdRef.current = projectId;
		if (projectId == null) window.sessionStorage.removeItem(selectedProjectStorageKey);
		else window.sessionStorage.setItem(selectedProjectStorageKey, String(projectId));
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
	}, []);

	const loadWorkspace = useCallback((projectId: number, signal?: AbortSignal) => {
		const current = workspacePromiseRef.current;
		if (current?.projectId === projectId && !current.signal?.aborted) return current.promise;
		const requestId = ++workspaceRequestIdRef.current;
		setWorkspaceLoading(true);
		setWorkspaceError(null);
		const promise = fetchSupportProjectWorkspace(projectId, signal)
			.then((workspace) => {
				if (!signal?.aborted && mountedRef.current && requestId === workspaceRequestIdRef.current && selectedProjectIdRef.current === projectId) {
					setProjectWorkspace(workspace);
					workspaceSnapshotRef.current = workspace;
					setProjectTasks(workspace.tasks);
					const next = packagesRef.current.filter((item) => item.id !== projectId);
					if (workspace.packageGroup.purchases.length) next.push(workspace.packageGroup);
					packagesRef.current = next;
					setPackages(next);
				}
				return workspace;
			})
			.catch((cause) => {
				if (!signal?.aborted && mountedRef.current && requestId === workspaceRequestIdRef.current && selectedProjectIdRef.current === projectId) {
					if (isInactiveSupportProjectError(cause)) {
						// The project may change type between catalogue sync and workspace loading.
						// Hide it only in this view; do not delete any stored package or report.
						setProjects((currentProjects) => currentProjects.filter((project) => project.id !== projectId));
					} else {
						const pendingId = pendingTransferFromError(cause);
						if (pendingId) setPendingTransfer({projectId, id: pendingId});
						setWorkspaceError(supportErrorMessage(cause, "Не удалось загрузить все работы проекта. Повторите загрузку, чтобы проверить отчёты и остатки."));
					}
				}
				throw cause;
			})
			.finally(() => {
				if (workspacePromiseRef.current?.promise === promise) workspacePromiseRef.current = null;
				if (mountedRef.current && requestId === workspaceRequestIdRef.current) setWorkspaceLoading(false);
			});
		workspacePromiseRef.current = { projectId, signal, promise };
		return promise;
	}, []);

	const loadData = useCallback(async (signal?: AbortSignal) => {
		const requestId = ++loadRequestIdRef.current;
		const [nextPackages, supportProjects] = await Promise.all([
			fetchSupportHoursPackages(signal),
			fetchSupportProjects(signal),
		]);
		if (signal?.aborted || !mountedRef.current || requestId !== loadRequestIdRef.current) return;
		setPackages(nextPackages);
		packagesRef.current = nextPackages;
		setProjects(supportProjects);
		const currentProjectId = selectedProjectIdRef.current;
		const projectId = supportProjects.some((project) => project.id === currentProjectId)
			? currentProjectId
			: supportProjects[0]?.id ?? null;
		if (projectId !== currentProjectId) rememberProject(projectId);
		// The catalogue and reconciled balances are usable even if one workspace fails.
		setLoadState("ready");
		if (projectId != null && supportProjects.some((project) => project.id === projectId)) {
			// A snapshot started before the reconciliation can miss a just-saved report.
			await workspacePromiseRef.current?.promise.catch(() => undefined);
			if (signal?.aborted || !mountedRef.current || requestId !== loadRequestIdRef.current || selectedProjectIdRef.current !== projectId) return;
			try {
				await loadWorkspace(projectId, signal);
			} catch (cause) {
				// A type transition is recovered by selecting another catalogue entry.
				// Other failures remain visible and still reject mutation reconciliation.
				if (!isInactiveSupportProjectError(cause)) throw cause;
			}
		}
	}, [loadWorkspace, rememberProject]);

	const reconcile = useCallback(
		(signal?: AbortSignal, loadSelectedProjectFirst = false) => {
			if (refreshPromiseRef.current) return refreshPromiseRef.current;
			setIsRefreshing(true);
			setRefreshError(false);
			const promise = syncSupportProjects(signal)
				// Reconcile the selected project's complete history before starting
				// the global sync, which shares the server's mutation queue.
				.then(() => loadSelectedProjectFirst ? loadData(signal) : undefined)
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
		await workspacePromiseRef.current?.promise.catch(() => undefined);
		await reconcile();
	}, [reconcile]);


  const previewTransfer = useCallback(async (draft: SupportTransferDraft) => {
    try { return await previewSupportTransfer(draft, await getTransferToken()); }
    catch (error) {
      const id = pendingTransferFromError(error);
      if (id) setPendingTransfer({projectId: draft.projectId, id});
      throw new Error(supportErrorMessage(error, error instanceof Error ? error.message : "Не удалось рассчитать перенос"));
    }
  }, [getTransferToken]);
  const transfer = useCallback(async (draft: SupportTransferDraft, fingerprint: string) => {
    setTransferBusy(true);
    if (transferKeyRef.current?.fingerprint !== fingerprint) transferKeyRef.current = {fingerprint, id: crypto.randomUUID()};
    try {
      await commitSupportTransfer(draft, fingerprint, await getTransferToken(), transferKeyRef.current.id);
      setPendingTransfer(null);
      transferKeyRef.current = null;
      try {
        await reconcileAfterChange();
        notify({message: "Работы перенесены, остатки пересчитаны", type: "success"});
      } catch { notify({message: "Перенос сохранён. Обновите данные, чтобы увидеть новые остатки", type: "error"}); }
    } catch (error) {
      const id = pendingTransferFromError(error);
      if (id) setPendingTransfer({projectId: draft.projectId, id});
      throw new Error(supportErrorMessage(error, "Не удалось подтвердить перенос. Повторите запрос: повторного списания не будет"));
    } finally { setTransferBusy(false); }
  }, [getTransferToken, reconcileAfterChange]);
  const resolvePendingTransfer = async (cancel: boolean) => {
    if (!pendingTransfer || transferBusy) return;
    setTransferBusy(true);
    try {
      await resumeSupportTransfer(pendingTransfer.projectId, pendingTransfer.id, await getTransferToken(), cancel);
      setPendingTransfer(null);
      transferKeyRef.current = null;
      await reconcileAfterChange();
      notify({message: cancel ? "Незавершённый перенос отменён" : "Перенос завершён", type: "success"});
    } catch (error) { notify({message: supportErrorMessage(error, "Не удалось завершить действие. Повторите после обновления сессии Битрикса"), type: "error"}); }
    finally { setTransferBusy(false); }
  };

	useEffect(() => {
		mountedRef.current = true;
		const controller = new AbortController();
		void reconcile(controller.signal, true).catch(() => undefined);
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
        transferBusy ||
        pendingTransfer ||
				!lastRefreshed ||
				Date.now() - lastRefreshed.getTime() < backgroundRefreshIntervalMs
			)
				return;
			void reconcile().catch(() => undefined);
		};
		document.addEventListener("visibilitychange", refresh);
		return () => {
			document.removeEventListener("visibilitychange", refresh);
		};
	}, [reconcile, modalMode, reportEditor, lastRefreshed, transferBusy, pendingTransfer]);

	useEffect(() => {
		if (selectedProjectId == null) return;
		window.sessionStorage.setItem(
			selectedProjectStorageKey,
			String(selectedProjectId),
		);
	}, [selectedProjectId]);

	useEffect(() => {
		if (loadState !== "ready" || workspaceSnapshotRef.current?.projectId === selectedProjectId) return;
		if (workspacePromiseRef.current?.projectId === selectedProjectId && !workspacePromiseRef.current.signal?.aborted) return;
		if (selectedProjectId != null && !projects.some((project) => project.id === selectedProjectId)) return;
		setProjectWorkspace(null);
		workspaceSnapshotRef.current = null;
		setProjectTasks([]);
		setWorkspaceError(null);
		if (selectedProjectId == null) {
			return;
		}
		const controller = new AbortController();
		void loadWorkspace(selectedProjectId, controller.signal).catch(() => undefined);
		return () => controller.abort();
	}, [selectedProjectId, loadWorkspace, loadState, projects]);

	useEffect(() => {
		if (loadState !== "ready") return;
		const currentProjectId = selectedProjectIdRef.current;
		if (currentProjectId != null && projects.some((project) => project.id === currentProjectId)) return;
		const nextProjectId = projects[0]?.id ?? null;
		if (currentProjectId !== nextProjectId) rememberProject(nextProjectId);
	}, [projects, loadState, rememberProject]);

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
	const supportPackages = useMemo(() => {
		const projectIds = new Set(projects.map((project) => project.id));
		return packages.filter((item) => projectIds.has(item.id));
	}, [packages, projects]);

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
      {pendingTransfer && <div className={styles.workspaceError} role="alert">
        <span>Перенос не завершён. До завершения или отмены его распределение защищено от автоматического пересчёта.</span>
        <button type="button" className={styles.inlineAction} disabled={transferBusy} onClick={() => void resolvePendingTransfer(false)}>Продолжить перенос</button>
        <button type="button" className={styles.inlineAction} disabled={transferBusy} onClick={() => void resolvePendingTransfer(true)}>Отменить перенос</button>
      </div>}
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
						packages={supportPackages}
						projects={projects}
						query={projectQuery}
						selectedProjectId={selectedProjectId}
						selectedPurchaseId={selectedPurchaseId}
						onQueryChange={setProjectQuery}
						onSelectPurchase={selectPurchase}
					/>
					<SupportProjectDetails
						project={selectedProject}
            onPreviewTransfer={previewTransfer}
            onTransfer={transfer}
						refreshKey={refreshVersion}
						onCardClosed={() => reconcileAfterChange().catch(() => undefined)}
						onAddReport={(taskId) => setReportEditor({ taskId })}
						onEditReport={(reportId) => setReportEditor({ reportId })}
						projectPackages={selectedProjectPackages}
						projectTasks={projectTasks}
						workspace={projectWorkspace?.projectId === selectedProjectId ? projectWorkspace : null}
						workspaceLoading={workspaceLoading}
						workspaceError={workspaceError}
						onRetryWorkspace={() => {
							if (selectedProjectId != null) void loadWorkspace(selectedProjectId).catch(() => undefined);
						}}
						onSelectPackage={(id) => {
							if (selectedProjectId != null) selectPurchase(selectedProjectId, id);
						}}
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
