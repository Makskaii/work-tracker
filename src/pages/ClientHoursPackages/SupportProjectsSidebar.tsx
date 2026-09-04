import { FaFolderOpen, FaSearch } from "react-icons/fa";
import styles from "./ClientHoursPackagesPage.module.scss";
import type {
	ClientPackage,
	SupportProjectOption,
} from "./clientHoursPackages.types";

type SupportProjectsSidebarProps = {
	projects: SupportProjectOption[];
	packages: ClientPackage[];
	query: string;
	selectedProjectId: number | null;
	onQueryChange: (value: string) => void;
	onSelect: (projectId: number) => void;
};

const formatHours = (value: number) =>
	`${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(value)} ч`;

export const SupportProjectsSidebar = ({
	projects,
	packages,
	query,
	selectedProjectId,
	onQueryChange,
	onSelect,
}: SupportProjectsSidebarProps) => {
	const packagesByProjectId = new Map(packages.map((item) => [item.id, item]));
	const normalizedQuery = query.trim().toLocaleLowerCase("ru");
	const visibleProjects = projects.filter(
		(project) =>
			!normalizedQuery ||
			project.title.toLocaleLowerCase("ru").includes(normalizedQuery),
	);

	return (
		<aside className={styles.projectsSidebar}>
			<div className={styles.sidebarHeading}>
				<span>Техпод проекты</span>
				<b>{projects.length}</b>
			</div>
			<label className={styles.sidebarSearch}>
				<FaSearch aria-hidden="true" />
				<input
					value={query}
					onChange={(event) => onQueryChange(event.target.value)}
					placeholder="Поиск по проектам"
				/>
			</label>
			<div className={styles.sidebarList}>
				{visibleProjects.map((project) => {
					const projectPackages = packagesByProjectId.get(project.id);
					const isSelected = selectedProjectId === project.id;

					return (
						<button
							className={`${styles.sidebarProject} ${isSelected ? styles.sidebarProjectSelected : ""}`}
							key={project.id}
							type="button"
							onClick={() => onSelect(project.id)}
						>
							<FaFolderOpen aria-hidden="true" />
							<span>
								<strong>{project.title}</strong>
								<small>
									{projectPackages
										? projectPackages.status
										: "Пакеты не добавлены"}
								</small>
							</span>
							{projectPackages ? (
								<b className={styles[projectPackages.state]}>
									{formatHours(projectPackages.remainingHours)}
								</b>
							) : null}
						</button>
					);
				})}
				{visibleProjects.length === 0 ? (
					<p className={styles.sidebarEmpty}>Проекты не найдены</p>
				) : null}
			</div>
		</aside>
	);
};
