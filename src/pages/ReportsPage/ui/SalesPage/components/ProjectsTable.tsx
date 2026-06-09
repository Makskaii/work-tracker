import type { User } from "@/shared/types/types";
import { MOCK_MARGIN_PERCENT } from "../model/constants";
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
		<div className={styles.tableTitle}>Проекты внутри сделки</div>
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
								<span className={styles.mockPill}>
									mock {MOCK_MARGIN_PERCENT}%
								</span>
								<span
									className={
										status === "В норме" ? styles.successPill : styles.dangerPill
									}
								>
									{status}
								</span>
							</button>
						</div>
					);
				})
			) : (
				<div className={styles.emptyState}>
					Проект не найден по PARENT_ID_1092 этой сделки
				</div>
			)}
		</div>
	</div>
);
