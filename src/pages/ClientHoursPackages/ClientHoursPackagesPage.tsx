import { useCallback, useEffect, useMemo, useState } from "react";
import {
	FaChevronDown,
	FaChevronRight,
	FaPen,
	FaPlus,
	FaSearch,
	FaSlidersH,
} from "react-icons/fa";
import { notify } from "@/shared/ui/NotificationPopup/notify";
import { fetchReportProjects } from "@/pages/ReportsPage/ui/SalesPage/model/projectReports.api";
import { ClientHoursPackageModal, type HoursPackageModalMode } from "./ClientHoursPackageModal";
import { createSupportHoursPackage, deleteSupportHoursPackage, fetchSupportHoursPackages, updateSupportHoursPackage } from "./clientHoursPackages.api";
import type { ClientPackage, PackagePurchase, PackageState, SupportProjectOption } from "./clientHoursPackages.types";
import styles from "./ClientHoursPackagesPage.module.scss";

const formatHours = (value: number) =>
	`${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(value)} ч`;

const STATE_LABELS: Record<PackageState, string> = {
	active: "Активный пакет",
	ending: "Заканчиваются",
	empty: "Часы закончились",
	overdue: "Перерасход",
};

const formatPackageDate = (value: string) => new Intl.DateTimeFormat("ru-RU").format(new Date(`${value}T00:00:00`));

