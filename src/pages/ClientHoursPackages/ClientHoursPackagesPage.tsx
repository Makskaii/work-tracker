import { useCallback, useEffect, useMemo, useState } from "react";
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

export const ClientHoursPackagesPage = () => {
	const [packages, setPackages] = useState<ClientPackage[]>([]);
	const [projects, setProjects] = useState<SupportProjectOption[]>([]);
	const [projectQuery, setProjectQuery] = useState("");
	const [selectedProjectId, setSelectedProjectId] = useState<number | null>(
		null,
	);
	const [modalMode, setModalMode] = useState<HoursPackageModalMode | null>(
		null,
	);
	const [modalProjectId, setModalProjectId] = useState<number | null>(null);
	const [editingPurchase, setEditingPurchase] =
		useState<PackagePurchase | null>(null);

	const loadData = useCallback(async (signal?: AbortSignal) => {
		const [nextPackages, supportProjects] = await Promise.all([
			fetchSupportHoursPackages(signal),
			fetchSupportProjects(signal),
		]);
		setPackages(nextPackages);
		setProjects(supportProjects);
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
			.catch(() => undefined);
		return () => controller.abort();
	}, [loadData]);

	useEffect(() => {
		setSelectedProjectId((currentProjectId) => {
			if (
				currentProjectId &&
				projects.some((project) => project.id === currentProjectId)
			)
				return currentProjectId;
			return projects[0]?.id ?? null;
		});
	}, [projects]);

	const selectedProject = useMemo(
		() => projects.find((project) => project.id === selectedProjectId) ?? null,
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
			await loadData();
			setSelectedProjectId(selectedId);
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
		try {
			await deleteSupportHoursPackage(editingPurchase.id);
			await loadData();
			if (selectedId != null) setSelectedProjectId(selectedId);
			notify({ message: "Пакет удалён", type: "success" });
			closeModal();
		} catch {
			notify({ message: "Не удалось удалить пакет", type: "error" });
		}
	};

	return (
		<section className={styles.page}>
			<header className={styles.pageHeader}>
				<div>
					<span className={styles.eyebrow}>Техподдержка</span>
					<h1>Отчёт по техподдержке</h1>
					<p>Пакеты часов, списания и история отчётов по проектам</p>
				</div>
			</header>
			<div className={styles.workspace}>
				<SupportProjectsSidebar
					packages={packages}
					projects={projects}
					query={projectQuery}
					selectedProjectId={selectedProjectId}
					onQueryChange={setProjectQuery}
					onSelect={setSelectedProjectId}
				/>
				<SupportProjectDetails
					project={selectedProject}
					projectPackages={selectedProjectPackages}
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
