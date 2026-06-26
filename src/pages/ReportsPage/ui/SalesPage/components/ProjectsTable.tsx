import type { User } from "@/shared/types/types";
import { DEFAULT_MARGIN_PERCENT } from "../model/constants";
import {
	formatHours,
	getLossHours,
	getProjectFactHours,
	getProjectPlanHours,
	getProjectStatus,
	getUserName,
} from "../model/profitabilityUtils";
import type { ProfitabilityProject } from "../model/types";
import styles from "../SalesProfitabilityReport.module.scss";

type ProjectsTableProps = {
	onProjectSelect?: (projectId: string) => void;
	projects: ProfitabilityProject[];
	purchasedHours: number;
	selectedProjectId?: string | null;
	users: User[];
};

export const ProjectsTable = ({
	onProjectSelect,
	projects,
	purchasedHours,
	selectedProjectId,
	users,
}: ProjectsTableProps) => (
	<div className={styles.tableCard}>
		<div className={styles.tableTitle}>Проекты компании</div>
		<div className={styles.projectTable}>
			<div className={styles.tableHead}>
				<span>Проект</span>
				<span>Ответственный</span>
				<span>Куплено</span>
				<span>План</span>
				<span>Факт</span>
				<span>Потери</span>
				<span>Маржа</span>
				<span>Статус</span>
			</div>
			{projects.length ? (
				projects.map((project) => {
					const projectId = project.projectId;
					const isSelected = selectedProjectId === projectId;
					const planHours = getProjectPlanHours(project.tasks);
					const factHours = getProjectFactHours(project.reports);
					const losses = getLossHours(project);
					const status = getProjectStatus(project);
					const isProjectOk = factHours <= planHours;

					return (
						<div key={projectId} className={styles.projectGroup}>
							<button
								type="button"
								className={`${styles.projectRow} ${
									isSelected ? styles.projectRowOpen : ""
								}`}
								onClick={() => onProjectSelect?.(projectId)}
							>
								<strong>
									{project.title}
									<small>Всего: {project.tasks.length} задач</small>
								</strong>
								<span>{getUserName(users, project.assignedById)}</span>
								<span className={styles.mutedValue}>
									{formatHours(purchasedHours)}
								</span>
								<span>{formatHours(planHours)}</span>
								<span>{formatHours(factHours)}</span>
								<span>
									<em>
										сверх {formatHours(Math.max(factHours - planHours, 0))}
									</em>
									<em className={styles.warningPill}>
										{formatHours(losses.company + losses.unpaid)} unpaid/company
									</em>
								</span>
								<span className={styles.marginPill}>
									Маржа {DEFAULT_MARGIN_PERCENT}%
								</span>
								<span
									className={isProjectOk ? styles.successPill : styles.dangerPill}
								>
									{status}
								</span>
							</button>
						</div>
					);
				})
			) : (
				<div className={styles.emptyState}>Проекты компании не найдены</div>
			)}
		</div>
	</div>
);