export const ClientHoursPackagesPage = () => {
	const [packages, setPackages] = useState<ClientPackage[]>([]);
	const [projects, setProjects] = useState<SupportProjectOption[]>([]);
	const [query, setQuery] = useState("");
	const [stateFilter, setStateFilter] = useState<PackageState | "all">("all");
	const [expandedClientId, setExpandedClientId] = useState<number | null>(3);
	const [modalMode, setModalMode] = useState<HoursPackageModalMode | null>(null);
	const [modalClientId, setModalClientId] = useState<number | null>(null);
	const [editingPurchase, setEditingPurchase] = useState<PackagePurchase | null>(null);

	const loadPackages = useCallback(async (signal?: AbortSignal) => {
		const [nextPackages, reportProjects] = await Promise.all([
			fetchSupportHoursPackages(signal),
			fetchReportProjects(signal),
		]);
		setPackages(nextPackages);
		setProjects(reportProjects.filter((project) => project.projectType === "support").map((project) => ({ id: project.id, title: project.clientCompany ? `${project.clientCompany} | ${project.title}` : project.title })));
	}, []);

	useEffect(() => {
		const controller = new AbortController();
		loadPackages(controller.signal).catch(() => {
			if (!controller.signal.aborted) notify({ message: "Не удалось загрузить пакеты часов", type: "error" });
		});
		return () => controller.abort();
	}, [loadPackages]);

	const visiblePackages = useMemo(() => {
		const normalizedQuery = query.trim().toLocaleLowerCase("ru");

		return packages.filter((item) => {
			const matchesQuery = !normalizedQuery || item.client.toLocaleLowerCase("ru").includes(normalizedQuery);
			const matchesState = stateFilter === "all" || item.state === stateFilter;

			return matchesQuery && matchesState;
		});
	}, [packages, query, stateFilter]);
	const availableHours = packages.reduce((total, item) => total + Math.max(item.remainingHours, 0), 0);
	const attentionClients = packages.filter((item) => item.remainingHours <= 5).length;
	const purchasedHours = packages.reduce((total, item) => total + (item.purchases ?? []).reduce((sum, purchase) => sum + purchase.hours, 0), 0);

	const closeModal = () => {
		setModalMode(null);
		setModalClientId(null);
		setEditingPurchase(null);
	};

	const openModal = (mode: HoursPackageModalMode, clientId: number | null, purchase: PackagePurchase | null = null) => {
		setModalMode(mode);
		setModalClientId(clientId);
		setEditingPurchase(purchase);
	};

	const savePurchase = async ({ projectId, date, hours, amount, comment }: { projectId: number; date: string; hours: number; amount?: number; comment?: string }) => {
		try {
			if (modalMode === "edit" && editingPurchase) await updateSupportHoursPackage(editingPurchase.id, { purchasedHours: hours, purchaseDate: date, amount, comment });
			else await createSupportHoursPackage({ projectId, purchasedHours: hours, purchaseDate: date, amount, comment });
			await loadPackages();
			setExpandedClientId(projectId);
			notify({ message: modalMode === "edit" ? "Пакет обновлён" : "Покупка часов добавлена", type: "success" });
			closeModal();
		} catch {
			notify({ message: "Не удалось сохранить пакет", type: "error" });
		}
	};

	const deletePurchase = async () => {
		if (!editingPurchase) return;
		try {
			await deleteSupportHoursPackage(editingPurchase.id);
			await loadPackages();
			notify({ message: "Пакет удалён", type: "success" });
			closeModal();
		} catch {
			notify({ message: "Не удалось удалить пакет", type: "error" });
		}
	};

	return (
		<section className={styles.page}>
			<header className={styles.header}>
				<div>
					<span className={styles.eyebrow}>Техподдержка</span>
					<h1>Отчёт по техподдержке</h1>
					<p>Покупки, списания и остатки по всем проектам в одном месте</p>
				</div>
				<button className={styles.addHoursButton} type="button" onClick={() => openModal("purchase", null)}>
					<FaPlus aria-hidden="true" /> Добавить покупку часов
				</button>
			</header>

			<div className={styles.filters}>
				<label className={styles.searchField}>
					<FaSearch aria-hidden="true" />
					<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Клиент или проект" />
				</label>
				<label className={styles.stateField}>
					<FaSlidersH aria-hidden="true" />
					<select value={stateFilter} onChange={(event) => setStateFilter(event.target.value as PackageState | "all")}>
						<option value="all">Все состояния</option>
						{Object.entries(STATE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
					</select>
				</label>
			</div>

			<div className={styles.metrics}>
				<div><span>Доступно клиентам сейчас</span><strong className={styles.metricAccent}>{formatHours(availableHours)}</strong><small>По активным пакетам</small></div>
				<div><span>Требуют внимания</span><strong className={styles.metricWarning}>{attentionClients} {attentionClients === 1 ? "клиент" : "клиента"}</strong><small>Мало часов, закончились или перерасход</small></div>
				<div><span>Куплено в пакетах</span><strong>{formatHours(purchasedHours)}</strong><small>Всего по истории покупок</small></div>
			</div>

			<div className={styles.notice}>
				<span>Сначала показываются клиенты с критическим остатком</span>
				<span>Списание идёт из самого раннего незакрытого пакета</span>
			</div>

			<div className={styles.listHeader}><span>Клиент / проект</span><span>Осталось</span><span>Состояние</span></div>
			<div className={styles.packagesList}>
				{visiblePackages.map((item) => {
					const isExpanded = item.id === expandedClientId;

					return (
						<div className={styles.packageGroup} key={item.id}>
							<button className={styles.packageRow} type="button" onClick={() => setExpandedClientId(isExpanded ? null : item.id)}>
								{isExpanded ? <FaChevronDown aria-hidden="true" /> : <FaChevronRight aria-hidden="true" />}
								<span className={styles.clientInfo}><strong>{item.client}</strong><small>Последнее списание · {item.lastCharge}</small></span>
								<strong className={`${styles.remainingHours} ${styles[item.state]}`}>{formatHours(item.remainingHours)}</strong>
								<span className={styles.statusInfo}><strong>{item.status} <small>{item.statusHint}</small></strong><i><b className={styles[item.state]} style={{ width: `${item.progress}%` }} /></i></span>
							</button>
							{isExpanded && item.purchases ? (
								<div className={styles.purchaseHistory}>
									<div className={styles.purchaseHistoryTitle}><span>История покупок</span><button type="button" onClick={() => openModal("new-package", item.id)}><FaPlus aria-hidden="true" /> Новый пакет</button></div>
									{item.purchases.map((purchase) => (
									<div className={styles.purchaseItem} key={purchase.id}>
										<div><strong>Пакет от {formatPackageDate(purchase.date)}</strong><small>{purchase.state}</small></div>
											<div><span>Куплено</span><strong>{purchase.hours} ч</strong></div>
											<div><span>Остаток</span><strong>{formatHours(purchase.remaining)}</strong></div>
										<button type="button" onClick={() => openModal("edit", item.id, purchase)} aria-label={`Изменить пакет от ${formatPackageDate(purchase.date)}`}><FaPen aria-hidden="true" /></button>
										</div>
									))}
								</div>
							) : null}
						</div>
					);
				})}
			</div>
			<footer className={styles.footer}><span>Показано {visiblePackages.length} клиентов</span><strong>{formatHours(availableHours)} доступно</strong></footer>
			<ClientHoursPackageModal projects={projects} projectId={modalClientId} isOpen={modalMode !== null} mode={modalMode ?? "purchase"} onClose={closeModal} onDelete={deletePurchase} onSubmit={savePurchase} purchase={editingPurchase} />
		</section>
	);
};
