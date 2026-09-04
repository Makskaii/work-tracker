import { useMemo, useState } from "react";
import {
	FaChevronDown,
	FaChevronRight,
	FaPen,
	FaPlus,
	FaSearch,
	FaSlidersH,
} from "react-icons/fa";
import { notify } from "@/shared/ui/NotificationPopup/notify";
import { ClientHoursPackageModal, type HoursPackageModalMode } from "./ClientHoursPackageModal";
import type { ClientPackage, PackagePurchase, PackageState } from "./clientHoursPackages.types";
import styles from "./ClientHoursPackagesPage.module.scss";

const CLIENT_PACKAGES: ClientPackage[] = [
	{ id: 1, client: "Б24 | Аэросистемы", lastCharge: "29.08", remainingHours: -1.5, state: "overdue", status: "Перерасход", statusHint: "Работы сверх пакета", progress: 100 },
	{ id: 2, client: "Б24 | Скиф", lastCharge: "17.08", remainingHours: 0, state: "empty", status: "Часы закончились", statusHint: "Нужна покупка", progress: 100 },
	{
		id: 3,
		client: "Б24 | Вентаж",
		lastCharge: "31.08",
		remainingHours: 3.5,
		state: "ending",
		status: "Заканчиваются",
		statusHint: "≈ 6 дней",
		progress: 82,
		purchases: [
			{ id: 1, date: "2026-08-20", hours: 30, remaining: 3.5, state: "Активный" },
			{ id: 2, date: "2026-03-12", hours: 20, remaining: 0, state: "Закончился 02.06" },
		],
	},
	{ id: 4, client: "Б24 | Мастер сервис", lastCharge: "сегодня", remainingHours: 11.5, state: "active", status: "Активный пакет", statusHint: "≈ до декабря", progress: 73 },
	{ id: 5, client: "Б24 | ИП Балуев", lastCharge: "28.08", remainingHours: 13.5, state: "active", status: "Активный пакет", statusHint: "≈ до января", progress: 39 },
	{ id: 6, client: "Б24 | РК 1с (крепежники)", lastCharge: "27.08", remainingHours: 33, state: "active", status: "Активный пакет", statusHint: "≈ до февраля", progress: 21 },
];

const formatHours = (value: number) =>
	`${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(value)} ч`;

const STATE_LABELS: Record<PackageState, string> = {
	active: "Активный пакет",
	ending: "Заканчиваются",
	empty: "Часы закончились",
	overdue: "Перерасход",
};

const getPackageState = (remainingHours: number): Omit<ClientPackage, "id" | "client" | "lastCharge" | "remainingHours" | "purchases"> => {
	if (remainingHours < 0) return { progress: 100, state: "overdue", status: "Перерасход", statusHint: "Работы сверх пакета" };
	if (remainingHours === 0) return { progress: 100, state: "empty", status: "Часы закончились", statusHint: "Нужна покупка" };
	if (remainingHours <= 5) return { progress: 82, state: "ending", status: "Заканчиваются", statusHint: "≈ 6 дней" };

	return { progress: Math.max(18, Math.min(74, Math.round(200 / remainingHours))), state: "active", status: "Активный пакет", statusHint: "≈ до следующего этапа" };
};

const formatPackageDate = (value: string) => new Intl.DateTimeFormat("ru-RU").format(new Date(`${value}T00:00:00`));

export const ClientHoursPackagesPage = () => {
	const [packages, setPackages] = useState(CLIENT_PACKAGES);
	const [query, setQuery] = useState("");
	const [stateFilter, setStateFilter] = useState<PackageState | "all">("all");
	const [expandedClientId, setExpandedClientId] = useState<number | null>(3);
	const [modalMode, setModalMode] = useState<HoursPackageModalMode | null>(null);
	const [modalClientId, setModalClientId] = useState<number | null>(null);
	const [editingPurchase, setEditingPurchase] = useState<PackagePurchase | null>(null);

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

	const savePurchase = ({ clientId, date, hours }: { clientId: number; date: string; hours: number }) => {
		setPackages((current) => current.map((client) => {
			if (client.id !== clientId) return client;

			const previousHours = modalMode === "edit" ? editingPurchase?.hours ?? 0 : 0;
			const nextRemainingHours = client.remainingHours + hours - previousHours;
			const nextPurchase: PackagePurchase = modalMode === "edit" && editingPurchase
				? { ...editingPurchase, date, hours, remaining: nextRemainingHours, state: "Активный" }
				: { id: Date.now(), date, hours, remaining: nextRemainingHours, state: "Активный" };
			const purchases = modalMode === "edit" && editingPurchase
				? (client.purchases ?? []).map((purchase) => purchase.id === editingPurchase.id ? nextPurchase : purchase)
				: [nextPurchase, ...(client.purchases ?? [])];

			return { ...client, ...getPackageState(nextRemainingHours), lastCharge: "сегодня", purchases, remainingHours: nextRemainingHours };
		}));
		setExpandedClientId(clientId);
		notify({
			message: modalMode === "edit" ? "Пакет обновлён" : "Покупка часов добавлена",
			type: "success",
		});
		closeModal();
	};

	return (
		<section className={styles.page}>
			<header className={styles.header}>
				<div>
					<span className={styles.eyebrow}>Техподдержка</span>
					<h1>Пакеты часов клиентов</h1>
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
			<ClientHoursPackageModal clients={packages} clientId={modalClientId} isOpen={modalMode !== null} mode={modalMode ?? "purchase"} onClose={closeModal} onSubmit={savePurchase} purchase={editingPurchase} />
		</section>
	);
};
