import { useMemo, useState } from "react";
import {
	FaChevronDown,
	FaChevronRight,
	FaPen,
	FaPlus,
	FaSearch,
	FaSlidersH,
} from "react-icons/fa";
import styles from "./ClientHoursPackagesPage.module.scss";

type PackageState = "overdue" | "empty" | "ending" | "active";

type ClientPackage = {
	id: number;
	client: string;
	lastCharge: string;
	remainingHours: number;
	state: PackageState;
	status: string;
	statusHint: string;
	progress: number;
	purchases?: Array<{
		date: string;
		hours: number;
		remaining: number;
		state: string;
	}>;
};

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
			{ date: "20.08.2026", hours: 30, remaining: 3.5, state: "Активный" },
			{ date: "12.03.2026", hours: 20, remaining: 0, state: "Закончился 02.06" },
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

export const ClientHoursPackagesPage = () => {
	const [query, setQuery] = useState("");
	const [stateFilter, setStateFilter] = useState<PackageState | "all">("all");
	const [expandedClientId, setExpandedClientId] = useState<number | null>(3);

	const visiblePackages = useMemo(() => {
		const normalizedQuery = query.trim().toLocaleLowerCase("ru");

		return CLIENT_PACKAGES.filter((item) => {
			const matchesQuery = !normalizedQuery || item.client.toLocaleLowerCase("ru").includes(normalizedQuery);
			const matchesState = stateFilter === "all" || item.state === stateFilter;

			return matchesQuery && matchesState;
		});
	}, [query, stateFilter]);

	return (
		<section className={styles.page}>
			<header className={styles.header}>
				<div>
					<span className={styles.eyebrow}>Техподдержка</span>
					<h1>Пакеты часов клиентов</h1>
					<p>Покупки, списания и остатки по всем проектам в одном месте</p>
				</div>
				<button className={styles.addHoursButton} type="button">
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
				<div><span>Доступно клиентам сейчас</span><strong className={styles.metricAccent}>61,5 ч</strong><small>По активным пакетам</small></div>
				<div><span>Требуют внимания</span><strong className={styles.metricWarning}>3 клиента</strong><small>Мало часов, закончились или перерасход</small></div>
				<div><span>Куплено в сентябре</span><strong>50 ч</strong><small>2 новые покупки</small></div>
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
									<div className={styles.purchaseHistoryTitle}><span>История покупок</span><button type="button"><FaPlus aria-hidden="true" /> Новый пакет</button></div>
									{item.purchases.map((purchase) => (
										<div className={styles.purchaseItem} key={purchase.date}>
											<div><strong>Пакет от {purchase.date}</strong><small>{purchase.state}</small></div>
											<div><span>Куплено</span><strong>{purchase.hours} ч</strong></div>
											<div><span>Остаток</span><strong>{formatHours(purchase.remaining)}</strong></div>
											<button type="button" aria-label={`Изменить пакет от ${purchase.date}`}><FaPen aria-hidden="true" /></button>
										</div>
									))}
								</div>
							) : null}
						</div>
					);
				})}
			</div>
			<footer className={styles.footer}><span>Показано {visiblePackages.length} клиентов</span><strong>61,5 ч доступно</strong></footer>
		</section>
	);
};
