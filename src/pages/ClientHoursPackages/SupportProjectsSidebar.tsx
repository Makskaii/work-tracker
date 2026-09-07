import { useMemo, useState } from "react";
import { FiChevronDown, FiChevronRight, FiFileText, FiFolder, FiSearch } from "react-icons/fi";
import styles from "./ClientHoursPackagesPage.module.scss";
import type {
	ClientPackage,
	PackagePurchase,
	SupportProjectOption,
} from "./clientHoursPackages.types";

type SupportProjectsSidebarProps = {
	projects: SupportProjectOption[];
	packages: ClientPackage[];
	query: string;
	selectedProjectId: number | null;
	selectedPurchaseId: number | null;
	onQueryChange: (value: string) => void;
	onSelectPurchase: (projectId: number, purchaseId: number | null) => void;
};

const formatHours = (value: number) =>
	`${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(value)} ч`;

const getPurchaseStatus = (purchase: PackagePurchase) => {
	if (purchase.remaining < 0) return { label: "Перерасход", state: "overdue" };
	if (purchase.remaining === 0) return { label: "Часы закончились", state: "empty" };
	if (purchase.remaining / purchase.hours <= 0.1)
		return { label: "Заканчиваются", state: "ending" };
	return { label: "Активный", state: "active" };
};

export const SupportProjectsSidebar = ({
	projects,
	packages,
	query,
	selectedProjectId,
	selectedPurchaseId,
	onQueryChange,
	onSelectPurchase,
}: SupportProjectsSidebarProps) => {
	const [showActiveOnly, setShowActiveOnly] = useState(false);
	const [expandedProjectIds, setExpandedProjectIds] = useState<Set<number>>(
		new Set(),
	);
	const packagesByProjectId = new Map(packages.map((item) => [item.id, item]));
	const normalizedQuery = query.trim().toLocaleLowerCase("ru");
	const activeProjectIds = useMemo(
		() =>
			new Set(
				packages
					.filter((item) => item.state === "active" || item.state === "ending")
					.map((item) => item.id),
			),
		[packages],
	);
	const visibleProjects = projects.filter((project) => {
		const matchesQuery =
			!normalizedQuery ||
			project.title.toLocaleLowerCase("ru").includes(normalizedQuery);
		return matchesQuery && (!showActiveOnly || activeProjectIds.has(project.id));
	});
	const toggleProject = (projectId: number) => {
		setExpandedProjectIds((current) => {
			const next = new Set(current);
			if (next.has(projectId)) next.delete(projectId);
			else next.add(projectId);
			return next;
		});
	};

	return (
		<aside className={styles.projectsSidebar}>
			<div className={styles.sidebarHeading}>
				<span>Техпод проекты</span>
				<b>{projects.length}</b>
			</div>
			<label className={styles.sidebarSearch}>
				<FiSearch aria-hidden="true" />
				<input
					value={query}
					onChange={(event) => onQueryChange(event.target.value)}
					placeholder="Поиск по проектам"
				/>
			</label>
			<div className={styles.sidebarFilters}>
				<button
					className={!showActiveOnly ? styles.sidebarFilterActive : ""}
					type="button"
					onClick={() => setShowActiveOnly(false)}
				>
					Все <b>{projects.length}</b>
				</button>
				<button
					className={showActiveOnly ? styles.sidebarFilterActive : ""}
					type="button"
					onClick={() => setShowActiveOnly(true)}
				>
					Активные <b>{activeProjectIds.size}</b>
				</button>
			</div>
			<div className={styles.sidebarList}>
				{visibleProjects.map((project) => {
					const projectPackages = packagesByProjectId.get(project.id);
					const isSelected = selectedProjectId === project.id;
					const isExpanded = expandedProjectIds.has(project.id);

					return (
						<div
							className={`${styles.sidebarProjectGroup} ${isSelected ? styles.sidebarProjectGroupSelected : ""}`}
							key={project.id}
						>
							<div className={styles.sidebarProject}>
								<button
									className={styles.sidebarProjectToggle}
									type="button"
									onClick={() => toggleProject(project.id)}
									aria-label={isExpanded ? "Скрыть пакеты" : "Показать пакеты"}
								>
									{isExpanded ? <FiChevronDown aria-hidden="true" /> : <FiChevronRight aria-hidden="true" />}
								</button>
								<button
									className={styles.sidebarProjectMain}
									type="button"
									onClick={() => onSelectPurchase(project.id, null)}
								>
									<FiFolder aria-hidden="true" />
									<span>
										<strong>{project.title}</strong>
										<small>{projectPackages ? projectPackages.status : "Пакеты не добавлены"}</small>
									</span>
									{projectPackages ? <b className={styles[projectPackages.state]}>{formatHours(projectPackages.remainingHours)}</b> : null}
								</button>
							</div>
							{isExpanded && projectPackages?.purchases.length ? (
								<div className={styles.sidebarPurchaseList}>
									{projectPackages.purchases.map((purchase) => {
										const status = getPurchaseStatus(purchase);
										return (
											<button
												className={`${styles.sidebarPurchase} ${selectedPurchaseId === purchase.id ? styles.sidebarPurchaseSelected : ""}`}
												key={purchase.id}
												type="button"
												onClick={() => onSelectPurchase(project.id, purchase.id)}
											>
												<FiFileText aria-hidden="true" />
												<span>Пакет от {new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(purchase.date))}</span>
												<small className={styles[status.state]}>{status.label}</small>
											</button>
										);
									})}
								</div>
							) : null}
						</div>
					);
				})}
				{visibleProjects.length === 0 ? (
					<p className={styles.sidebarEmpty}>Проекты не найдены</p>
				) : null}
			</div>
		</aside>
	);
};
