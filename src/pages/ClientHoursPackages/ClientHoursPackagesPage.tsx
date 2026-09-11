import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { notify } from "@/shared/ui/NotificationPopup/notify";
import {
	ClientHoursPackageModal,
	type HoursPackageModalMode,
} from "./ClientHoursPackageModal";
import styles from "./ClientHoursPackagesPage.module.scss";
import {
	createSupportHoursPackage,
	deleteSupportHoursPackage,
	fetchSupportHoursPackages,
	fetchSupportProjects,
	syncSupportProjects,
	updateSupportHoursPackage,
} from "./clientHoursPackages.api";
import type {
	ClientPackage,
	PackagePurchase,
	SupportProjectOption,
} from "./clientHoursPackages.types";
import { SupportProjectDetails } from "./SupportProjectDetails";
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
	const [projects, setProjects] = useState<SupportProjectOption[]>([]);
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
	const hasLoadedProjectsRef = useRef(false);
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
		if (!supportProjects.length && hasLoadedProjectsRef.current) return;
		setPackages(nextPackages);
		setProjects(supportProjects);
		if (supportProjects.length) hasLoadedProjectsRef.current = true;
	}, []);
	const reloadPackages = useCallback(async () => {
		const nextPackages = await fetchSupportHoursPackages();
		setPackages(nextPackages);
	}, []);

	useEffect(() => {
		const controller = new AbortController();
		loadData(controller.signal).catch(() => {
			if (!controller.signal.aborted)
				notify({
					message: "Не удалось загрузить данные техподдержки",
					type: "error",
				});
		});
		syncSupportProjects()
			.then(() => loadData(controller.signal))
			.catch(() => {
				if (!controller.signal.aborted)
					notify({
						message: "Не удалось обновить список техпод-проектов",
						type: "error",
					});
			});
		return () => controller.abort();
	}, [loadData]);

	useEffect(() => {
		if (selectedProjectId == null) return;
		window.sessionStorage.setItem(
			selectedProjectStorageKey,
			String(selectedProjectId),
		);
	}, [selectedProjectId]);

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

	const selectedProject = useMemo(
		() => {
			const projectId = selectedProjectId ?? selectedProjectIdRef.current;
			return projects.find((project) => project.id === projectId) ?? null;
		},
		[projects, selectedProjectId],
	);
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

	const savePurchase = async ({
		projectId,
		date,
		hours,
		comment,
	}: {
		projectId: number;
		date: string;
		hours: number;
		comment?: string;
	}) => {
		const selectedId = Number(projectId);
		rememberProject(selectedId, false);
		try {
			if (modalMode === "edit" && editingPurchase)
				await updateSupportHoursPackage(editingPurchase.id, {
					purchasedHours: hours,
					purchaseDate: date,
					comment,
				});
			else
				await createSupportHoursPackage({
					projectId: selectedId,
					purchasedHours: hours,
					purchaseDate: date,
					comment,
				});
			await reloadPackages();
			rememberProject(selectedId, false);
			notify({
				message:
					modalMode === "edit" ? "Пакет обновлён" : "Покупка часов добавлена",
				type: "success",
			});
			closeModal();
		} catch {
			notify({ message: "Не удалось сохранить пакет", type: "error" });
		}
	};

	const deletePurchase = async () => {
		if (!editingPurchase) return;
		const selectedId = modalProjectId == null ? null : Number(modalProjectId);
		if (selectedId != null) rememberProject(selectedId, false);
		try {
			await deleteSupportHoursPackage(editingPurchase.id);
			await reloadPackages();
			if (selectedId != null) rememberProject(selectedId, false);
			if (editingPurchase?.id === selectedPurchaseId) setSelectedPurchaseId(null);
			notify({ message: "Пакет удалён", type: "success" });
			closeModal();
		} catch {
			notify({ message: "Не удалось удалить пакет", type: "error" });
		}
	};

	return (
		<section className={styles.page}>
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
					projectPackages={selectedProjectPackages}
					selectedPurchaseId={selectedPurchaseId}
					onAddPackage={() => openModal("new-package", selectedProjectId)}
					onEditPackage={(purchase) =>
						openModal("edit", selectedProjectId, purchase)
					}
				/>
			</div>
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
