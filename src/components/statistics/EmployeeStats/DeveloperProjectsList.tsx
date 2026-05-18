import { useState } from "react";
import type { ProjectFromList } from "@/pages/ReportsPage/ReportsPage";
import type { TGroupedTasks } from "@/pages/ReportsPage/ui/ProgressReports/types";
import { EntityTypeIds } from "@/shared/constants/const";
import { useBitrixSlider } from "@/shared/hooks/useBitrixSlider";
import type { TaskProps } from "@/shared/types/types";
import cls from "./DeveloperProjectsList.module.scss";

type DeveloperProjectsAccordionProps = {
	tasks: TaskProps[];
	grouped: TGroupedTasks;
	projects: ProjectFromList[];
};
export const DeveloperProjectsAccordion = ({
	tasks,
	grouped,
	projects,
}: DeveloperProjectsAccordionProps) => {
	const [openProjectId, setOpenProjectId] = useState<string | null>(null);
	console.log({ projects });
	const { openTask } = useBitrixSlider();

	if (tasks.length === 0) {
		return null;
	}

	const handleToggle = (projectId: string) => {
		setOpenProjectId((prev) => (prev === projectId ? null : projectId));
	};

	return (
		<div className={cls.accordion}>
			<div className={cls.title}>Список проектов</div>

			<div className={cls.projectsList}>
				{Object.entries(grouped).map(([projectId, projectTasks]) => {
					const isOpen = openProjectId === projectId;

					const projectName =
						projects.find((project) => String(project.id) === String(projectId))
							?.name ?? "Без проекта";

					return (
						<div key={projectId} className={cls.projectItem}>
							<button
								type="button"
								onClick={() => handleToggle(projectId)}
								className={cls.projectButton}
							>
								<div className={cls.projectInfo}>
									<div className={cls.projectName}>{projectName}</div>

									<div className={cls.projectCounter}>
										Задач: {projectTasks?.length}
									</div>
								</div>

								<div
									className={`${cls.projectToggle} ${
										isOpen ? cls.projectToggleOpen : ""
									}`}
								>
									⌄
								</div>
							</button>

							<div
								className={`${cls.projectPanel} ${
									isOpen ? cls.projectPanelOpen : ""
								}`}
							>
								<div className={cls.projectTasks}>
									{projectTasks?.map((task) => (
										<div
											onClick={() => openTask(task.id, EntityTypeIds.tasks)}
											key={task.id}
											className={cls.projectTask}
										>
											{task.title}
										</div>
									))}
								</div>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
};
