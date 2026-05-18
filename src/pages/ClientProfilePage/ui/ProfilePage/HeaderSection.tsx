import { FiPlus } from "react-icons/fi";
import { classNames } from "@/shared/utils/utils";
import styles from "./ClientProfile.module.scss";

export type TaskStatusFilter =
	| "approval"
	| "newProposal"
	| "inWork"
	| "backlog"
	| "done"
	| "all";

const TASK_STATUS_FILTERS: Array<{
	label: string;
	value: TaskStatusFilter;
}> = [
	{ label: "Новые заявки", value: "newProposal" },
	{ label: "На подтверждение", value: "approval" },
	{ label: "В работе", value: "inWork" },
	{ label: "Завершенные", value: "done" },
	{ label: "Все задачи", value: "all" },
];

type HeaderSectionProps = {
	viewMode: "list" | "projects";
	setViewMode: (mode: "list" | "projects") => void;
	taskStatusFilter: TaskStatusFilter;
	setTaskStatusFilter: (filter: TaskStatusFilter) => void;
	onCreateTask: () => void;
	tasksCount: number;
	companyId: string;
	start: string;
	end: string;
};

export const HeaderSection = ({
	viewMode,
	setViewMode,
	taskStatusFilter,
	setTaskStatusFilter,
	onCreateTask,
	tasksCount,
}: HeaderSectionProps) => {
	return (
		<div className={styles.sectionHeader}>
			<div className={styles.tasksHeaderTop}>
				<div className={styles.tasksHeaderTitleGroup}>
					<h2 className={styles.sectionTitle}>Все задачи</h2>
					<div className={styles.badge}>Задач: {tasksCount}</div>
				</div>

				<button
					type="button"
					className={styles.addTaskButton}
					onClick={onCreateTask}
				>
					<FiPlus className={styles.addTaskIcon} aria-hidden="true" />
					Создать задачу
				</button>
			</div>

			<div className={styles.tasksToolbar}>
				<div className={styles.viewModeSwitcher}>
					{TASK_STATUS_FILTERS.map((filter) => (
						<button
							key={filter.value}
							type="button"
							className={classNames(styles.viewModeButton, {
								[styles.viewModeButtonActive]:
									taskStatusFilter === filter.value,
							})}
							onClick={() => setTaskStatusFilter(filter.value)}
						>
							{filter.label}
						</button>
					))}
				</div>

				<div className={styles.toolbar}>
					<div className={styles.viewModeSwitcher}>
						<button
							type="button"
							className={classNames(styles.viewModeButton, {
								[styles.viewModeButtonActive]: viewMode === "list",
							})}
							onClick={() => setViewMode("list")}
						>
							Режим список
						</button>

						<button
							type="button"
							className={classNames(styles.viewModeButton, {
								[styles.viewModeButtonActive]: viewMode === "projects",
							})}
							onClick={() => setViewMode("projects")}
						>
							По проектам
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};
